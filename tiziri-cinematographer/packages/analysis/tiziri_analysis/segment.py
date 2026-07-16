"""Segmentation: produce a coarse rug mask (background/rug, plus a shadow layer
computed separately).

Two backends behind one interface:
  * GrabCutSegmenter  - OpenCV (Apache-2.0), NO weights, NO download. The reliable
    CPU fallback and the default when neural weights are absent.
  * Sam2OnnxSegmenter - SAM 2 (Apache-2.0) via onnxruntime. The quality tier; runs
    only when its weights have been fetched by the explicit download step, and any
    failure is RECOVERABLE so `auto` falls back to GrabCut.

Neither backend generates or edits rug pixels — they only label which pixels are
the rug.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional, Protocol

import cv2
import numpy as np

from .runtime import AnalysisError, Device, Emitter


class Segmenter(Protocol):
    name: str

    def segment(self, image_rgb: np.ndarray, rug_box: Optional[list[float]],
                points: Optional[list[list[float]]] = None) -> np.ndarray:
        ...


def _fill_holes(mask: np.ndarray) -> np.ndarray:
    ff = mask.copy()
    h, w = mask.shape
    cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255)
    return mask | cv2.bitwise_not(ff)


def _select_by_points(mask: np.ndarray, pos: list, neg: list) -> np.ndarray:
    """Interactive component selection: keep the connected component(s) under
    POSITIVE clicks, drop those under NEGATIVE clicks. Falls back to the largest
    component when there is no positive click."""
    m = (mask > 0).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 1:
        return (m * 255).astype(np.uint8)

    def label_at(pt):
        x, y = int(pt[0]), int(pt[1])
        if 0 <= y < labels.shape[0] and 0 <= x < labels.shape[1]:
            return int(labels[y, x])
        return 0

    keep = {label_at(p) for p in pos}
    keep.discard(0)
    if not keep:  # no positive click landed on foreground -> largest component
        keep = {1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))}
    drop = {label_at(p) for p in neg}
    keep -= drop
    out = np.isin(labels, list(keep)).astype(np.uint8) * 255
    return _fill_holes(out)


def _clean_mask(mask: np.ndarray) -> np.ndarray:
    """Keep the largest component, fill holes, smooth slightly."""
    m = (mask > 0).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 1:
        return (m * 255).astype(np.uint8)
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    keep = (labels == largest).astype(np.uint8) * 255
    # fill interior holes
    ff = keep.copy()
    h, w = keep.shape
    cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255)
    keep = keep | cv2.bitwise_not(ff)
    return keep


# GrabCut is O(pixels x iters); a coarse mask doesn't need full resolution. Run it
# at a capped size and upscale the mask (the fringe detail comes from matting, not
# this coarse mask).
SEG_MAX_SIDE = 1024


class GrabCutSegmenter:
    name = "grabcut"

    def segment(self, image_rgb: np.ndarray, rug_box: Optional[list[float]],
                points: Optional[list[list[float]]] = None) -> np.ndarray:
        H, W = image_rgb.shape[:2]
        scale = min(1.0, SEG_MAX_SIDE / max(H, W))
        sw, sh = max(1, int(round(W * scale))), max(1, int(round(H * scale)))
        small = cv2.resize(image_rgb, (sw, sh), interpolation=cv2.INTER_AREA) if scale < 1.0 else image_rgb

        if rug_box is not None:
            x0, y0, x1, y1 = [v * scale for v in rug_box]
        else:
            x0, y0, x1, y1 = sw * 0.06, sh * 0.06, sw * 0.94, sh * 0.94
        rect = (int(max(0, x0)), int(max(0, y0)),
                int(min(sw, x1) - max(0, x0)), int(min(sh, y1) - max(0, y0)))

        bgr = cv2.cvtColor(small, cv2.COLOR_RGB2BGR)
        # Mask-init with strong seeds beats rect-init when the rug colour resembles
        # the surroundings: a central region is sure-foreground, a thin outer frame
        # is sure-background, the rest is "probable".
        gc = np.full((sh, sw), cv2.GC_PR_BGD, np.uint8)
        rx, ry, rw, rh = rect
        gc[ry:ry + rh, rx:rx + rw] = cv2.GC_PR_FGD
        if not points:
            # Auto mode only: a central sure-FG block helps when the rug fills the
            # frame. With explicit clicks we DON'T add it (it can bridge separate
            # objects) — the user's clicks are the seeds.
            cx0, cy0 = int(rx + rw * 0.18), int(ry + rh * 0.18)
            cx1, cy1 = int(rx + rw * 0.82), int(ry + rh * 0.82)
            gc[cy0:cy1, cx0:cx1] = cv2.GC_FGD
        bm = max(2, int(0.02 * min(sw, sh)))
        gc[:bm, :] = gc[-bm:, :] = gc[:, :bm] = gc[:, -bm:] = cv2.GC_BGD
        # Interactive seeds: positive clicks -> sure FG, negative -> sure BG.
        if points:
            r = max(4, int(0.02 * min(sw, sh)))
            for px, py, lab in points:
                c = (int(px * scale), int(py * scale))
                cv2.circle(gc, c, r, cv2.GC_FGD if lab >= 0.5 else cv2.GC_BGD, -1)
        bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(bgr, gc, None, bgd, fgd, 5, cv2.GC_INIT_WITH_MASK)
        mask_s = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        if points:
            pos = [(px * scale, py * scale) for px, py, lab in points if lab >= 0.5]
            neg = [(px * scale, py * scale) for px, py, lab in points if lab < 0.5]
            mask_s = _select_by_points(mask_s, pos, neg)
        else:
            mask_s = _clean_mask(mask_s)
        return cv2.resize(mask_s, (W, H), interpolation=cv2.INTER_NEAREST) if scale < 1.0 else mask_s


class Sam2OnnxSegmenter:
    """SAM 2 image encoder + prompt decoder via ONNX. Requires weights fetched by
    `scripts/download_models.py`. Structurally complete; any I/O or runtime issue
    is raised as RECOVERABLE so `auto` degrades to GrabCut."""

    name = "sam2"

    def __init__(self, models_dir: str, device: Device) -> None:
        import onnxruntime as ort  # noqa

        self._encoder_path = Path(models_dir) / "sam2_encoder.onnx"
        self._decoder_path = Path(models_dir) / "sam2_decoder.onnx"
        if not self._encoder_path.exists() or not self._decoder_path.exists():
            raise AnalysisError(
                "weights_missing",
                "SAM 2 ONNX weights not found; run scripts/download_models.py",
                recoverable=True,
            )
        providers = [p for p in device.onnx_providers if p != "AzureExecutionProvider"] or ["CPUExecutionProvider"]
        self._enc = ort.InferenceSession(str(self._encoder_path), providers=providers)
        self._dec = ort.InferenceSession(str(self._decoder_path), providers=providers)

    def segment(self, image_rgb: np.ndarray, rug_box: Optional[list[float]],
                points: Optional[list[list[float]]] = None) -> np.ndarray:
        try:
            return self._run(image_rgb, rug_box)  # ONNX path: box/auto only
        except AnalysisError:
            raise
        except Exception as e:  # any ONNX/shape mismatch is recoverable -> fallback
            raise AnalysisError("sam2_runtime", f"SAM 2 inference failed: {e}", recoverable=True)

    def _run(self, image_rgb: np.ndarray, rug_box: Optional[list[float]]) -> np.ndarray:
        h, w = image_rgb.shape[:2]
        size = 1024
        img = cv2.resize(image_rgb, (size, size), interpolation=cv2.INTER_LINEAR).astype(np.float32)
        mean = np.array([0.485, 0.456, 0.406], np.float32) * 255.0
        std = np.array([0.229, 0.224, 0.225], np.float32) * 255.0
        inp = ((img - mean) / std).transpose(2, 0, 1)[None]
        emb = self._enc.run(None, {self._enc.get_inputs()[0].name: inp})[0]

        if rug_box is None:
            box = np.array([w * 0.06, h * 0.06, w * 0.94, h * 0.94], np.float32)
        else:
            box = np.array(rug_box, np.float32)
        sx, sy = size / w, size / h
        pts = np.array([[[box[0] * sx, box[1] * sy], [box[2] * sx, box[3] * sy]]], np.float32)
        labels = np.array([[2, 3]], np.float32)  # SAM box-corner labels
        dec_in = {
            "image_embeddings": emb,
            "point_coords": pts,
            "point_labels": labels,
            "mask_input": np.zeros((1, 1, 256, 256), np.float32),
            "has_mask_input": np.zeros(1, np.float32),
            "orig_im_size": np.array([h, w], np.float32),
        }
        names = {i.name for i in self._dec.get_inputs()}
        dec_in = {k: v for k, v in dec_in.items() if k in names}
        out = self._dec.run(None, dec_in)
        low = out[0]
        m = low[0, 0] if low.ndim == 4 else low[0]
        m = cv2.resize(m.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
        return _clean_mask((m > 0).astype(np.uint8) * 255)


def get_segmenter(name: str, models_dir: str, device: Device, emitter: Emitter):
    """Resolve a segmenter, honouring `auto` with graceful fallback.
    Returns (segmenter, warnings)."""
    warnings: list[str] = []
    if name == "grabcut":
        return GrabCutSegmenter(), warnings
    if name in ("auto", "sam2"):
        try:
            from .sam2_backend import Sam2Segmenter  # lazy: keeps torch optional
            seg = Sam2Segmenter(models_dir, device)
            emitter.log("segmenter=SAM 2 (primary)")
            return seg, warnings
        except AnalysisError as e:
            if name == "sam2" and not e.recoverable:
                raise
            warnings.append(f"SAM 2 unavailable ({e.code}); using GrabCut fallback")
            emitter.log(warnings[-1], "warn")
            return GrabCutSegmenter(), warnings
    raise AnalysisError("bad_segmenter", f"unknown segmenter '{name}'")
