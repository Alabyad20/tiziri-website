"""SAM 2 segmentation backend (official Apache-2.0 `sam2` package + torch).

Isolated here so torch stays an OPTIONAL dependency: if torch / sam2 / the
checkpoint are missing, construction raises a RECOVERABLE error and the pipeline
falls back to GrabCut. SAM 2 only *labels* which pixels are the rug — it never
generates or edits a pixel.

Prompting strategy for "the ONE rug on the floor, not the stacked background
rugs": a positive point near the lower-centre (where a floor rug sits) plus
negative points in the top corners (where background clutter/rolled rugs sit),
unless an explicit rug_box is supplied.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import numpy as np

from .runtime import AnalysisError, Device

# tiny (Apache-2.0). Config name is resolved from the sam2 package's config dir.
_CHECKPOINT = "sam2.1_hiera_tiny.pt"
_CONFIG = "configs/sam2.1/sam2.1_hiera_t.yaml"


class Sam2Segmenter:
    name = "sam2"

    def __init__(self, models_dir: str, device: Device) -> None:
        ckpt = Path(models_dir) / _CHECKPOINT
        if not ckpt.exists():
            raise AnalysisError(
                "weights_missing",
                f"SAM 2 checkpoint not found ({ckpt}); run scripts/download_models.py",
                recoverable=True,
            )
        try:
            import torch  # noqa
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor
        except Exception as e:
            raise AnalysisError("sam2_import", f"sam2/torch not importable: {e}", recoverable=True)

        try:
            dev = "cuda" if device.gpu else "cpu"
            model = build_sam2(_CONFIG, str(ckpt), device=dev)
            self._predictor = SAM2ImagePredictor(model)
        except Exception as e:
            raise AnalysisError("sam2_build", f"could not build SAM 2: {e}", recoverable=True)
        # Optional on-disk image-embedding cache path (set by the pipeline for fast
        # interactive refine); None = always embed fresh.
        self._embed_cache: Optional[str] = None

    def segment(self, image_rgb: np.ndarray, rug_box: Optional[list[float]],
                points: Optional[list[list[float]]] = None) -> np.ndarray:
        try:
            return self._run(image_rgb, rug_box, points, self._embed_cache)
        except AnalysisError:
            raise
        except Exception as e:
            raise AnalysisError("sam2_runtime", f"SAM 2 inference failed: {e}", recoverable=True)

    def set_image_cached(self, image_rgb: np.ndarray, cache_path: Optional[str]) -> None:
        """set_image is the expensive step (~5s CPU). For interactive refine, cache
        the image embedding on disk keyed by the caller so subsequent clicks only
        run the cheap decoder. Falls back to a normal set_image on any mismatch."""
        import torch
        if cache_path and Path(cache_path).exists():
            try:
                blob = torch.load(cache_path, map_location="cpu", weights_only=False)
                self._predictor._features = blob["features"]
                self._predictor._orig_hw = blob["orig_hw"]
                self._predictor._is_image_set = True
                self._predictor._is_batch = False
                return
            except Exception:
                pass  # fall through to a fresh embed
        self._predictor.set_image(image_rgb)
        if cache_path:
            try:
                Path(cache_path).parent.mkdir(parents=True, exist_ok=True)
                torch.save(
                    {"features": self._predictor._features, "orig_hw": self._predictor._orig_hw},
                    cache_path,
                )
            except Exception:
                pass

    def _run(self, image_rgb: np.ndarray, rug_box: Optional[list[float]],
             points: Optional[list[list[float]]], embed_cache: Optional[str] = None) -> np.ndarray:
        h, w = image_rgb.shape[:2]
        self.set_image_cached(image_rgb, embed_cache)

        if points:
            coords = np.array([[p[0], p[1]] for p in points], dtype=np.float32)
            labels = np.array([1 if p[2] >= 0.5 else 0 for p in points], dtype=np.int32)
            kw = {"point_coords": coords, "point_labels": labels, "multimask_output": False}
            if rug_box is not None:
                kw["box"] = np.array(rug_box, dtype=np.float32)
            masks, scores, _ = self._predictor.predict(**kw)
        elif rug_box is not None:
            masks, scores, _ = self._predictor.predict(
                box=np.array(rug_box, dtype=np.float32), multimask_output=False
            )
        else:
            # Auto: positive points across the lower-centre isolate the ONE floor rug
            # (top-of-frame backdrop/stacked rugs excluded). Strongly-patterned rugs
            # may still ragged-edge → the interactive click path is the fix.
            pts = np.array([
                [w * 0.50, h * 0.62], [w * 0.32, h * 0.58], [w * 0.68, h * 0.58],
                [w * 0.50, h * 0.82], [w * 0.40, h * 0.72], [w * 0.60, h * 0.72],
            ], dtype=np.float32)
            masks, scores, _ = self._predictor.predict(
                point_coords=pts, point_labels=np.ones(len(pts), dtype=np.int32),
                multimask_output=True,
            )

        best = int(np.argmax(scores))
        m = masks[best]
        if m.ndim == 3:
            m = m[0]
        mask = (m > 0).astype(np.uint8) * 255
        from .segment import _clean_mask  # local import avoids a cycle at import time
        return _clean_mask(mask)
