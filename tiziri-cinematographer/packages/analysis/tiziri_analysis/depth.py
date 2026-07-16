"""Optional depth (Depth Anything V2 — SMALL, Apache-2.0), via ONNX. OFF by
default: top-down heroes rarely need it and the plane solve is primary. Only the
SMALL variant is permitted (Base/Large are CC-BY-NC). Depth is a MEASUREMENT of
the image used for parallax — it never regenerates a pixel. Missing weights are a
recoverable skip, not a failure.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from .runtime import AnalysisError, Device


class DepthAnythingV2Small:
    name = "depth_anything_v2_small"

    def __init__(self, models_dir: str, device: Device) -> None:
        import onnxruntime as ort  # noqa

        self._path = Path(models_dir) / "depth_anything_v2_small.onnx"
        if not self._path.exists():
            raise AnalysisError(
                "weights_missing",
                "Depth Anything V2-Small ONNX not found; run scripts/download_models.py",
                recoverable=True,
            )
        providers = [p for p in device.onnx_providers if p != "AzureExecutionProvider"] or ["CPUExecutionProvider"]
        self._sess = ort.InferenceSession(str(self._path), providers=providers)

    def infer(self, image_rgb: np.ndarray) -> np.ndarray:
        h, w = image_rgb.shape[:2]
        size = 518
        img = cv2.resize(image_rgb, (size, size), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], np.float32)
        std = np.array([0.229, 0.224, 0.225], np.float32)
        inp = ((img - mean) / std).transpose(2, 0, 1)[None]
        out = self._sess.run(None, {self._sess.get_inputs()[0].name: inp})[0]
        d = out[0, 0] if out.ndim == 4 else (out[0] if out.ndim == 3 else out)
        d = cv2.resize(d.astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
        d = (d - d.min()) / (d.ptp() + 1e-6)
        return (d * 255.0).astype(np.uint8)


def try_depth(models_dir: str, device: Device, image_rgb: np.ndarray) -> Optional[np.ndarray]:
    try:
        return DepthAnythingV2Small(models_dir, device).infer(image_rgb)
    except AnalysisError:
        return None
