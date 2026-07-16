"""Segmentation-readiness gate (fail-closed). Decides whether an analysis result
may proceed to rendering, from MEASURABLE diagnostics — never a vague confidence
score. A questionable mask is blocked with a calm, specific message telling the
user to refine the selection or recapture the Flat Hero.

Signals: rectangular-footprint plausibility (mask area vs the corner quad), rug-area
ratio, corner-margin (rug not cut off at the frame), alpha leakage outside the quad,
and reprojection error. `user_approved` (an interactive accept) resolves uncertainty.
"""
from __future__ import annotations

from typing import Any, Optional

import cv2
import numpy as np


def _quad_area(corners: np.ndarray) -> float:
    x = corners[:, 0]
    y = corners[:, 1]
    return float(abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))) / 2.0)


def assess(
    mask: np.ndarray,
    alpha: np.ndarray,
    corners: np.ndarray,
    reproj_rms: float,
    reproj_target: float,
    image_shape: tuple[int, int],
    user_approved: bool = False,
) -> dict[str, Any]:
    h, w = image_shape
    mask_area = float((mask > 127).sum())
    quad_area = _quad_area(np.asarray(corners, dtype=np.float64))

    rug_area_ratio = mask_area / (h * w)
    rect_ratio = (mask_area / quad_area) if quad_area > 0 else 0.0

    # corner margin: a corner sitting on the frame edge => rug cut off / no margin
    m = 0.005 * max(h, w)
    corners_margin_ok = bool(
        np.all(corners[:, 0] > m) and np.all(corners[:, 0] < w - m)
        and np.all(corners[:, 1] > m) and np.all(corners[:, 1] < h - m)
    )

    # alpha leakage outside the (slightly grown, for fringe) corner quad
    quad_mask = np.zeros((h, w), np.uint8)
    cv2.fillConvexPoly(quad_mask, corners.astype(np.int32), 255)
    k = max(15, int(0.015 * max(h, w))) | 1  # grow to allow fringe beyond the quad
    quad_mask = cv2.dilate(quad_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    a = np.clip(alpha, 0.0, 1.0)
    total = float(a.sum()) or 1.0
    leak_ratio = float(a[quad_mask == 0].sum()) / total

    rectangular_plausible = 0.80 <= rect_ratio <= 1.20
    rug_area_ok = 0.08 <= rug_area_ratio <= 0.92
    leakage_ok = leak_ratio <= 0.08
    reproj_ok = reproj_rms <= reproj_target

    mask_ok = rectangular_plausible and rug_area_ok and leakage_ok and corners_margin_ok

    signals = {
        "rect_ratio": round(rect_ratio, 3),
        "rectangular_plausible": rectangular_plausible,
        "rug_area_ratio": round(rug_area_ratio, 3),
        "rug_area_ok": rug_area_ok,
        "corners_margin_ok": corners_margin_ok,
        "alpha_leak_ratio": round(leak_ratio, 3),
        "leakage_ok": leakage_ok,
        "reprojection_ok": reproj_ok,
        "user_approved": user_approved,
    }

    if user_approved:
        return _report(True, "READY", "Approved by user; proceeding.", signals)
    if mask_ok and reproj_ok:
        return _report(True, "READY", "All segmentation and geometry checks passed.", signals)
    if not mask_ok:
        reasons = []
        if not rectangular_plausible:
            reasons.append("the selection isn't a clean rectangle")
        if not rug_area_ok:
            reasons.append("the selected area looks wrong for a rug")
        if not leakage_ok:
            reasons.append("part of the selection spills onto the background")
        if not corners_margin_ok:
            reasons.append("the rug appears cut off at the frame edge")
        msg = "Refine the selection — " + "; ".join(reasons) + ". Click inside the rug, or click any background that was picked up."
        return _report(False, "REVIEW", msg, signals)
    # mask looks fine but geometry fails -> the rug isn't flat/square to the camera
    return _report(
        False, "RECAPTURE",
        "The selection looks right, but the rug isn't flat and square to the camera "
        "(reprojection is high). Recapture as a true top-down Flat Hero with the rug laid flat.",
        signals,
    )


def _report(ready: bool, decision: str, message: str, signals: dict[str, Any]) -> dict[str, Any]:
    return {"production_ready": ready, "decision": decision, "message": message, "signals": signals}


def blocked_placeholder(reason: str) -> Optional[dict[str, Any]]:
    return {"production_ready": False, "decision": "REVIEW", "message": reason, "signals": {}}
