#!/usr/bin/env python
"""Explicit model download step — SEPARATE from install (P1 constraint #8).

Downloads are resumable and checksum-verified. The classical pipeline runs
WITHOUT any of these; they are the neural quality tier (SAM 2) and optional depth.

Usage:
  python scripts/download_models.py --list                 # show registry + licences
  python scripts/download_models.py sam2_encoder sam2_decoder
  python scripts/download_models.py --all --dest ./models
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tiziri_analysis.models import REGISTRY, download, DownloadError  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", help="model ids to fetch")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--dest", default=str(Path(__file__).resolve().parent.parent / "models"))
    args = ap.parse_args()

    if args.list or (not args.ids and not args.all):
        print(f"{'id':<28}{'licence':<16}{'pinned':<8}source")
        for e in REGISTRY.values():
            print(f"{e.id:<28}{e.license:<16}{str(e.pinned):<8}{e.source}")
        print("\nNote: SMALL depth model only (Base/Large are CC-BY-NC and disallowed).")
        return 0

    ids = list(REGISTRY.keys()) if args.all else args.ids
    rc = 0
    for mid in ids:
        entry = REGISTRY.get(mid)
        if entry is None:
            print(f"[skip] unknown model '{mid}'")
            rc = 1
            continue
        try:
            def prog(done, total):
                pct = (done / total * 100) if total else 0
                sys.stdout.write(f"\r  {mid}: {pct:5.1f}%")
                sys.stdout.flush()
            path = download(entry, args.dest, on_progress=prog)
            print(f"\n[ok] {mid} -> {path}")
        except DownloadError as e:
            print(f"[fail] {e}")
            rc = 1
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
