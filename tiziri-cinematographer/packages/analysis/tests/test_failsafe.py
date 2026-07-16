"""Fail-safe behaviour: missing weights fall back, GPU-less runs on CPU, low
memory is caught before OOM, cancellation is honoured, and the SAM 2 backend
reports a recoverable error when its weights are absent."""
import io
import tempfile
import unittest

import numpy as np

from tiziri_analysis.runtime import (AnalysisError, Emitter, detect_device,
                                     require_memory)
from tiziri_analysis.segment import (GrabCutSegmenter, Sam2OnnxSegmenter,
                                     get_segmenter)


def emitter():
    return Emitter(io.StringIO())


class TestFailSafe(unittest.TestCase):
    def test_device_detects_cpu_or_gpu(self):
        d = detect_device()
        self.assertIn(d.name, ("cpu", "cuda"))
        self.assertIsInstance(d.onnx_providers, list)

    def test_grabcut_always_available(self):
        seg, warns = get_segmenter("grabcut", "/nonexistent", detect_device(), emitter())
        self.assertIsInstance(seg, GrabCutSegmenter)
        self.assertEqual(warns, [])

    def test_auto_falls_back_when_weights_missing(self):
        with tempfile.TemporaryDirectory() as d:
            seg, warns = get_segmenter("auto", d, detect_device(), emitter())
            self.assertIsInstance(seg, GrabCutSegmenter)
            self.assertTrue(any("SAM 2" in w for w in warns))

    def test_sam2_backend_missing_weights_is_recoverable(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(AnalysisError) as ctx:
                Sam2OnnxSegmenter(d, detect_device())
            self.assertEqual(ctx.exception.code, "weights_missing")
            self.assertTrue(ctx.exception.recoverable)

    def test_require_memory_fails_safely(self):
        with self.assertRaises(AnalysisError) as ctx:
            require_memory(10, min_free_gb=1e6)  # absurd requirement
        self.assertEqual(ctx.exception.code, "insufficient_memory")

    def test_cancellation_raises_before_heavy_work(self):
        from tiziri_analysis.contract import AnalyzeRequest
        from tiziri_analysis.pipeline import run_analysis
        with tempfile.TemporaryDirectory() as d:
            # image path need not exist; cancel fires before load
            req = AnalyzeRequest(image_path="x.png", rug_width_cm=300, rug_height_cm=200,
                                 out_dir=d, cache_dir=d)
            with self.assertRaises(AnalysisError) as ctx:
                run_analysis(req, emitter(), cancel=lambda: True)
            self.assertEqual(ctx.exception.code, "cancelled")


if __name__ == "__main__":
    unittest.main()
