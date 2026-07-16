"""The stable JSON/file contract between the Electron shell and this sidecar.

Protocol (line-delimited JSON on stdout):
  {"type":"progress","stage":str,"pct":float}
  {"type":"log","level":str,"message":str}
  {"type":"result", ...AnalysisResult}
  {"type":"error","code":str,"message":str,"recoverable":bool}

The request is a single JSON object read from stdin (or --request-file). All paths
are absolute. The contract is versioned; `CONTRACT_VERSION` bumps on shape changes.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Literal, Optional

CONTRACT_VERSION = 1

Segmenter = Literal["auto", "sam2", "grabcut"]


@dataclass(frozen=True)
class AnalyzeRequest:
    image_path: str
    rug_width_cm: float
    rug_height_cm: float
    out_dir: str
    cache_dir: str
    segmenter: Segmenter = "auto"
    with_depth: bool = False
    # A rough box hint (x0,y0,x1,y1 in px) for where the rug is; optional.
    rug_box: Optional[list[float]] = None
    contract_version: int = CONTRACT_VERSION

    @staticmethod
    def from_json(obj: dict[str, Any]) -> "AnalyzeRequest":
        return AnalyzeRequest(
            image_path=str(obj["image_path"]),
            rug_width_cm=float(obj["rug_width_cm"]),
            rug_height_cm=float(obj["rug_height_cm"]),
            out_dir=str(obj["out_dir"]),
            cache_dir=str(obj["cache_dir"]),
            segmenter=obj.get("segmenter", "auto"),
            with_depth=bool(obj.get("with_depth", False)),
            rug_box=obj.get("rug_box"),
            contract_version=int(obj.get("contract_version", CONTRACT_VERSION)),
        )


@dataclass
class Artifacts:
    """Absolute paths to sidecar files. All are analysis data — never new rug pixels."""
    mask: str = ""            # hard rug mask (8-bit)
    alpha: str = ""           # soft matte (8-bit), fringe-accurate
    cutout: str = ""          # RGBA: ORIGINAL pixels * alpha (no new pixels)
    shadow: str = ""          # cast-shadow layer (8-bit)
    corners: str = ""         # corners.json
    camera: str = ""          # camera.json (homography + solve)
    depth: str = ""           # depth.png (optional)
    diagnostics: str = ""     # diagnostics.json
    preview: str = ""         # side-by-side review PNG


@dataclass
class AnalysisResult:
    ok: bool
    cache_hit: bool
    image_sha256: str
    contract_version: int
    pipeline_version: str
    segmenter_used: str
    device: str
    reprojection_rms_px: float
    reprojection_target_px: float
    reprojection_pass: bool
    timings_ms: dict[str, float]
    artifacts: Artifacts
    warnings: list[str] = field(default_factory=list)

    def to_json(self) -> dict[str, Any]:
        d = asdict(self)
        d["type"] = "result"
        return d
