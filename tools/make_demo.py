#!/usr/bin/env python3
"""
Generate sample "photographs" so the design can be reviewed before the real
images arrive. Draws procedural savanna scenes (sky, ridges, acacia, dust
plume, rally car, crowd, service-park tents) into originals/<year>/ together
with a captions.csv. Delete originals/ and photos/ when you add real photos.

    pip install Pillow numpy
    python tools/make_demo.py
    python tools/build_gallery.py
"""

import csv
import math
import sys
from pathlib import Path

import numpy as np

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install Pillow numpy")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "originals"

LONG_SIDE = 2000

PALETTES = {
    # sky top, sky bottom, ground, ridge tint
    "2024": ((52, 66, 108), (244, 178, 108), (146, 100, 66), (96, 70, 78)),
    "2025": ((38, 46, 84), (176, 162, 192), (94, 86, 80), (62, 62, 92)),
    "2026": ((60, 126, 172), (230, 224, 198), (174, 148, 98), (84, 108, 118)),
}

ASPECTS = [(3, 2), (3, 2), (2, 3), (16, 9), (4, 3), (3, 2), (2, 3), (1, 1), (3, 2), (16, 9)]

KINDS = ["Action", "Landscape", "Action", "Crowd", "Action", "Service park",
         "Landscape", "Action", "Crowd", "Action"]

TITLES = {
    "Action": ["Dust plume on a long straight", "Flat out over the crest", "Cresting the ridge",
               "Through the gully", "Rooster tail on the corner exit", "Sliding into the left-hander",
               "Hard on the brakes", "Out of the dust"],
    "Landscape": ["Acacia at first light", "Stage road at dusk", "Heat haze over the plain",
                  "Storm light on the escarpment"],
    "Crowd": ["Spectators lining the ridge", "Fans waiting for the next car", "A view from the bank"],
    "Service park": ["Mechanics at work between stages", "Tyres stacked for the afternoon loop"],
}

COUNTS = {"2024": 9, "2025": 9, "2026": 10}


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def jitter(rng, col, amt=14):
    return tuple(int(max(0, min(255, c + rng.uniform(-amt, amt)))) for c in col)


def ridge_line(rng, w, base, amp, waves=4):
    xs = np.linspace(0, 1, w)
    y = np.full(w, base, dtype=float)
    for k in range(1, waves + 1):
        y += amp / k * np.sin(xs * rng.uniform(2, 7) * k * math.pi + rng.uniform(0, 6.28))
    return y


def scene(w, h, seed, year, kind):
    rng = np.random.default_rng(seed)
    top, bot, ground, tint = PALETTES[year]
    top, bot, ground, tint = (jitter(rng, c) for c in (top, bot, ground, tint))
    horizon = int(h * rng.uniform(0.52, 0.66))

    yy = np.linspace(0, 1, h)[:, None, None]
    sky = np.array(top)[None, None, :] * (1 - yy) + np.array(bot)[None, None, :] * yy
    arr = np.broadcast_to(sky, (h, w, 3)).copy()

    # sun glow
    sx, sy = rng.uniform(0.15, 0.85) * w, horizon - rng.uniform(0.04, 0.3) * h
    gy, gx = np.mgrid[0:h, 0:w]
    d = np.hypot(gx - sx, gy - sy) / (0.55 * w)
    glow = np.clip(1 - d, 0, 1) ** 2.4
    arr += glow[..., None] * np.array([255, 236, 190]) * 0.55
    disc = (np.hypot(gx - sx, gy - sy) < 0.022 * w)
    arr[disc] = (255, 244, 214)

    # ridges, far to near, fading toward haze
    haze = np.array(bot)
    for i, (hh, amp) in enumerate([(0.0, 0.05), (0.03, 0.04), (0.07, 0.03)]):
        line = ridge_line(rng, w, horizon - (0.09 - hh) * h, amp * h)
        mask = gy >= line[None, :]
        mix = 0.62 - i * 0.2
        col = np.array(tint) * (1 - mix) + haze * mix
        arr[mask] = col * (0.92 + 0.08 * i)

    # plain
    plain = gy >= horizon
    pg = np.clip((gy - horizon) / (h - horizon + 1), 0, 1)[..., None]
    plain_col = np.array(ground)[None, None, :] * (0.78 + 0.35 * pg) + haze * 0.14 * (1 - pg)
    arr[plain] = plain_col[plain]

    img = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"), "RGB").convert("RGBA")

    # track
    vx = w * rng.uniform(0.35, 0.65)
    track = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    td = ImageDraw.Draw(track)
    spread = rng.uniform(0.35, 0.6) * w
    lean = rng.uniform(-0.25, 0.25) * w
    td.polygon([(vx - 6, horizon), (vx + 6, horizon),
                (vx + lean + spread, h), (vx + lean - spread, h)],
               fill=tuple(int(c * 0.55 + 140 * 0.45) for c in ground) + (235,))
    img = Image.alpha_composite(img, track.filter(ImageFilter.GaussianBlur(w * 0.004)))

    deco = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    ink = (22, 24, 30, 255)

    def tree(cx, base, size):
        dd.line([(cx, base), (cx + size * 0.05, base - size * 0.55)], fill=ink, width=max(2, int(size * 0.06)))
        for ox, oy, rw, rh in [(0, -0.62, 0.9, 0.2), (-0.35, -0.5, 0.55, 0.14), (0.4, -0.52, 0.55, 0.14)]:
            dd.ellipse([cx + (ox - rw / 2) * size, base + (oy - rh / 2) * size,
                        cx + (ox + rw / 2) * size, base + (oy + rh / 2) * size], fill=ink)

    if kind in ("Landscape", "Action", "Crowd"):
        for _ in range(rng.integers(1, 3)):
            side = rng.choice([-1, 1])
            tree(vx + side * rng.uniform(0.18, 0.4) * w, horizon + rng.uniform(0.02, 0.12) * h,
                 rng.uniform(0.12, 0.26) * h)

    if kind == "Action":
        # dust plume behind the car
        t = rng.uniform(0.35, 0.8)            # how close the car is
        cy = horizon + (h - horizon) * t * 0.7
        cx = vx + lean * t * 0.6 + rng.uniform(-0.05, 0.05) * w
        scale = 0.05 + 0.1 * t
        plume = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        pd = ImageDraw.Draw(plume)
        dust = tuple(int(c * 0.35 + 215 * 0.65) for c in ground)
        for k in range(28):
            px = cx + rng.normal(-scale * w * (0.9 + k * 0.05), scale * w * 0.55)
            py = cy - abs(rng.normal(scale * h * (0.4 + k * 0.045), scale * h * 0.55))
            r = rng.uniform(0.35, 1.0) * scale * w * (0.7 + k * 0.03)
            pd.ellipse([px - r, py - r * 0.7, px + r, py + r * 0.7], fill=dust + (int(rng.uniform(36, 80)),))
        img = Image.alpha_composite(img, plume.filter(ImageFilter.GaussianBlur(scale * w * 0.35)))
        cw = scale * w * 1.7
        dd.rounded_rectangle([cx - cw / 2, cy - cw * 0.28, cx + cw / 2, cy], radius=cw * 0.07, fill=ink)
        dd.polygon([(cx - cw * 0.26, cy - cw * 0.28), (cx - cw * 0.15, cy - cw * 0.46),
                    (cx + cw * 0.2, cy - cw * 0.46), (cx + cw * 0.3, cy - cw * 0.28)], fill=ink)
        for wx in (-0.3, 0.3):
            dd.ellipse([cx + wx * cw - cw * 0.1, cy - cw * 0.1, cx + wx * cw + cw * 0.1, cy + cw * 0.1], fill=(8, 8, 10, 255))
        dd.rectangle([cx - cw * 0.04, cy - cw * 0.2, cx + cw * 0.12, cy - cw * 0.1], fill=(244, 194, 27, 255))

    if kind == "Crowd":
        base = horizon + 0.03 * h
        for _ in range(170):
            x = rng.uniform(0, w)
            y = base + rng.uniform(0, 0.22) * h
            s = 0.008 * h * (0.6 + (y - base) / h * 4)
            dd.ellipse([x - s, y - s * 3.2, x + s, y - s * 1.2], fill=ink)
            dd.rectangle([x - s * 0.9, y - s * 1.2, x + s * 0.9, y + s], fill=ink)
        for _ in range(6):
            x = rng.uniform(0.05, 0.95) * w
            y = base + rng.uniform(0.02, 0.2) * h
            dd.rectangle([x, y - 0.1 * h, x + 0.006 * w, y], fill=ink)
            dd.polygon([(x, y - 0.1 * h), (x + 0.05 * w, y - 0.085 * h), (x, y - 0.07 * h)],
                       fill=(244, 194, 27, 255))

    if kind == "Service park":
        y0 = horizon + 0.05 * h
        for i in range(5):
            x = (i + 0.5) * w / 5 + rng.uniform(-0.03, 0.03) * w
            tw = rng.uniform(0.12, 0.17) * w
            th = tw * 0.5
            col = rng.choice([(236, 236, 230, 255), (30, 59, 48, 255), (244, 194, 27, 255)])
            dd.polygon([(x - tw / 2, y0 + th * 0.9), (x, y0), (x + tw / 2, y0 + th * 0.9)], fill=tuple(col))
            dd.rectangle([x - tw / 2, y0 + th * 0.9, x + tw / 2, y0 + th * 1.35], fill=tuple(int(c * 0.82) for c in col[:3]) + (255,))
        for i in range(8):
            x = rng.uniform(0.05, 0.95) * w
            y = y0 + th * 1.55 + rng.uniform(0, 0.1) * h
            s = 0.025 * h
            dd.ellipse([x - s, y - s, x + s, y + s], fill=(12, 12, 14, 255))

    img = Image.alpha_composite(img, deco).convert("RGB")

    # grain, vignette
    a = np.asarray(img).astype(float)
    a += rng.normal(0, 3.5, a.shape[:2])[..., None]
    v = 1 - 0.22 * (np.hypot((gx - w / 2) / (w / 2), (gy - h / 2) / (h / 2)) / 1.4) ** 2
    a *= v[..., None]
    img = Image.fromarray(np.clip(a, 0, 255).astype("uint8"))

    # a quiet marker so these are never mistaken for real photographs
    dr = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default(size=max(14, int(h * 0.018)))
    except TypeError:
        font = ImageFont.load_default()
    dr.text((w * 0.02, h * 0.965), "Sample frame", fill=(255, 255, 255), font=font, anchor="ls")
    return img


def main():
    for year, count in COUNTS.items():
        folder = OUT / year
        folder.mkdir(parents=True, exist_ok=True)
        rows = []
        used = {}
        for i in range(count):
            kind = KINDS[(i + int(year)) % len(KINDS)]
            if i == 0:
                kind = "Action"
            aw, ah = ASPECTS[(i * 3 + int(year)) % len(ASPECTS)]
            if (kind in ("Crowd", "Service park") or i == 0) and ah > aw:
                aw, ah = 3, 2
            w = LONG_SIDE if aw >= ah else int(LONG_SIDE * aw / ah)
            h = int(w * ah / aw)
            seed = int(year) * 100 + i
            name = f"frame-{i + 1:03d}.jpg"
            titles = TITLES[kind]
            n = used.get(kind, 0)
            used[kind] = n + 1
            title = titles[(n + i) % len(titles)]
            scene(w, h, seed, year, kind).save(folder / name, "JPEG", quality=88)
            rows.append({
                "file": name,
                "title": title,
                "stage": f"Stage {1 + (i * 2) % 12}" if kind != "Service park" else "Service park",
                "tags": kind,
                "cover": "yes" if i == 0 else "",
            })
        with (folder / "captions.csv").open("w", newline="", encoding="utf-8") as fh:
            wr = csv.DictWriter(fh, fieldnames=["file", "title", "stage", "tags", "cover"])
            wr.writeheader()
            wr.writerows(rows)
        print(f"{year}: {count} sample frames")


if __name__ == "__main__":
    main()
