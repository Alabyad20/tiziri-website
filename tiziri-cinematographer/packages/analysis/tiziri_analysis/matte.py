"""Soft alpha matting for fringe. Permissive + no weights: a trimap is derived
from the coarse mask, then classical closed-form matting (pymatting, MIT) produces
the soft alpha. The transparent cutout is ORIGINAL pixels with a computed alpha —
no rug pixel is ever generated or changed.
"""
from __future__ import annotations

import cv2
import numpy as np

# Matting solves a large sparse system; closed-form is memory-heavy, so cap the
# resolution and fall back to large-kernel matting under memory pressure. 1100px
# keeps fringe readable while fitting comfortably on a CPU box.
MATTE_MAX_SIDE = 1100


def build_trimap(mask: np.ndarray, band_px: int) -> np.ndarray:
    """0 = background, 255 = definite rug, 128 = unknown (the fringe band)."""
    m = (mask > 127).astype(np.uint8) * 255
    k = max(3, band_px | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    inner = cv2.erode(m, kernel)
    outer = cv2.dilate(m, kernel)
    trimap = np.full(mask.shape, 128, dtype=np.uint8)
    trimap[outer == 0] = 0
    trimap[inner == 255] = 255
    return trimap


def soft_alpha(image_rgb: np.ndarray, trimap: np.ndarray) -> np.ndarray:
    """Return float alpha in [0,1] at full input resolution."""
    from pymatting import estimate_alpha_cf

    h, w = trimap.shape
    scale = min(1.0, MATTE_MAX_SIDE / max(h, w))
    if scale < 1.0:
        sw, sh = int(round(w * scale)), int(round(h * scale))
        img_s = cv2.resize(image_rgb, (sw, sh), interpolation=cv2.INTER_AREA)
        tri_s = cv2.resize(trimap, (sw, sh), interpolation=cv2.INTER_NEAREST)
    else:
        img_s, tri_s = image_rgb, trimap

    img_f = img_s.astype(np.float64) / 255.0
    tri_f = tri_s.astype(np.float64) / 255.0
    try:
        alpha_s = estimate_alpha_cf(img_f, tri_f)
    except (MemoryError, np.core._exceptions._ArrayMemoryError):  # type: ignore[attr-defined]
        from pymatting import estimate_alpha_lkm  # scalable, lower memory
        alpha_s = estimate_alpha_lkm(img_f, tri_f)
    alpha_s = np.clip(alpha_s, 0.0, 1.0)

    if scale < 1.0:
        alpha = cv2.resize(alpha_s, (w, h), interpolation=cv2.INTER_CUBIC)
        alpha = np.clip(alpha, 0.0, 1.0)
    else:
        alpha = alpha_s
    return alpha


def make_cutout(image_rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """RGBA uint8 = ORIGINAL RGB, alpha channel = matte. RGB is copied verbatim
    from the source; nothing is generated or recoloured."""
    a = (np.clip(alpha, 0.0, 1.0) * 255.0).round().astype(np.uint8)
    rgba = np.dstack([image_rgb, a])  # image_rgb untouched
    return rgba
