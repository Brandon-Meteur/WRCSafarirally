#!/usr/bin/env python3
"""
Build the Gallery 54 site data from a folder of original photographs.

    originals/
      2024/
        IMG_0001.jpg
        IMG_0002.jpg
        captions.csv        (optional)
      2025/
      2026/

Run from the project root:

    pip install Pillow
    python tools/build_gallery.py

For every photo it writes three WebP sizes into photos/<year>/ and then
writes data/gallery.js, which the page reads. Re-running only processes
new or changed photos, so adding a rally means: drop a new year folder
into originals/, add a line for it in site.json, run this script, commit.

captions.csv columns (all optional except file):
    file,title,stage,tags,cover
    IMG_0001.jpg,Dust on the long straight,Stage 3,Action,yes
Separate several tags with a semicolon. Mark one photo per year with
cover=yes to choose the hero image; otherwise the first landscape photo is used.
"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
SIZES = (480, 960, 1600)          # widths in pixels
QUALITY = 78
EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "photo"


def read_captions(folder: Path) -> dict:
    path = folder / "captions.csv"
    out = {}
    if not path.exists():
        return out
    with path.open(newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            name = (row.get("file") or "").strip()
            if name:
                out[name.lower()] = row
    return out


def process_photo(src: Path, out_dir: Path, stem: str):
    """Write resized WebP files; return (width, height, average colour, widths)."""
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        avg = im.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
        widths = [s for s in SIZES if s < w] + [min(w, SIZES[-1])]
        widths = sorted(set(widths))
        for target in widths:
            dest = out_dir / f"{stem}-{target}.webp"
            if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
                continue
            th = round(h * target / w)
            im.resize((target, th), Image.LANCZOS).save(
                dest, "WEBP", quality=QUALITY, method=5
            )
    return w, h, "#%02x%02x%02x" % avg, widths


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--originals", default=str(ROOT / "originals"), help="folder with one sub-folder per year")
    ap.add_argument("--site", default=str(ROOT / "site.json"))
    ap.add_argument("--out", default=str(ROOT / "data" / "gallery.js"))
    args = ap.parse_args()

    originals = Path(args.originals)
    site = json.loads(Path(args.site).read_text(encoding="utf-8"))
    if not originals.is_dir():
        sys.exit(f"No originals folder at {originals}")

    years = []
    for folder in sorted(originals.iterdir(), reverse=True):
        if not (folder.is_dir() and re.fullmatch(r"\d{4}", folder.name)):
            continue
        year = folder.name
        captions = read_captions(folder)
        files = sorted(p for p in folder.iterdir() if p.suffix.lower() in EXTS)
        if not files:
            continue
        out_dir = ROOT / "photos" / year
        out_dir.mkdir(parents=True, exist_ok=True)

        photos, cover = [], None
        used = set()
        for src in files:
            stem = slug(src.stem)
            while stem in used:
                stem += "-x"
            used.add(stem)
            w, h, colour, widths = process_photo(src, out_dir, stem)
            meta = captions.get(src.name.lower(), {})
            tags = [t.strip() for t in (meta.get("tags") or "").split(";") if t.strip()]
            photo = {
                "id": f"{year}-{stem}",
                "n": stem,
                "w": w,
                "h": h,
                "c": colour,
                "f": widths,
                "t": (meta.get("title") or "").strip(),
                "s": (meta.get("stage") or "").strip(),
                "g": tags,
            }
            photos.append(photo)
            if (meta.get("cover") or "").strip().lower() in {"yes", "y", "true", "1"}:
                cover = photo["id"]

        info = (site.get("years") or {}).get(year, {})
        years.append({
            "year": year,
            "blurb": info.get("blurb", ""),
            "place": info.get("place", site.get("place", "")),
            "dates": info.get("dates", ""),
            "cover": cover or next((x["id"] for x in photos if x["w"] >= x["h"]), photos[0]["id"]),
            "photos": photos,
        })
        print(f"{year}: {len(photos)} photos")

    if not years:
        sys.exit("No year folders with photos were found.")

    payload = {
        "site": {k: v for k, v in site.items() if k != "years"},
        "years": years,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        "window.GALLERY=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    total = sum(len(y["photos"]) for y in years)
    print(f"Wrote {out.relative_to(ROOT)} with {total} photos across {len(years)} rallies.")


if __name__ == "__main__":
    main()
