#!/usr/bin/env python3
"""
Convert every .jpg under rug-photos/ to a same-named .webp alongside it
(originals untouched). Skips files that already have an up-to-date .webp.

Run from the repo root:
    python3 scripts/optimize_images.py          # convert
    python3 scripts/optimize_images.py --report # just report sizes, no conversion
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS_ROOT = os.path.join(ROOT, "rug-photos")
QUALITY = 82


def find_jpgs():
    for dirpath, _, filenames in os.walk(PHOTOS_ROOT):
        for fname in filenames:
            if fname.lower().endswith(".jpg") or fname.lower().endswith(".jpeg"):
                yield os.path.join(dirpath, fname)


def webp_path(jpg_path):
    base, _ = os.path.splitext(jpg_path)
    return base + ".webp"


def convert(jpg_path):
    out_path = webp_path(jpg_path)
    if os.path.exists(out_path) and os.path.getmtime(out_path) >= os.path.getmtime(jpg_path):
        return None  # already converted, skip
    with Image.open(jpg_path) as im:
        im = im.convert("RGB")
        im.save(out_path, "WEBP", quality=QUALITY, method=6)
    return out_path


def main():
    report_only = "--report" in sys.argv
    jpgs = list(find_jpgs())
    total_before = 0
    total_after = 0
    converted = 0
    skipped = 0
    failed = []

    for jpg in jpgs:
        before = os.path.getsize(jpg)
        total_before += before
        if report_only:
            continue
        try:
            out = convert(jpg)
        except Exception as e:
            failed.append((jpg, str(e)))
            continue
        if out is None:
            skipped += 1
            out_size = os.path.getsize(webp_path(jpg))
            total_after += out_size
        else:
            converted += 1
            total_after += os.path.getsize(out)

    print(f"Found {len(jpgs)} jpg files, total {total_before / 1024 / 1024:.1f} MB")
    if report_only:
        return
    print(f"Converted {converted}, skipped (already up to date) {skipped}, failed {len(failed)}")
    print(f"WebP total: {total_after / 1024 / 1024:.1f} MB")
    if failed:
        print("Failures:")
        for path, err in failed[:20]:
            print(f"  {path}: {err}")


if __name__ == "__main__":
    main()
