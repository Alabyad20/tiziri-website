"""Content-addressed cache. Key = hash(image content + parameters + pipeline &
contract versions). Re-analysing an unchanged input with the same options is a hit
and copies the stored sidecars back — no recomputation.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Any, Optional


def cache_key(image_sha256: str, params: dict[str, Any]) -> str:
    blob = json.dumps({"img": image_sha256, "params": params}, sort_keys=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def _entry_dir(cache_dir: str, key: str) -> Path:
    return Path(cache_dir) / key


def try_restore(cache_dir: str, key: str, out_dir: str) -> Optional[dict[str, Any]]:
    entry = _entry_dir(cache_dir, key)
    manifest = entry / "manifest.json"
    if not manifest.exists():
        return None
    result = json.loads(manifest.read_text(encoding="utf-8"))
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    # Copy every stored sidecar back into out_dir and repoint the result paths.
    arts = result.get("artifacts", {})
    for k, name in list(arts.items()):
        if not name:
            continue
        src = entry / name
        if not src.exists():
            return None  # incomplete cache entry -> treat as miss
        dst = os.path.join(out_dir, name)
        shutil.copyfile(src, dst)
        arts[k] = dst
    result["artifacts"] = arts
    result["cache_hit"] = True
    return result


def save(cache_dir: str, key: str, result: dict[str, Any]) -> None:
    """Store sidecars (by basename) + a manifest. Result artifact paths are
    rewritten to basenames in the stored manifest so restores are relocatable."""
    entry = _entry_dir(cache_dir, key)
    entry.mkdir(parents=True, exist_ok=True)
    stored = json.loads(json.dumps(result))  # deep copy
    arts = stored.get("artifacts", {})
    for k, abspath in list(arts.items()):
        if not abspath or not os.path.exists(abspath):
            arts[k] = ""
            continue
        name = os.path.basename(abspath)
        shutil.copyfile(abspath, entry / name)
        arts[k] = name
    stored["artifacts"] = arts
    stored["cache_hit"] = True
    (entry / "manifest.json").write_text(json.dumps(stored, indent=2), encoding="utf-8")
