"""Interactive segmentation fallback: positive/negative clicks, preview-only,
prompt-driven cache invalidation, invalid prompts, and reset/undo semantics."""
import io
import os
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

from tiziri_analysis.cache import cache_key
from tiziri_analysis.contract import AnalyzeRequest
from tiziri_analysis.pipeline import run_analysis
from tiziri_analysis.runtime import AnalysisError, Emitter
from tiziri_analysis.segment import GrabCutSegmenter

MODELS = os.environ.get("TIZIRI_MODELS_DIR",
                        str(Path(__file__).resolve().parent.parent / "models"))


def two_blobs():
    """Two separated bright rectangles A (left) and B (right) on a dark ground."""
    img = np.full((400, 600, 3), (30, 30, 30), np.uint8)
    cv2.rectangle(img, (60, 120), (240, 300), (205, 205, 205), -1)   # A
    cv2.rectangle(img, (360, 120), (540, 300), (205, 205, 205), -1)  # B
    return img


class TestInteractivePlumbing(unittest.TestCase):
    def test_positive_selects_and_negative_removes_adjacent(self):
        img = two_blobs()
        seg = GrabCutSegmenter()
        # positive click inside A, negative click inside B -> mask is A, not B
        mask = seg.segment(img, None, points=[[150, 210, 1], [450, 210, 0]])
        self.assertGreater(int(mask[210, 150]), 127, "A (positive) should be selected")
        self.assertLess(int(mask[210, 450]), 128, "B (negative) should be removed")

    def test_invalid_prompt_is_structured_error(self):
        with tempfile.TemporaryDirectory() as d:
            img_path = str(Path(d) / "r.png")
            cv2.imwrite(img_path, two_blobs())
            req = AnalyzeRequest(image_path=img_path, rug_width_cm=200, rug_height_cm=120,
                                 out_dir=str(Path(d) / "o"), cache_dir=str(Path(d) / "c"),
                                 segmenter="grabcut", points=[[1, 2]])  # malformed
            with self.assertRaises(AnalysisError) as ctx:
                run_analysis(req, Emitter(io.StringIO()))
            self.assertEqual(ctx.exception.code, "bad_prompt")

    def test_preview_only_returns_overlay_and_mask(self):
        with tempfile.TemporaryDirectory() as d:
            img_path = str(Path(d) / "r.png")
            cv2.imwrite(img_path, two_blobs())
            req = AnalyzeRequest(image_path=img_path, rug_width_cm=200, rug_height_cm=120,
                                 out_dir=str(Path(d) / "o"), cache_dir=str(Path(d) / "c"),
                                 segmenter="grabcut", points=[[150, 210, 1]], preview_only=True)
            res = run_analysis(req, Emitter(io.StringIO()))
            self.assertTrue(res.get("preview_only"))
            self.assertTrue(Path(res["artifacts"]["mask"]).exists())
            self.assertTrue(Path(res["artifacts"]["preview"]).exists())


class TestPromptCacheAndUiSemantics(unittest.TestCase):
    def _key(self, points):
        return cache_key("sha", {"segmenter": "sam2", "points": points, "rug_box": None,
                                 "w_cm": 300, "h_cm": 200, "pipeline": "p", "contract": 1,
                                 "with_depth": False})

    def test_cache_invalidates_when_prompt_changes(self):
        self.assertNotEqual(self._key([[10, 10, 1]]), self._key([[10, 10, 1], [20, 20, 0]]))

    def test_reset_and_undo_change_the_key(self):
        full = [[10, 10, 1], [20, 20, 0]]
        self.assertNotEqual(self._key(full), self._key(full[:-1]))   # undo last click
        self.assertNotEqual(self._key(full), self._key(None))        # reset -> auto


@unittest.skipUnless(Path(MODELS, "sam2.1_hiera_tiny.pt").exists(), "SAM 2 weights not present")
class TestSam2Interactive(unittest.TestCase):
    def test_positive_click_produces_nonempty_mask(self):
        from tiziri_analysis.runtime import detect_device
        from tiziri_analysis.sam2_backend import Sam2Segmenter
        seg = Sam2Segmenter(MODELS, detect_device())
        mask = seg.segment(two_blobs(), None, points=[[150, 210, 1]])
        self.assertGreater(int((mask > 127).sum()), 500)
        self.assertGreater(int(mask[210, 150]), 127)  # the clicked blob is selected


if __name__ == "__main__":
    unittest.main()
