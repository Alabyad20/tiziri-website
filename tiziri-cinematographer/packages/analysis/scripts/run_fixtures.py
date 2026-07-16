#!/usr/bin/env python
"""Run the pipeline across a fixture manifest and write previews + a summary, for
human visual review (P1 DoD). Each fixture entry names a directory (the first JPG
is used), the rug's real dimensions, and the category it stresses.

Usage: python scripts/run_fixtures.py --manifest fixtures/fixtures.json --out <dir>
"""
import argparse
import glob
import io
import json
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tiziri_analysis.contract import AnalyzeRequest  # noqa: E402
from tiziri_analysis.pipeline import run_analysis  # noqa: E402
from tiziri_analysis.runtime import Emitter  # noqa: E402


def first_jpg(d: str):
    for p in sorted(glob.glob(os.path.join(d, "*.jpg")) + glob.glob(os.path.join(d, "*.JPG"))):
        return p
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--segmenter", default="auto")
    args = ap.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    repo = manifest.get("repo_root", "")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    cache = str(out / "_cache")

    rows = []
    for fx in manifest["fixtures"]:
        d = os.path.join(repo, fx["dir"]) if repo else fx["dir"]
        img = first_jpg(d)
        if not img:
            rows.append({"name": fx["name"], "status": "no-image", "dir": d})
            continue
        req = AnalyzeRequest(
            image_path=img, rug_width_cm=fx["w_cm"], rug_height_cm=fx["h_cm"],
            out_dir=str(out / fx["name"]), cache_dir=cache, segmenter=args.segmenter,
        )
        try:
            res = run_analysis(req, Emitter(io.StringIO()))
            shutil.copyfile(res["artifacts"]["preview"], out / f"{fx['name']}.png")
            rows.append({
                "name": fx["name"], "category": fx["category"], "status": "ok",
                "segmenter": res["segmenter_used"], "rms_px": res["reprojection_rms_px"],
                "pass": res["reprojection_pass"],
            })
        except Exception as e:
            rows.append({"name": fx["name"], "category": fx["category"], "status": f"error: {e}"})

    (out / "summary.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"{'fixture':<26}{'seg':<9}{'rms_px':>9}  {'pass':<6}category")
    for r in rows:
        if r["status"] == "ok":
            print(f"{r['name']:<26}{r['segmenter']:<9}{r['rms_px']:>9.1f}  {str(r['pass']):<6}{r['category']}")
        else:
            print(f"{r['name']:<26}{r['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
