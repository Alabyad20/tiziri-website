# P1 Analysis — Known Limitations (honest)

## The headline

The **infrastructure is solid and tested**; the **classical segmentation quality is
not production-grade on hard real photos.** The confirmed SAM 2 tier (Apache-2.0) is
wired and downloadable but was **not validated in this environment** (its ONNX weights
were not fetched — a ~300 MB explicit download, and downloads here are slow). So the
visual review below runs on the CLASSICAL (GrabCut) path only.

## Fixture review (classical/GrabCut, real July-4th photos)

All five real fixtures are **angled, on a busy wood floor, with other rugs stacked in
frame and colour-similar edges** — a deliberately hard set. Results:

| fixture | rms_px | pass | failure mode observed |
|---|---|---|---|
| teal-ivory-highpile | 104.5 | ✗ | right edge leaks into same-colour floor/stacked ivory rugs |
| rug-284x212 | 116.4 | ✗ | irregular boundary; background bleed |
| rug-241x163 | 122.1 | ✗ | boundary bleed |
| rug-305x192 | 237.2 | ✗ | mask grabbed background stacked rugs too; right side lost |
| rug-243x152 | 127.3 | ✗ | boundary bleed |

**Why:** GrabCut is a colour/rect model with no notion of "the one rug on the floor".
When the frame contains other rugs and colour-similar regions, it leaks or grabs the
wrong object. This is exactly the case SAM 2 (prompted single-object segmentation)
solves. The matting (fringe alpha) and the geometry solver are **not** the problem —
they are correct given a correct mask.

## What IS validated

- **Geometry solver** — on a known rug rectangle (perfect mask), reprojection is
  **< 1.5 px** (synthetic tests), and the metric correctly flags bad masks (it's why
  the numbers above are high). Sub-pixel corner refinement lands within ~4 px of truth.
- **Matting** — recovers genuinely soft alpha on soft edges; the cutout's RGB is byte-
  identical to the source (no pixel is generated/altered).
- **End-to-end** — the pipeline runs on every real fixture without crashing and emits
  all sidecars (mask, alpha, cutout, shadow, corners, camera, diagnostics, preview).
- **Orchestration** — run / progress / cancel / timeout / structured errors through the
  Electron process layer (integration test: 10/10).
- **Cache, fail-safe, immutability, download mechanism** — all unit-tested.

## Consequences / what's needed next

1. **SAM 2 validation** — pin the Apache-2.0 ONNX weights, run the two-session download,
   and re-run the fixtures. Expected to lift segmentation to production quality on hard
   photos. This is the gating item for real content quality.
2. **Proper top-down Flat Heroes** — per the Capture Standard, the intended input is a
   clean nadir shot on a plain surface. Even GrabCut segments those far better; the repo
   only had angled, cluttered shots to test with.
3. **Matting resolution cap (1100 px)** — fringe alpha is computed at ≤1100 px then
   upscaled, for CPU memory/time. Fine for review; revisit for 4K-critical fringe.
4. **Depth** is off by default and unvalidated (weights not fetched); it is optional and
   not on the P1 critical path.

## Non-limitations (guarantees that hold regardless)

- The original image is never modified; `load_image_rgb` returns a read-only array and
  no code path writes to the source (unit-tested).
- The cutout is original pixels × computed alpha — no generation, inpainting, or recolour
  anywhere.
