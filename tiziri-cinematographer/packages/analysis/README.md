# @tiziri/analysis — P1 Rug Analysis Sidecar

Turns an immutable Flat Hero photograph into **sidecar analysis data only**: rug
mask, soft fringe alpha + transparent cutout, shadow layer, refined corners,
homography/camera solve, optional depth, diagnostics, and a review preview.

**Invariant:** the original rug pixels are never generated or altered. Every model
only *measures* the image. The cutout is `original × alpha` — nothing more.

## Install (dev)

```bash
pip install -r requirements.txt        # pinned, all permissive licences
```

## Run

```bash
python -m tiziri_analysis --request-file request.json
# or pipe the JSON request on stdin
```

Emits line-delimited JSON on stdout: `{"type":"progress"|"log"|"result"|"error", ...}`.
See `tiziri_analysis/contract.py`. Exit codes: 0 ok, 2 error, 130 cancelled.

## Pipeline

`segment → shadow → matte → cutout → geometry → (optional depth) → diagnostics + preview`

- **Segmentation:** SAM 2 (Apache-2.0, ONNX) when weights are present; **GrabCut**
  (OpenCV, no weights) otherwise and as the CPU fallback.
- **Fringe alpha:** trimap → **pymatting** (MIT) closed-form matting (scalable fallback
  under memory pressure). No matting-net weights.
- **Geometry:** OpenCV corner detection + sub-pixel refinement + homography from the
  rug's **known real-world dimensions**; reprojection = edge-straightness RMS (px).
- **Depth (optional, off by default):** Depth Anything V2 **Small** (Apache-2.0, ONNX).

## Models (optional neural tier)

Downloads are explicit, resumable, and checksum-verified — never at install:

```bash
python scripts/download_models.py --list
python scripts/download_models.py sam2_encoder sam2_decoder
```

## Tests & fixtures

```bash
PYTHONPATH=. python -m unittest discover -s tests      # 18 unit tests
PYTHONPATH=. python scripts/run_fixtures.py --manifest fixtures/fixtures.json --out /tmp/fx
```

See `LICENSES.md` (audit) and `KNOWN-LIMITATIONS.md` (honest status). The Electron
integration (submit a Flat Hero, progress, cancel, timeout) lives in
`../shell-electron/scripts/analysis-integration.mjs`.
