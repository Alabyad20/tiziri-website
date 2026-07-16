"""Cast-shadow layer. A heuristic that identifies the darkened background band
around the rug — used as an independent CG layer later. It is NEVER part of the
rug's own pixels; it only marks where the background is in shadow.
"""
from __future__ import annotations

import cv2
import numpy as np


def estimate_shadow(image_rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Return an 8-bit shadow strength map on the background near the rug."""
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    rug = (mask > 127).astype(np.uint8)
    k = max(9, (min(mask.shape) // 40) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    near = cv2.dilate(rug, kernel, iterations=3)
    band = ((near == 1) & (rug == 0)).astype(bool)
    if band.sum() < 50:
        return np.zeros(mask.shape, dtype=np.uint8)

    far_bg = (near == 0)
    ref = float(np.median(gray[far_bg])) if far_bg.sum() > 50 else float(np.median(gray[band]))
    # Shadow = background pixels in the band noticeably darker than the reference.
    darkness = np.clip((ref - gray.astype(np.float32)) / max(ref, 1.0), 0.0, 1.0)
    shadow = np.zeros(mask.shape, dtype=np.float32)
    shadow[band] = darkness[band]
    shadow = cv2.GaussianBlur(shadow, (0, 0), sigmaX=max(2.0, k / 6.0))
    return (np.clip(shadow, 0.0, 1.0) * 255.0).astype(np.uint8)
