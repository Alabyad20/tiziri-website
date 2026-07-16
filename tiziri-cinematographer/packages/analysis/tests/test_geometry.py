"""Geometry solver correctness, independent of segmentation quality: on a KNOWN
rug quad (perfect mask), the homography must fit and reprojection must be well
below target, and refined corners must land near the truth."""
import unittest

import cv2
import numpy as np

from tiziri_analysis.geometry import (REPROJECTION_TARGET_PX, detect_corners,
                                      order_corners, refine_corners_subpixel,
                                      solve_homography)


def synth_rug(true_corners):
    """A filled quad (contrasting) → mask + a textured gray for sub-pixel corners."""
    h, w = 900, 1200
    mask = np.zeros((h, w), np.uint8)
    cv2.fillConvexPoly(mask, true_corners.astype(np.int32), 255)
    gray = np.full((h, w), 40, np.uint8)
    gray[mask > 0] = 200
    # add a little interior texture so cornerSubPix has gradients
    noise = (np.random.default_rng(0).random((h, w)) * 20).astype(np.uint8)
    gray = cv2.add(gray, cv2.bitwise_and(noise, mask))
    return mask, gray


class TestGeometry(unittest.TestCase):
    def test_reprojection_below_target_on_perfect_mask(self):
        true_corners = np.array([[200, 150], [1000, 210], [980, 760], [230, 700]], np.float64)
        mask, gray = synth_rug(true_corners)
        result, rms = solve_homography(mask, gray, w_cm=300.0, h_cm=200.0)
        self.assertLess(rms, REPROJECTION_TARGET_PX, f"reprojection rms={rms}")
        self.assertTrue(result["reprojection_rms_px"] <= REPROJECTION_TARGET_PX)
        # px-per-cm is positive and sane
        self.assertGreater(result["px_per_cm"], 0)

    def test_detected_corners_near_truth(self):
        true_corners = np.array([[200, 150], [1000, 210], [980, 760], [230, 700]], np.float64)
        mask, gray = synth_rug(true_corners)
        corners = refine_corners_subpixel(gray, detect_corners(mask))
        ordered_truth = order_corners(true_corners)
        err = np.linalg.norm(corners - ordered_truth, axis=1)
        self.assertLess(float(err.max()), 4.0, f"corner error px={err}")

    def test_axis_aligned_rectangle_is_near_zero(self):
        true_corners = np.array([[100, 100], [900, 100], [900, 700], [100, 700]], np.float64)
        mask, gray = synth_rug(true_corners)
        _, rms = solve_homography(mask, gray, w_cm=250.0, h_cm=180.0)
        self.assertLess(rms, 1.0)


if __name__ == "__main__":
    unittest.main()
