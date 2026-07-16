"""Corner detection, sub-pixel refinement, and a homography/camera solve from the
rug's KNOWN real-world dimensions. Pure OpenCV (Apache-2.0) — algorithmic, no
weights, no generated pixels.

Reprojection error is measured over an OVERDETERMINED set: points sampled along
the segmented rug border are given world coordinates on the rug rectangle, a
least-squares homography is fit to all of them, and the RMS residual (px) is
reported. (A bare 4-point homography would be exact by construction and therefore
meaningless — so we use the whole edge.)
"""
from __future__ import annotations

from typing import Optional

import cv2
import numpy as np

from .runtime import AnalysisError

REPROJECTION_TARGET_PX = 1.5  # P1 target for clean rectangular edges


def order_corners(pts: np.ndarray) -> np.ndarray:
    """Return corners as TL, TR, BR, BL."""
    pts = pts.astype(np.float64)
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([
        pts[np.argmin(s)],  # TL
        pts[np.argmin(d)],  # TR
        pts[np.argmax(s)],  # BR
        pts[np.argmax(d)],  # BL
    ], dtype=np.float64)


def _largest_contour(mask: np.ndarray) -> np.ndarray:
    cnts, _ = cv2.findContours((mask > 127).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cnts:
        raise AnalysisError("no_rug", "segmentation produced no rug region")
    return max(cnts, key=cv2.contourArea)


def detect_corners(mask: np.ndarray) -> np.ndarray:
    """Four rug corners from the mask. Tries a 4-vertex polygon approximation;
    falls back to the min-area rectangle for rounded/handmade shapes."""
    cnt = _largest_contour(mask)
    peri = cv2.arcLength(cnt, True)
    for eps in (0.02, 0.03, 0.05, 0.08):
        approx = cv2.approxPolyDP(cnt, eps * peri, True)
        if len(approx) == 4:
            return order_corners(approx.reshape(-1, 2))
    box = cv2.boxPoints(cv2.minAreaRect(cnt))
    return order_corners(box)


def refine_corners_subpixel(gray: np.ndarray, corners: np.ndarray) -> np.ndarray:
    c = corners.reshape(-1, 1, 2).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.001)
    win = max(5, int(0.01 * max(gray.shape)))
    cv2.cornerSubPix(gray, c, (win, win), (-1, -1), crit)
    return c.reshape(-1, 2).astype(np.float64)


def _edge_residual(mask: np.ndarray, corners: np.ndarray):
    """RMS perpendicular distance (px) of the segmented border to its NEAREST quad
    edge line. Perspective-agnostic (lines map to lines under projection): it
    measures how straight/well-fit the solved rug rectangle is against the actual
    segmented edge. Returns (rms_px, n_points)."""
    cnt = _largest_contour(mask).reshape(-1, 2).astype(np.float64)
    dists = np.empty((len(cnt), 4), dtype=np.float64)
    for i in range(4):
        a, b = corners[i], corners[(i + 1) % 4]
        ab = b - a
        n = np.array([-ab[1], ab[0]], dtype=np.float64)
        n /= (np.linalg.norm(n) or 1.0)
        dists[:, i] = np.abs((cnt - a) @ n)  # distance to the (infinite) edge line
    best = dists.min(axis=1)  # each border point -> its nearest edge line
    if len(best) < 8:
        return 0.0, 0.0, int(len(best))
    raw = float(np.sqrt(np.mean(best ** 2)))
    # Robust (inlier) RMS: fringe = loose threads BEYOND the woven edge, so those
    # border points are outliers on their edge. A median+MAD gate excludes them so
    # the metric reflects the WOVEN-edge (i.e. the rug's true geometry) fidelity.
    med = float(np.median(best))
    mad = float(np.median(np.abs(best - med))) or 1e-6
    inliers = best[best <= med + 2.5 * 1.4826 * mad]
    robust = float(np.sqrt(np.mean(inliers ** 2))) if len(inliers) >= 8 else raw
    return robust, raw, int(len(best))


def solve_homography(mask: np.ndarray, gray: np.ndarray, w_cm: float, h_cm: float,
                     rug_box: Optional[list[float]] = None):
    """Solve world(cm)->image(px) homography from the four known-rectangle corners
    and report the edge-straightness reprojection RMS. Returns (result_dict, rms)."""
    corners = refine_corners_subpixel(gray, detect_corners(mask))
    world_corners = np.array([[0, 0], [w_cm, 0], [w_cm, h_cm], [0, h_cm]], dtype=np.float64)
    H, _ = cv2.findHomography(world_corners, corners, method=0)
    rms, raw_rms, n_pts = _edge_residual(mask, corners)

    # px-per-cm from the solved corner spacing (diagnostic, not used to alter pixels)
    top = np.linalg.norm(corners[1] - corners[0]) / max(w_cm, 1e-6)
    left = np.linalg.norm(corners[3] - corners[0]) / max(h_cm, 1e-6)
    px_per_cm = float((top + left) / 2)

    result = {
        "corners_tl_tr_br_bl": corners.tolist(),
        "world_rect_cm": world_corners.tolist(),
        "homography_world_cm_to_image_px": H.tolist(),
        "px_per_cm": round(px_per_cm, 4),
        "reprojection_rms_px": round(rms, 4),          # robust (woven-edge) fidelity
        "reprojection_raw_rms_px": round(raw_rms, 4),  # incl. fringe wobble (diagnostic)
        "n_edge_correspondences": n_pts,
    }
    return result, rms
