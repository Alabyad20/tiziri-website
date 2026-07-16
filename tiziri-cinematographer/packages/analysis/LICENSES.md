# P1 Analysis — Licence & Redistribution Audit

Audited before treating anything as shippable (P1 constraint #6). The whole product
is commercial, so every component must be permissively licensed for commercial use
**and** redistribution — for code *and* weights.

## Runtime dependencies (all shipped)

| Package | Version | Licence | Commercial redistribution |
|---|---|---|---|
| numpy | 2.2.6 | BSD-3-Clause | ✅ |
| opencv-python-headless | 4.13.0.92 | Apache-2.0 | ✅ (headless: no GPL GUI/system libs) |
| pymatting | 1.1.15 | MIT | ✅ |
| scipy | 1.15.3 | BSD-3-Clause | ✅ |
| pillow | 12.0.0 | HPND (permissive) | ✅ |
| onnxruntime | 1.23.2 | MIT | ✅ |
| psutil (optional) | 7.1.2 | BSD-3-Clause | ✅ |

The **classical pipeline** (GrabCut + pymatting + OpenCV geometry) uses only the
above — no model weights, fully commercial-safe, and it is the reliable CPU path.

## Model weights (optional neural tier — downloaded explicitly, never bundled)

| Model | Purpose | Licence | Status |
|---|---|---|---|
| **SAM 2** (image encoder + decoder, ONNX) | rug segmentation | **Apache-2.0** | ✅ permitted; URL/sha256 to be pinned from the official release before ship |
| **Depth Anything V2 — Small** (ONNX) | optional depth | **Apache-2.0** | ✅ permitted (SMALL only) |

## Landmines explicitly avoided

- ❌ **Depth Anything V2 Base/Large** — **CC-BY-NC-4.0 (non-commercial)**. Disallowed;
  only the **Small** (Apache-2.0) variant is in the registry, and this is enforced by
  code comments + the registry entry note.
- ❌ **MODNet** (CC-BY-NC-SA), **Robust Video Matting** (GPL-3.0), **ViTMatte /
  MatteAnything** (research-only) — all rejected. We use classical **pymatting (MIT)**
  for fringe alpha instead of any research matting net, keeping the fringe path
  commercial-clean with zero weights.
- ❌ **PyTorch** avoided at runtime — the neural tier runs on **onnxruntime (MIT)**,
  a lighter, permissive runtime that also provides the CPU fallback.

## Pre-ship checklist

- [ ] Pin `url` + `sha256` for the SAM 2 and Depth-Anything-V2-Small ONNX exports in
      `tiziri_analysis/models.py` (mark `pinned=True`), from an Apache-2.0 source.
- [ ] Re-confirm each weight's model card licence at pin time.
- [ ] Include this file + upstream NOTICE files in the distributed app's third-party
      licence bundle.
