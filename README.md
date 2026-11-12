# Gallery 54 | Safari Rally

A fast, static photo site for GitHub Pages. No framework, no build server: plain HTML, CSS and a small script. Photos are served as WebP in three sizes, lazy loaded, in justified rows that fit any screen.

**The photos in this draft are generated sample frames** (each is marked "Sample frame"). Captions, stage names and the email address are placeholders too. Replace them before publishing.

## What is in the folder

| Path | What it is |
| --- | --- |
| `index.html`, `css/styles.css`, `js/main.js` | The site |
| `site.json` | Headline, intro text, about text, email, and the blurb for each year |
| `data/gallery.js` | Photo list. Written by the build script, do not edit by hand |
| `photos/<year>/` | Web-sized images. Written by the build script |
| `originals/<year>/` | Your full-size photos. Stays on your computer (git ignores it) |
| `tools/build_gallery.py` | Resizes originals and writes `data/gallery.js` |
| `tools/make_demo.py` | Makes the sample frames. Delete along with `originals/` and `photos/` when done |

## Add real photos

1. Delete the sample content: remove `originals/` and everything inside `photos/`.
2. Put each rally's photos in `originals/2024/`, `originals/2025/`, `originals/2026/`.
3. Optional: add `originals/<year>/captions.csv` to name the photos:

   ```
   file,title,stage,tags,cover
   IMG_0412.jpg,Dust on the long straight,Stage 3,Action,yes
   IMG_0530.jpg,Fans on the bank,Stage 5,Crowd;Landscape,
   ```

   Tags become the filter buttons. Put `yes` in `cover` on one row to choose the hero image for that year. Without it, the first landscape photo is used.
4. Install Pillow once, then build:

   ```
   pip install Pillow
   python tools/build_gallery.py
   ```

5. Commit `photos/`, `data/gallery.js` and any edits, then push.

## Add next year's rally

1. Create `originals/2027/` and add the photos.
2. Add a line for 2027 in `site.json` under `years` with a short blurb.
3. Run `python tools/build_gallery.py`, commit and push.

The new year appears first on the page and in the header, and becomes the hero's top year. Nothing else needs changing. Re-running the script only processes new or changed photos.

## Publish on GitHub Pages

1. Create a repository and push this folder to it.
2. In the repository, open Settings, then Pages. Under Build and deployment choose Deploy from a branch, pick `main` and `/ (root)`, and save.
3. The site appears at `https://<your-account>.github.io/<repository>/`. Use `.nojekyll` as it is (it is already in the folder).

Keep the full-size originals out of the repository. GitHub recommends repositories under 1 GB, and the web-sized copies are about 1 MB for 28 photos.

## Things to set before going live

- `site.json`: replace `hello@gallery54.example` with your real address.
- `index.html`: the page title, description and social tags near the top.
- Fonts load from Google Fonts (Archivo and Newsreader). To avoid that third-party request, download them and host them in a `fonts/` folder.
- Optional: a custom domain through Settings, then Pages.

## Motion

The page opens with a staged intro (photo wipe, year numerals rising, menu dropping in), the hero photo drifts slowly and moves slower than the page as you scroll, and photos wipe in as they come into view. All of it is plain CSS in the "Motion" block at the bottom of `css/styles.css`, with timings written as numbers you can change. Visitors who have "reduce motion" switched on in their device settings get the same page with no animation.

## Dark mode and the menu

The page follows the visitor's device setting for light or dark. The sun/moon button in the menu overrides it, and the choice is remembered in that visitor's browser. The menu slides away while scrolling down and returns on scroll up, at the top of the page, and while a keyboard user is tabbing through it.

## Step-by-step guide

See `GUIDE.md` for a plain walkthrough of editing the site and adding photos.

## Photo links

Opening a photo adds `#photo/<reference>` to the address, so a link to the page with that ending opens the photo directly. The same reference is pre-filled in the "Ask about this photo" email.
