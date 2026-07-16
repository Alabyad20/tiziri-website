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

import cv2

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
        # Support explicit "file" (top-down manifest) or "dir" (first jpg).
        if fx.get("file"):
            img = os.path.join(repo, fx["file"]) if repo else fx["file"]
        else:
            img = first_jpg(os.path.join(repo, fx["dir"]) if repo else fx["dir"])
        if not img or not os.path.exists(img):
            rows.append({"name": fx["name"], "category": fx.get("category", ""), "status": "no-image"})
            continue
        req = AnalyzeRequest(
            image_path=img, rug_width_cm=fx["w_cm"], rug_height_cm=fx["h_cm"],
            out_dir=str(out / fx["name"]), cache_dir=cache, segmenter=args.segmenter,
        )
        try:
            res = run_analysis(req, Emitter(io.StringIO()))
            shutil.copyfile(res["artifacts"]["preview"], out / f"{fx['name']}.png")
            _corner_overlay(img, res["artifacts"]["camera"], out / f"{fx['name']}-corners.png")
            rd = res.get("readiness", {})
            rows.append({
                "name": fx["name"], "category": fx["category"], "status": "ok",
                "segmenter": res["segmenter_used"], "rms_px": res["reprojection_rms_px"],
                "reproj_pass": res["reprojection_pass"],
                "production_ready": res.get("production_ready"), "decision": rd.get("decision"),
                "time_ms": res["timings_ms"],
            })
        except Exception as e:
            rows.append({"name": fx["name"], "category": fx["category"], "status": f"error: {e}"})

    (out / "summary.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"{'fixture':<24}{'seg':<8}{'rms_px':>8} {'ready':<6}{'decision':<10}category")
    for r in rows:
        if r["status"] == "ok":
            print(f"{r['name']:<24}{r['segmenter']:<8}{r['rms_px']:>8.1f} "
                  f"{str(r['production_ready']):<6}{str(r['decision']):<10}{r['category']}")
        else:
            print(f"{r['name']:<24}{r['status']}")
    return 0


def _corner_overlay(img_path: str, camera_json: str, out_path) -> None:
    import numpy as np
    data = np.fromfile(img_path, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    cam = json.loads(open(camera_json, encoding="utf-8").read())
    c = np.array(cam["corners_tl_tr_br_bl"], dtype=np.int32)
    cv2.polylines(img, [c], True, (60, 60, 255), max(2, img.shape[1] // 400))
    for i, p in enumerate(c):
        cv2.circle(img, tuple(p), max(6, img.shape[1] // 150), (60, 220, 60), -1)
        cv2.putText(img, "TL TR BR BL".split()[i], tuple(p), cv2.FONT_HERSHEY_SIMPLEX,
                    img.shape[1] / 1500, (255, 255, 255), 2)
    scale = min(1.0, 900 / max(img.shape[:2]))
    small = cv2.resize(img, (int(img.shape[1] * scale), int(img.shape[0] * scale)))
    cv2.imencode(".png", small)[1].tofile(str(out_path))


if __name__ == "__main__":
    raise SystemExit(main())
