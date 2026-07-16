"""The analysis pipeline: segment -> shadow -> matte -> cutout -> geometry ->
(optional depth) -> diagnostics + preview. Emits progress throughout, honours the
content cache, and checks a cancellation callback between stages.

Everything written is SIDECAR analysis data. The cutout's RGB is the original
image, untouched; only an alpha channel is added.
"""
from __future__ import annotations

import os
from typing import Callable, Optional

import cv2
import numpy as np

from . import PIPELINE_VERSION
from . import cache as cache_mod
from .contract import AnalyzeRequest, Artifacts, AnalysisResult
from .geometry import REPROJECTION_TARGET_PX, solve_homography
from .matte import build_trimap, make_cutout, soft_alpha
from .runtime import (AnalysisError, Emitter, Stopwatch, detect_device,
                      load_image_rgb, require_memory, save_png, sha256_file, write_json)
from .segment import get_segmenter
from .shadow import estimate_shadow

CancelCheck = Callable[[], bool]


def _ck(cancel: Optional[CancelCheck]) -> None:
    if cancel and cancel():
        raise AnalysisError("cancelled", "analysis cancelled", recoverable=True)


def run_analysis(req: AnalyzeRequest, emitter: Emitter,
                 cancel: Optional[CancelCheck] = None) -> dict:
    _ck(cancel)
    if not os.path.exists(req.image_path):
        raise AnalysisError("missing_input", f"image not found: {req.image_path}")
    sw = Stopwatch()
    os.makedirs(req.out_dir, exist_ok=True)
    device = detect_device()
    emitter.log(f"device={device.name} providers={device.onnx_providers} ram={device.total_ram_gb}GB")

    image_sha = sha256_file(req.image_path)
    params = {
        "segmenter": req.segmenter, "with_depth": req.with_depth, "rug_box": req.rug_box,
        "w_cm": req.rug_width_cm, "h_cm": req.rug_height_cm,
        "pipeline": PIPELINE_VERSION, "contract": req.contract_version,
    }
    key = cache_mod.cache_key(image_sha, params)

    emitter.progress("cache", 0.03)
    restored = cache_mod.try_restore(req.cache_dir, key, req.out_dir)
    if restored is not None:
        emitter.log("cache hit")
        emitter.progress("done", 1.0)
        return restored

    _ck(cancel)
    with sw.time("load"):
        image = load_image_rgb(req.image_path)
        require_memory(image.shape[0] * image.shape[1], device=device)
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    h, w = image.shape[:2]

    emitter.progress("segment", 0.15)
    _ck(cancel)
    segmenter, warnings = get_segmenter(req.segmenter, _models_dir(), device, emitter)
    with sw.time("segment"):
        mask = segmenter.segment(image, req.rug_box)
    if int((mask > 127).sum()) < 0.02 * h * w:
        raise AnalysisError("no_rug", "rug region too small; check the photo or provide rug_box")

    emitter.progress("shadow", 0.30)
    _ck(cancel)
    with sw.time("shadow"):
        shadow = estimate_shadow(image, mask)

    emitter.progress("matte", 0.45)
    _ck(cancel)
    band = max(8, int(0.012 * max(h, w)))
    with sw.time("matte"):
        trimap = build_trimap(mask, band)
        alpha = soft_alpha(image, trimap)
        cutout = make_cutout(image, alpha)

    emitter.progress("geometry", 0.72)
    _ck(cancel)
    with sw.time("geometry"):
        geo, rms = solve_homography(mask, gray, req.rug_width_cm, req.rug_height_cm, req.rug_box)

    depth_img = None
    if req.with_depth:
        emitter.progress("depth", 0.82)
        _ck(cancel)
        from .depth import try_depth
        with sw.time("depth"):
            depth_img = try_depth(_models_dir(), device, image)
        if depth_img is None:
            warnings.append("depth requested but weights missing; skipped")
            emitter.log(warnings[-1], "warn")

    emitter.progress("write", 0.9)
    arts = _write_sidecars(req.out_dir, image, mask, alpha, cutout, shadow, geo, depth_img)

    diagnostics = {
        "image_size": [w, h], "mask_area_frac": round(float((mask > 127).mean()), 4),
        "alpha_coverage": round(float((alpha > 0.01).mean()), 4),
        "band_px": band, "segmenter": segmenter.name, "device": device.name,
        "reprojection_rms_px": geo["reprojection_rms_px"],
        "n_edge_correspondences": geo["n_edge_correspondences"],
        "warnings": warnings, "timings_ms": sw.timings,
    }
    write_json(arts.diagnostics, diagnostics)

    result = AnalysisResult(
        ok=True, cache_hit=False, image_sha256=image_sha, contract_version=req.contract_version,
        pipeline_version=PIPELINE_VERSION, segmenter_used=segmenter.name, device=device.name,
        reprojection_rms_px=geo["reprojection_rms_px"], reprojection_target_px=REPROJECTION_TARGET_PX,
        reprojection_pass=geo["reprojection_rms_px"] <= REPROJECTION_TARGET_PX,
        timings_ms=sw.timings, artifacts=arts, warnings=warnings,
    ).to_json()

    cache_mod.save(req.cache_dir, key, result)
    emitter.progress("done", 1.0)
    return result


def _models_dir() -> str:
    return os.environ.get("TIZIRI_MODELS_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "models"))


def _write_sidecars(out_dir, image, mask, alpha, cutout, shadow, geo, depth_img) -> Artifacts:
    a = Artifacts(
        mask=os.path.join(out_dir, "mask.png"),
        alpha=os.path.join(out_dir, "alpha.png"),
        cutout=os.path.join(out_dir, "cutout.png"),
        shadow=os.path.join(out_dir, "shadow.png"),
        corners=os.path.join(out_dir, "corners.json"),
        camera=os.path.join(out_dir, "camera.json"),
        diagnostics=os.path.join(out_dir, "diagnostics.json"),
        preview=os.path.join(out_dir, "preview.png"),
    )
    save_png(a.mask, mask)
    save_png(a.alpha, (np.clip(alpha, 0, 1) * 255).astype(np.uint8))
    save_png(a.cutout, cutout)
    save_png(a.shadow, shadow)
    write_json(a.corners, {"corners_tl_tr_br_bl": geo["corners_tl_tr_br_bl"]})
    write_json(a.camera, geo)
    if depth_img is not None:
        a.depth = os.path.join(out_dir, "depth.png")
        save_png(a.depth, depth_img)
    save_png(a.preview, _build_preview(image, mask, cutout))
    return a


def _build_preview(image, mask, cutout) -> np.ndarray:
    """A side-by-side review: original | mask edges over original | cutout on a
    checkerboard. For human visual QA of the analysis (a sidecar, not product)."""
    scale = min(1.0, 720 / max(image.shape[:2]))
    sz = (int(image.shape[1] * scale), int(image.shape[0] * scale))
    orig = cv2.resize(image, sz)
    m = cv2.resize(mask, sz, interpolation=cv2.INTER_NEAREST)
    edges = cv2.dilate(cv2.Canny(m, 50, 150), np.ones((3, 3), np.uint8))
    over = orig.copy()
    over[edges > 0] = (255, 40, 40)
    cut = cv2.resize(cutout, sz)
    checker = _checker(sz[1], sz[0])
    a = cut[:, :, 3:4].astype(np.float32) / 255.0
    comp = (cut[:, :, :3].astype(np.float32) * a + checker.astype(np.float32) * (1 - a)).astype(np.uint8)
    gap = np.full((sz[1], 8, 3), 30, np.uint8)
    return np.hstack([orig, gap, over, gap, comp])


def _checker(h, w, s=16):
    yy, xx = np.mgrid[0:h, 0:w]
    c = (((yy // s) + (xx // s)) % 2).astype(np.uint8)
    img = np.where(c[..., None] == 1, 210, 170).astype(np.uint8)
    return np.repeat(img, 3, axis=2)
