"""Matting softness + the core fidelity invariant: analysis never alters the
original image, and the cutout's RGB is exactly the source."""
import hashlib
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

from tiziri_analysis.matte import build_trimap, make_cutout, soft_alpha
from tiziri_analysis.runtime import load_image_rgb


def synth_fringe():
    """A red rug on green with a genuinely SOFT edge: a blurred alpha ramp is used
    to composite fg over bg, so the image really contains partial-coverage pixels
    (a stand-in for fringe) that matting must recover."""
    h, w = 240, 320
    bg = np.full((h, w, 3), (30, 120, 40), np.float32)
    fg = np.full((h, w, 3), (200, 40, 40), np.float32)
    hard = np.zeros((h, w), np.float32)
    hard[60:180, 80:240] = 1.0
    alpha_true = cv2.GaussianBlur(hard, (0, 0), sigmaX=6.0)  # soft transition band
    img = (fg * alpha_true[..., None] + bg * (1 - alpha_true[..., None])).astype(np.uint8)
    mask = (hard * 255).astype(np.uint8)
    return img, mask


class TestMatte(unittest.TestCase):
    def test_alpha_is_soft_not_binary(self):
        img, mask = synth_fringe()
        trimap = build_trimap(mask, band_px=11)
        alpha = soft_alpha(img, trimap)
        self.assertGreater(float(alpha[120, 160]), 0.9)   # interior -> opaque
        self.assertLess(float(alpha[10, 10]), 0.1)        # far bg -> transparent
        # some pixels strictly between 0 and 1 -> genuinely soft
        mid = np.count_nonzero((alpha > 0.05) & (alpha < 0.95))
        self.assertGreater(mid, 20)

    def test_cutout_rgb_is_the_original(self):
        img, mask = synth_fringe()
        trimap = build_trimap(mask, band_px=11)
        alpha = soft_alpha(img, trimap)
        cutout = make_cutout(img, alpha)
        self.assertEqual(cutout.shape[2], 4)
        # RGB channels identical to source everywhere (no recolour / premultiply)
        self.assertTrue(np.array_equal(cutout[:, :, :3], img))


class TestImmutability(unittest.TestCase):
    def test_load_image_is_readonly_and_file_unchanged(self):
        img, _ = synth_fringe()
        with tempfile.TemporaryDirectory() as d:
            p = str(Path(d) / "orig.png")
            cv2.imwrite(p, cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
            before = hashlib.sha256(Path(p).read_bytes()).hexdigest()
            arr = load_image_rgb(p)
            self.assertFalse(arr.flags.writeable)  # in-process immutability
            with self.assertRaises(ValueError):
                arr[0, 0, 0] = 1  # cannot mutate
            after = hashlib.sha256(Path(p).read_bytes()).hexdigest()
            self.assertEqual(before, after)  # original file never touched


if __name__ == "__main__":
    unittest.main()
