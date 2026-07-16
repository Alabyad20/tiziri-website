"""End-to-end pipeline on a small clean synthetic rug, and the content cache:
re-running an unchanged input is a hit that restores every sidecar."""
import io
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

from tiziri_analysis.contract import AnalyzeRequest
from tiziri_analysis.pipeline import run_analysis
from tiziri_analysis.runtime import Emitter


def write_synth_rug(path):
    """A high-contrast rectangular 'rug' on a plain background — GrabCut-friendly."""
    h, w = 500, 640
    img = np.full((h, w, 3), (25, 110, 35), np.uint8)  # green ground
    cv2.rectangle(img, (120, 90), (520, 410), (210, 205, 195), -1)  # pale rug
    # a little pattern so it isn't flat
    cv2.rectangle(img, (200, 160), (440, 340), (60, 150, 150), 14)
    cv2.imwrite(path, cv2.cvtColor(img, cv2.COLOR_RGB2BGR))


class TestCachePipeline(unittest.TestCase):
    def test_pipeline_then_cache_hit(self):
        with tempfile.TemporaryDirectory() as d:
            img_path = str(Path(d) / "rug.png")
            write_synth_rug(img_path)
            out1, out2 = str(Path(d) / "o1"), str(Path(d) / "o2")
            cache = str(Path(d) / "cache")
            base = dict(image_path=img_path, rug_width_cm=300, rug_height_cm=200, cache_dir=cache)

            r1 = run_analysis(AnalyzeRequest(out_dir=out1, **base), Emitter(io.StringIO()))
            self.assertTrue(r1["ok"])
            self.assertFalse(r1["cache_hit"])
            for key in ("mask", "alpha", "cutout", "corners", "camera", "preview"):
                self.assertTrue(Path(r1["artifacts"][key]).exists(), key)

            # Second run, fresh out dir, same input+params -> cache hit, sidecars restored.
            r2 = run_analysis(AnalyzeRequest(out_dir=out2, **base), Emitter(io.StringIO()))
            self.assertTrue(r2["cache_hit"])
            self.assertTrue(Path(r2["artifacts"]["cutout"]).exists())
            self.assertEqual(r1["image_sha256"], r2["image_sha256"])

    def test_cutout_alpha_channel_present(self):
        with tempfile.TemporaryDirectory() as d:
            img_path = str(Path(d) / "rug.png")
            write_synth_rug(img_path)
            r = run_analysis(
                AnalyzeRequest(image_path=img_path, rug_width_cm=300, rug_height_cm=200,
                               out_dir=str(Path(d) / "o"), cache_dir=str(Path(d) / "c")),
                Emitter(io.StringIO()),
            )
            cutout = cv2.imread(r["artifacts"]["cutout"], cv2.IMREAD_UNCHANGED)
            self.assertEqual(cutout.shape[2], 4)  # RGBA


if __name__ == "__main__":
    unittest.main()
