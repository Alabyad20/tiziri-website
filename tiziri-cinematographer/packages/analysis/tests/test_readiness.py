"""Fail-closed readiness gate: clean → READY, leaky/implausible → REVIEW,
good-mask-but-bad-geometry → RECAPTURE, user approval → READY, cut-off → REVIEW."""
import unittest

import cv2
import numpy as np

from tiziri_analysis.readiness import assess

H, W = 900, 1200
TARGET = 1.5


def rect_mask(corners):
    m = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(m, corners.astype(np.int32), 255)
    return m


CLEAN = np.array([[200, 150], [1000, 150], [1000, 750], [200, 750]], np.float64)


class TestReadiness(unittest.TestCase):
    def test_clean_is_ready(self):
        m = rect_mask(CLEAN)
        r = assess(m, m / 255.0, CLEAN, 0.6, TARGET, (H, W))
        self.assertTrue(r["production_ready"])
        self.assertEqual(r["decision"], "READY")

    def test_good_mask_bad_geometry_is_recapture(self):
        m = rect_mask(CLEAN)
        r = assess(m, m / 255.0, CLEAN, 40.0, TARGET, (H, W))  # reproj >> target
        self.assertFalse(r["production_ready"])
        self.assertEqual(r["decision"], "RECAPTURE")

    def test_leak_outside_quad_is_review(self):
        m = rect_mask(CLEAN)
        m[780:860, 300:900] = 255  # a blob well outside the corner quad -> leak + area
        r = assess(m, m / 255.0, CLEAN, 0.6, TARGET, (H, W))
        self.assertFalse(r["production_ready"])
        self.assertEqual(r["decision"], "REVIEW")

    def test_rug_cut_off_at_frame_is_review(self):
        corners = np.array([[3, 150], [1000, 150], [1000, 750], [3, 750]], np.float64)  # x≈0 → cut off
        m = rect_mask(corners)
        r = assess(m, m / 255.0, corners, 0.6, TARGET, (H, W))
        self.assertFalse(r["production_ready"])
        self.assertEqual(r["decision"], "REVIEW")
        self.assertFalse(r["signals"]["corners_margin_ok"])

    def test_user_approval_overrides_to_ready(self):
        m = rect_mask(CLEAN)
        r = assess(m, m / 255.0, CLEAN, 40.0, TARGET, (H, W), user_approved=True)
        self.assertTrue(r["production_ready"])
        self.assertEqual(r["decision"], "READY")


if __name__ == "__main__":
    unittest.main()
