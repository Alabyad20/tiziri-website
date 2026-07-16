# ADR-0003 — SAM 2 deployment choice

Status: accepted (with one gated follow-up) · Date: 2026-07-16 · Scope: P1 closure

## Decision

**Ship the simplest option that passes the production top-down fixture set. In
priority order:**

1. **SAM 2.1 Hiera *Tiny* via ONNX + onnxruntime** — *preferred for shipping* once a
   suitable Apache-2.0 ONNX export is sourced and it matches the torch path's quality
   on the top-down set. Drops the entire torch stack.
2. **SAM 2.1 Hiera *Tiny* via the official `sam2` + torch** — *the validated fallback*
   (working today). Ship this if the ONNX route proves unreliable on Windows.
3. **SAM 2 *Large*** — only if Tiny + interactive prompting fails to meet the
   acceptance target on the fixture set. Not expected to be necessary.

We do **not** adopt torch merely for headroom, per the brief: if ONNX + interactive
prompting meets the target, ONNX wins on simplicity.

## Evidence

| Criterion | Torch SAM 2-Tiny (validated) | ONNX SAM 2-Tiny (target) | SAM 2-Large |
|---|---|---|---|
| Segmentation quality | High; cleanly isolates the floor rug (validated) | Expected equal (same weights) | Marginally higher on hardest patterns |
| Prompt responsiveness | Full: box + positive/negative points; embed-cache makes refine fast | Decoder takes point_coords/labels + box → interactive works | Same |
| CPU performance | ~6.5 s segment (measured) | Comparable/better (onnxruntime CPU) | Slower on CPU |
| GPU performance | CUDA via torch | CUDA/DirectML EP | CUDA |
| Download size | torch ~200 MB + torchvision + sam2 + ckpt 156 MB ≈ **~400 MB** | onnxruntime (present) + ONNX weights ≈ **~200–300 MB** | larger |
| Memory | torch + model ≈ **1–2 GB** | **lower** (no torch) | higher |
| Packaging complexity | **High** — bundling torch on Windows is heavy (~1 GB+ installed) | **Low** — onnxruntime is a small wheel; no torch | High |
| Licensing | Apache-2.0 (sam2) + BSD (torch) — all permissive ✓ | Apache-2.0 weights + MIT onnxruntime ✓ | Apache-2.0 |
| Windows reliability | Verified working here | Needs validation | — |
| Maintenance | torch version churn; larger surface | Smaller surface; stable ONNX runtime | — |

## Why gated

The decision between (1) and (2) depends on the **top-down production fixture set**,
which has not yet been supplied. The torch path is validated *today* and unblocks the
top-down geometry validation immediately. The ONNX switch is a **packaging
optimisation** to make before shipping, not a prerequisite for validating P1.

## Interactive prompting changes the calculus

Because a reliable **human-in-the-loop click** path now exists (positive/negative
clicks, live preview, fail-closed gate), we do not need a heavier model to brute-force
the hardest rugs — the operator resolves ambiguity in one or two clicks. This is the
main reason Tiny is expected to suffice and Large is deprioritised.

## Follow-up (before P2 ships to real content)

- [ ] Source/verify an Apache-2.0 SAM 2-Tiny ONNX export; wire it into the existing
      `Sam2OnnxSegmenter` scaffold; pin url+sha256.
- [ ] Run it on the top-down fixture set + interactive cases; compare to the torch path.
- [ ] If equal, make ONNX the default and drop the torch dependency; else keep torch.
