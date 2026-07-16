"""Cross-cutting runtime: structured errors, the stdout progress protocol, device
detection with fail-safe checks, and immutable-image IO helpers.
"""
from __future__ import annotations

import hashlib
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import numpy as np


# ----------------------------- errors -----------------------------

class AnalysisError(Exception):
    """A structured, reportable error. `recoverable` means the caller may retry
    with different options (e.g. weights missing -> fall back to classical)."""

    def __init__(self, code: str, message: str, recoverable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.recoverable = recoverable


# ----------------------------- progress protocol -----------------------------

class Emitter:
    """Writes line-delimited JSON events to stdout; logs go to stderr too."""

    def __init__(self, stream: Any = None) -> None:
        self._out = stream if stream is not None else sys.stdout

    def _write(self, obj: dict[str, Any]) -> None:
        self._out.write(json.dumps(obj) + "\n")
        self._out.flush()

    def progress(self, stage: str, pct: float) -> None:
        self._write({"type": "progress", "stage": stage, "pct": round(float(pct), 4)})

    def log(self, message: str, level: str = "info") -> None:
        self._write({"type": "log", "level": level, "message": message})
        sys.stderr.write(f"[{level}] {message}\n")
        sys.stderr.flush()

    def result(self, payload: dict[str, Any]) -> None:
        self._write(payload)

    def error(self, err: AnalysisError) -> None:
        self._write({
            "type": "error", "code": err.code, "message": err.message,
            "recoverable": err.recoverable,
        })


class Stopwatch:
    def __init__(self) -> None:
        self._t: dict[str, float] = {}

    def time(self, name: str):
        sw = self

        class _Ctx:
            def __enter__(self_inner):
                self_inner._s = time.perf_counter()
                return self_inner

            def __exit__(self_inner, *a):
                sw._t[name] = (time.perf_counter() - self_inner._s) * 1000.0
                return False

        return _Ctx()

    @property
    def timings(self) -> dict[str, float]:
        return {k: round(v, 2) for k, v in self._t.items()}


# ----------------------------- device / fail-safe -----------------------------

@dataclass
class Device:
    name: str          # "cuda" | "cpu"
    onnx_providers: list[str]
    total_ram_gb: float
    gpu: bool


def detect_device() -> Device:
    providers: list[str] = []
    try:
        import onnxruntime as ort  # noqa
        providers = list(ort.get_available_providers())
    except Exception:
        providers = []
    gpu = any(p in providers for p in ("CUDAExecutionProvider", "DmlExecutionProvider"))
    try:
        import psutil  # optional
        ram = psutil.virtual_memory().total / 1e9
    except Exception:
        ram = _ram_gb_fallback()
    return Device(name="cuda" if gpu else "cpu", onnx_providers=providers, total_ram_gb=round(ram, 1), gpu=gpu)


def _ram_gb_fallback() -> float:
    try:
        import os
        if hasattr(os, "sysconf"):
            return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1e9
    except Exception:
        pass
    return 0.0


def require_memory(px: int, min_free_gb: float = 1.0, device: Optional[Device] = None) -> None:
    """Fail SAFELY before a large allocation rather than OOM-crashing mid-run."""
    dev = device or detect_device()
    if dev.total_ram_gb and dev.total_ram_gb < min_free_gb:
        raise AnalysisError(
            "insufficient_memory",
            f"need ~{min_free_gb}GB, machine reports {dev.total_ram_gb}GB",
            recoverable=False,
        )


# ----------------------------- immutable image IO -----------------------------

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_image_rgb(path: str) -> np.ndarray:
    """Load the original as an immutable RGB uint8 array. We never write back to
    `path`; every output is a separate sidecar file."""
    import cv2
    p = Path(path)
    if not p.exists():
        raise AnalysisError("missing_input", f"image not found: {path}")
    data = np.fromfile(str(p), dtype=np.uint8)  # handles non-ASCII paths on Windows
    bgr = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if bgr is None:
        raise AnalysisError("bad_input", f"could not decode image: {path}")
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    rgb.setflags(write=False)  # enforce immutability in-process
    return rgb


def save_png(path: str, img: np.ndarray) -> None:
    import cv2
    if img.ndim == 3 and img.shape[2] == 4:
        out = cv2.cvtColor(img, cv2.COLOR_RGBA2BGRA)
    elif img.ndim == 3:
        out = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    else:
        out = img
    ok, buf = cv2.imencode(".png", out)
    if not ok:
        raise AnalysisError("write_failed", f"could not encode {path}")
    buf.tofile(path)  # non-ASCII safe


def write_json(path: str, obj: dict[str, Any]) -> None:
    Path(path).write_text(json.dumps(obj, indent=2), encoding="utf-8")
