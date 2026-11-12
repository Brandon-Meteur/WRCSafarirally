/* Gallery 54 | Safari Rally
   Reads window.GALLERY (data/gallery.js, written by tools/build_gallery.py)
   and builds the page. No dependencies. */
(function () {
  "use strict";

  var root = document.documentElement;
  var data = window.GALLERY;
  if (!data || !data.years || !data.years.length) { root.classList.add("is-ready"); return; }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var site = data.site || {};
  var years = data.years;               // newest first
  var byId = {};                        // photo id -> { year, p }
  var activeTag = "";                   // current filter ("" means all)

  /* ---------- helpers ---------- */

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "class") node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (kid) { node.appendChild(kid); });
    return node;
  }

  function path(year, p, w) { return "photos/" + year + "/" + p.n + "-" + w + ".webp"; }

  function srcset(year, p) {
    return p.f.map(function (w) { return path(year, p, w) + " " + w + "w"; }).join(", ");
  }

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  function alt(year, p) { return p.t || ("Safari Rally " + year); }

  function animate(node, frames, opts) {
    if (reduce || !node.animate) return;
    node.animate(frames, opts);
  }

  years.forEach(function (y) {
    y.photos.forEach(function (p) { byId[p.id] = { year: y.year, p: p }; });
  });

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- header and hero ---------- */

  var bar = $("top");
  var yearsNav = $("years-nav");
  years.forEach(function (y) {
    yearsNav.appendChild(el("a", { href: "#" + y.year, "data-year": y.year, text: y.year }));
  });
  var pill = el("span", { class: "bar__pill", "aria-hidden": "true" });
  yearsNav.appendChild(pill);

  var heroMedia = $("hero-media");
  var plate = el("div", { class: "hero__plate" });
  heroMedia.appendChild(plate);
  var heroYears = $("hero-years");
  var heroCta = $("hero-cta");
  var heroImgs = {};
  var heroBtns = {};
  var heroYear = "";

  $("hero-intro").textContent = site.intro || "";

  years.forEach(function (y, i) {
    var cover = byId[y.cover] ? byId[y.cover].p : y.photos[0];
    var img = el("img", {
      class: "hero__img", alt: "", sizes: "100vw", decoding: "async", "data-srcset": srcset(y.year, cover)
    });
    img.setAttribute("data-src", path(y.year, cover, cover.f[cover.f.length - 1]));
    if (i === 0) {
      img.setAttribute("fetchpriority", "high");
      img.srcset = img.getAttribute("data-srcset");
      img.src = img.getAttribute("data-src");
    }
    heroImgs[y.year] = img;
    plate.appendChild(img);

    var btn = el("button", { type: "button", class: "hero__year", "aria-pressed": "false" }, [el("span", { text: y.year })]);
    btn.style.setProperty("--i", i);
    btn.addEventListener("click", function () { selectHero(y.year); });
    btn.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") selectHero(y.year); });
    heroBtns[y.year] = btn;
    heroYears.appendChild(btn);
  });

  function loadHero(year) {
    var img = heroImgs[year];
    if (img && !img.getAttribute("src")) {
      img.srcset = img.getAttribute("data-srcset");
      img.src = img.getAttribute("data-src");
    }
  }

  function selectHero(year) {
    if (year === heroYear) return;
    var firstTime = heroYear === "";
    heroYear = year;
    loadHero(year);
    years.forEach(function (y) {
      var on = y.year === year;
      heroImgs[y.year].classList.toggle("is-active", on);
      heroBtns[y.year].setAttribute("aria-pressed", on ? "true" : "false");
    });
    var meta = years.filter(function (y) { return y.year === year; })[0];
    heroCta.textContent = "See all " + plural(meta.photos.length, "photo", "photos") + " from " + year;
    heroCta.setAttribute("href", "#" + year);
    if (!firstTime) {
      animate(heroCta, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 320, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
    }
  }
  selectHero(years[0].year);

  // Start the intro once the first cover is ready (or after a short wait).
  var hero = document.querySelector(".hero");
  var first = heroImgs[years[0].year];
  var revealed = false;
  function reveal() { if (!revealed) { revealed = true; root.classList.add("is-ready"); } }
  if (first.complete && first.naturalWidth) reveal();
  else { first.addEventListener("load", reveal); first.addEventListener("error", reveal); setTimeout(reveal, 1500); }

  // Fetch the other covers when the browser is idle so switching feels instant.
  window.addEventListener("load", function () {
    var idle = window.requestIdleCallback || function (fn) { setTimeout(fn, 600); };
    idle(function () { years.slice(1).forEach(function (y) { loadHero(y.year); }); });
  });

  // Menu: solid once the hero has scrolled away, hidden while scrolling down, back on scroll up.
  // The hero photo also moves slower than the page.
  var ticking = false;
  var lastY = window.scrollY || 0;
  var travelled = 0;                    // distance scrolled in the current direction
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = Math.max(0, window.scrollY || window.pageYOffset);
      var h = hero.offsetHeight;
      var barH = bar.offsetHeight;
      bar.classList.toggle("is-solid", y > h - barH - 8);
      if (!reduce && y < h) plate.style.transform = "translate3d(0," + (y * 0.22).toFixed(1) + "px,0)";

      var dy = y - lastY;
      lastY = y;
      if (dy !== 0) travelled = (Math.sign(dy) === Math.sign(travelled)) ? travelled + dy : dy;
      if (y <= barH) bar.classList.remove("is-hidden");               // always shown at the very top
      else if (travelled > 12) bar.classList.add("is-hidden");        // scrolling down
      else if (travelled < -8) bar.classList.remove("is-hidden");     // scrolling up
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // Jumping to a year or photo with a link (menu, buttons) should keep the menu out of the way
  // until the visitor scrolls up, so it does not cover the heading they just jumped to.

  /* ---------- light and dark ---------- */

  var themeBtn = $("theme-btn");
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function isDark() {
    var set = root.getAttribute("data-theme");
    if (set) return set === "dark";
    return !!(darkQuery && darkQuery.matches);
  }
  function paintThemeBtn() {
    var dark = isDark();
    themeBtn.setAttribute("data-mode", dark ? "dark" : "light");
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0A0D11" : "#12161C");
  }
  themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    if (!reduce) {
      root.classList.add("theme-fade");
      setTimeout(function () { root.classList.remove("theme-fade"); }, 500);
    }
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("g54-theme", next); } catch (e) { /* ignore */ }
    paintThemeBtn();
  });
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", paintThemeBtn);
  paintThemeBtn();

  /* ---------- sliding year marker in the menu ---------- */

  var pillShown = false;
  function movePill() {
    var cur = yearsNav.querySelector('a[aria-current="true"]');
    if (!cur || cur.hidden) { pill.style.opacity = "0"; pillShown = false; return; }
    function place() {
      pill.style.width = cur.offsetWidth + "px";
      pill.style.height = cur.offsetHeight + "px";
      pill.style.transform = "translate(" + cur.offsetLeft + "px," + cur.offsetTop + "px)";
    }
    if (!pillShown) {
      // first appearance: jump to position, then fade in, so it does not slide in from the corner
      pill.style.transition = "opacity 0.25s";
      place();
      void pill.offsetWidth;
      pill.style.opacity = "1";
      requestAnimationFrame(function () { pill.style.transition = ""; });
      pillShown = true;
    } else {
      place();
    }
  }
  function setCurrent(year) {
    Array.prototype.forEach.call(yearsNav.querySelectorAll("a"), function (a) {
      if (year && a.getAttribute("data-year") === year) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    movePill();
  }
  window.addEventListener("resize", movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);

  /* ---------- filters ---------- */

  var tagCounts = {};
  years.forEach(function (y) {
    y.photos.forEach(function (p) {
      p.g.forEach(function (t) { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });
  });
  var tags = Object.keys(tagCounts).sort();
  var filters = $("filters");
  var chips = [];

  function makeChip(label, tag, count) {
    var chip = el("button", { type: "button", class: "chip", "aria-pressed": tag === "" ? "true" : "false" },
      [document.createTextNode(label), el("span", { text: String(count) })]);
    chip.addEventListener("click", function () { applyFilter(tag); });
    chip.dataset.tag = tag;
    chips.push(chip);
    filters.appendChild(chip);
  }

  if (tags.length > 1) {
    makeChip("All photos", "", Object.keys(byId).length);
    tags.forEach(function (t) { makeChip(t, t, tagCounts[t]); });
  } else {
    filters.hidden = true;
  }

  /* ---------- scroll reveals ---------- */

  var hasIO = "IntersectionObserver" in window;

  // Photos wipe in left to right, staggered across a row.
  var tileIO = hasIO ? new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (e) { return e.isIntersecting; }).sort(function (a, b) {
      var A = a.boundingClientRect, B = b.boundingClientRect;
      return (Math.round(A.top / 20) - Math.round(B.top / 20)) || (A.left - B.left);
    });
    batch.forEach(function (e, i) {
      e.target.style.setProperty("--d", Math.min(i * 70, 560) + "ms");
      e.target.classList.add("is-in");
      tileIO.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }) : null;

  // Year numerals and the about section rise once, when they come into view.
  var blockIO = hasIO ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      blockIO.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }) : null;

  function watchBlock(node) { if (blockIO) blockIO.observe(node); else node.classList.add("is-in"); }

  /* ---------- rallies and photo rows ---------- */

  var rallies = $("rallies");
  var sections = {};

  years.forEach(function (y) {
    var count = el("p", { class: "rally__count" });
    var head = el("header", { class: "rally__head" }, [
      el("h2", { class: "rally__year", id: "h-" + y.year }, [el("span", { text: y.year })]),
      el("div", { class: "rally__meta" }, [
        y.blurb ? el("p", { class: "rally__blurb", text: y.blurb }) : document.createTextNode(""),
        count
      ])
    ]);

    var list = el("ul", { class: "grid" });
    y.photos.forEach(function (p) {
      var img = el("img", {
        src: path(y.year, p, p.f[0]), srcset: srcset(y.year, p),
        sizes: "(min-width: 1100px) 28vw, (min-width: 640px) 45vw, 90vw",
        width: p.w, height: p.h, alt: alt(y.year, p), loading: "lazy", decoding: "async"
      });
      var open = el("button", { type: "button", class: "tile__open", "aria-label": "Open photo: " + alt(y.year, p) }, [img]);
      if (p.t) open.appendChild(el("span", { class: "tile__cap", "aria-hidden": "true", text: p.t }));
      var li = el("li", { class: "tile" }, [open]);
      li.style.setProperty("--ar", (p.w / p.h).toFixed(4));
      li.style.setProperty("--c", p.c);
      li.dataset.id = p.id;
      open.addEventListener("click", function () { openPhoto(p.id); });
      list.appendChild(li);
    });

    var section = el("section", { class: "rally", id: y.year, "aria-labelledby": "h-" + y.year, "data-year": y.year }, [head, list]);
    sections[y.year] = { node: section, count: count, list: list };
    rallies.appendChild(section);
    watchBlock(head);
  });

  function applyFilter(tag) {
    activeTag = tag;
    chips.forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.tag === tag ? "true" : "false"); });
    var shown = 0;
    years.forEach(function (y) {
      var s = sections[y.year];
      var visible = 0;
      Array.prototype.forEach.call(s.list.children, function (li) {
        var p = byId[li.dataset.id].p;
        var on = !tag || p.g.indexOf(tag) !== -1;
        li.hidden = !on;
        // replay the wipe-in for whatever is now showing
        li.classList.remove("is-in");
        if (tileIO) tileIO.unobserve(li);
        if (on) {
          visible++;
          if (tileIO) tileIO.observe(li); else li.classList.add("is-in");
        }
      });
      shown += visible;
      s.node.hidden = visible === 0;
      var navLink = yearsNav.querySelector('a[data-year="' + y.year + '"]');
      if (navLink) navLink.hidden = visible === 0;
      var place = y.place ? " from " + y.place : "";
      s.count.textContent = tag
        ? visible + " of " + plural(y.photos.length, "photo", "photos") + " shown" + place
        : plural(y.photos.length, "photo", "photos") + place;
    });
    $("status").textContent = tag
      ? "Showing " + plural(shown, tag.toLowerCase() + " photo", tag.toLowerCase() + " photos")
      : "Showing all photos";
    movePill();
  }
  applyFilter("");

  /* ---------- header year marker follows the scroll ---------- */

  if (hasIO) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setCurrent(e.target.id); });
    }, { rootMargin: "-35% 0px -60% 0px" });
    years.forEach(function (y) { spy.observe(sections[y.year].node); });
    // clear the marker while the hero is still the main thing on screen
    var heroSpy = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) setCurrent("");
    }, { rootMargin: "0px 0px -50% 0px" });
    heroSpy.observe(hero);
  }

  /* ---------- about, footer ---------- */

  var aboutText = $("about-text");
  (site.about || []).forEach(function (t) { aboutText.appendChild(el("p", { text: t })); });
  if (site.email) {
    $("about-mail").setAttribute("href", "mailto:" + site.email + "?subject=" + encodeURIComponent("Prints, licensing or press enquiry"));
  }
  $("year").textContent = new Date().getFullYear();
  watchBlock(document.querySelector(".about__inner"));

  /* ---------- lightbox ---------- */

  var lb = $("lightbox");
  var lbImg = $("lb-img");
  var lbInfo = lb.querySelector(".lb__info");
  var current = -1;
  var order = [];                       // ids currently visible, in page order

  function visibleIds() {
    var ids = [];
    years.forEach(function (y) {
      Array.prototype.forEach.call(sections[y.year].list.children, function (li) {
        if (!li.hidden) ids.push(li.dataset.id);
      });
    });
    return ids;
  }

  function preload(id) {
    var rec = byId[id];
    if (!rec) return;
    var im = new Image();
    im.srcset = srcset(rec.year, rec.p);
    im.sizes = "100vw";
    im.src = path(rec.year, rec.p, rec.p.f[rec.p.f.length - 1]);
  }

  // dir is 1 for next, -1 for previous, 0 when the viewer first opens (CSS handles that)
  function show(index, dir) {
    if (!order.length) return;
    current = (index + order.length) % order.length;
    var rec = byId[order[current]];
    var p = rec.p;
    lbImg.removeAttribute("srcset");
    lbImg.sizes = "100vw";
    lbImg.srcset = srcset(rec.year, p);
    lbImg.src = path(rec.year, p, p.f[p.f.length - 1]);
    lbImg.alt = alt(rec.year, p);
    lbImg.width = p.w; lbImg.height = p.h;
    $("lb-title").textContent = p.t || ("Safari Rally " + rec.year);
    $("lb-sub").textContent = [("Safari Rally " + rec.year), p.s, "Reference " + p.id].filter(Boolean).join(", ");
    $("lb-count").textContent = (current + 1) + " of " + order.length;
    if (site.email) {
      $("lb-enquire").setAttribute("href", "mailto:" + site.email +
        "?subject=" + encodeURIComponent("Photo enquiry " + p.id) +
        "&body=" + encodeURIComponent("Hello Gallery 54,\n\nI would like to ask about photo " + p.id + " (" + (p.t || "untitled") + ", Safari Rally " + rec.year + ").\n"));
    }
    if (dir) {
      animate(lbImg, [{ opacity: 0, transform: "translateX(" + (dir * 48) + "px)" }, { opacity: 1, transform: "none" }],
        { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
      animate(lbInfo, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 380, delay: 80, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "backwards" });
    }
    try { history.replaceState(null, "", "#photo/" + p.id); } catch (e) { /* file:// previews may refuse */ }
    preload(order[(current + 1) % order.length]);
    preload(order[(current - 1 + order.length) % order.length]);
  }

  function openPhoto(id) {
    order = visibleIds();
    var i = order.indexOf(id);
    if (i === -1) { applyFilter(""); order = visibleIds(); i = order.indexOf(id); }
    if (i === -1) return;
    show(i, 0);
    if (!lb.open) lb.showModal();
  }

  lb.addEventListener("close", function () {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
  });
  $("lb-close").addEventListener("click", function () { lb.close(); });
  $("lb-prev").addEventListener("click", function () { show(current - 1, -1); });
  $("lb-next").addEventListener("click", function () { show(current + 1, 1); });
  $("lb-stage").addEventListener("click", function (e) { if (e.target === e.currentTarget) lb.close(); });
  lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });

  document.addEventListener("keydown", function (e) {
    if (!lb.open) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1, -1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); show(current + 1, 1); }
  });

  // Swipe between photos on touch screens.
  var startX = null;
  $("lb-stage").addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") startX = e.clientX; });
  $("lb-stage").addEventListener("pointerup", function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  $("lb-stage").addEventListener("pointercancel", function () { startX = null; });

  // Open a shared link such as index.html#photo/2025-frame-004.
  function openFromHash() {
    var m = /^#photo\/(.+)$/.exec(location.hash);
    if (m && byId[decodeURIComponent(m[1])]) openPhoto(decodeURIComponent(m[1]));
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();
