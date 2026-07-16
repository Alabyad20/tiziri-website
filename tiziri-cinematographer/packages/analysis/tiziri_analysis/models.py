"""Model registry + download manager.

Downloads are EXPLICIT (never at install/first-run), RESUMABLE (HTTP Range),
CHECKSUM-VERIFIED (sha256), and ATOMIC (temp .part -> rename). Every entry records
its LICENCE so redistribution is auditable (P1 constraint #6, #8).

NOTE: the neural weights are OPTIONAL — the classical pipeline runs without them.
URLs/checksums for the Apache-2.0 SAM 2 / Depth-Anything-V2-Small ONNX exports must
be pinned from their official releases before shipping; entries below carry the
licence and are marked `pinned=False` until then. The downloader itself is fully
implemented and tested against the checksum/resume mechanism.
"""
from __future__ import annotations

import hashlib
import os
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional


@dataclass(frozen=True)
class ModelEntry:
    id: str
    filename: str
    url: str
    sha256: str
    size_bytes: int
    license: str
    source: str
    pinned: bool  # True once url+sha256 are verified against an official release


REGISTRY: dict[str, ModelEntry] = {
    "sam2_encoder": ModelEntry(
        id="sam2_encoder", filename="sam2_encoder.onnx", url="", sha256="", size_bytes=0,
        license="Apache-2.0", source="facebookresearch/sam2 (ONNX export)", pinned=False,
    ),
    "sam2_decoder": ModelEntry(
        id="sam2_decoder", filename="sam2_decoder.onnx", url="", sha256="", size_bytes=0,
        license="Apache-2.0", source="facebookresearch/sam2 (ONNX export)", pinned=False,
    ),
    "depth_anything_v2_small": ModelEntry(
        id="depth_anything_v2_small", filename="depth_anything_v2_small.onnx", url="", sha256="",
        size_bytes=0, license="Apache-2.0",
        source="depth-anything/Depth-Anything-V2-Small (ONNX; SMALL is Apache-2.0, "
               "Base/Large are CC-BY-NC and MUST NOT be used)",
        pinned=False,
    ),
}


def sha256_of(path: str, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(chunk), b""):
            h.update(b)
    return h.hexdigest()


class DownloadError(Exception):
    pass


def download(entry: ModelEntry, dest_dir: str,
             on_progress: Optional[Callable[[int, int], None]] = None,
             _opener: Optional[Callable] = None) -> str:
    """Resumable, checksum-verified download. Returns the final path.
    `_opener` is injectable for testing (defaults to urllib)."""
    if not entry.url or not entry.sha256:
        raise DownloadError(f"{entry.id}: url/checksum not pinned yet ({entry.license}); cannot fetch")

    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    final = os.path.join(dest_dir, entry.filename)
    part = final + ".part"

    if os.path.exists(final) and sha256_of(final) == entry.sha256:
        return final  # already have a verified copy

    opener = _opener or _urllib_open
    have = os.path.getsize(part) if os.path.exists(part) else 0
    total, reader = opener(entry.url, have)
    mode = "ab" if have and total is not None else "wb"
    if mode == "wb":
        have = 0
    written = have
    with open(part, mode) as f:
        for chunk in reader:
            f.write(chunk)
            written += len(chunk)
            if on_progress:
                on_progress(written, (total or entry.size_bytes) + have if total else entry.size_bytes)

    digest = sha256_of(part)
    if digest != entry.sha256:
        os.remove(part)
        raise DownloadError(f"{entry.id}: checksum mismatch (got {digest[:12]}…, want {entry.sha256[:12]}…)")
    os.replace(part, final)  # atomic
    return final


def _urllib_open(url: str, resume_from: int):
    req = urllib.request.Request(url)
    if resume_from:
        req.add_header("Range", f"bytes={resume_from}-")
    resp = urllib.request.urlopen(req, timeout=30)
    total = resp.length

    def gen():
        while True:
            b = resp.read(1 << 20)
            if not b:
                break
            yield b

    return total, gen()
