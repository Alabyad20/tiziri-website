# SAM 2 Segmentation Validation (P1 gate)

_Short validation milestone. Real model, real fixtures — nothing asserted. 2026-07-16._

## 1. Model pinned & verified

- **SAM 2.1 Hiera Tiny**, `sam2.1_hiera_tiny.pt` — **Apache-2.0**.
- URL: `https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt`
- **sha256 `7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69`**, 156,008,466 bytes.
- Downloaded, checksum-verified, pinned in `tiziri_analysis/models.py` (`pinned=True`).
- Runtime: official `sam2==1.1.0` (Apache-2.0) on `torch==2.5.1+cpu` / `torchvision==0.20.1+cpu`
  (BSD). Neural deps isolated in `requirements-sam2.txt`; the classical pipeline still needs none.

## 2. SAM 2 wired as PRIMARY, GrabCut as fallback

`segment.py::get_segmenter` now builds `Sam2Segmenter` (torch) for `auto`/`sam2`, and falls back to
GrabCut on any recoverable error (missing weights / torch not importable / runtime error). Prompt:
positive points spread across the lower-centre (isolates the ONE floor rug; excludes top-of-frame
backdrop/stacked rugs). An explicit `rug_box` (interactive click) overrides the auto prompt.

## 3. Before / after across all 5 real fixtures

Reprojection is the **robust (woven-edge) RMS**; a metric was added to separate fringe wobble from
true edge fidelity. All numbers px. (These are the same hard, ANGLED, cluttered July-4th photos.)

| fixture | category | GrabCut rms | SAM 2 rms | mask quality (visual) |
|---|---|---|---|---|
| teal-ivory-highpile | busy bg, colour-similar | 104.5 | **81.8** | GrabCut leaked right + grabbed bg rugs → **SAM 2 near-perfect, clean whole-rug isolation** |
| rug-284x212 | irregular handmade edges | 116.4 | **114.5** | SAM 2 excludes bg; cleaner boundary |
| rug-241x163 | smaller rug, fringe | 122.1 | **75.4** | SAM 2 clean; fringe preserved |
| rug-305x192 | large, multi-rug, shadows | 237.2 | **115.1** | GrabCut grabbed background stacked rugs → **SAM 2 excludes them**, but ragged upper-left on the diamond pattern |
| rug-243x152 | flatweave/low pile | 127.3 | 155.9 | SAM 2 excludes bg; auto-prompt weaker here |

- **Mask quality:** the decisive win. SAM 2 **reliably excludes the background/stacked rugs** — the
  exact GrabCut failure — and produces complete masks. Two visually reviewed (teal = near-perfect;
  305 = excludes bg but ragged on strong internal pattern).
- **Fringe preservation:** unchanged and reliable given a good mask (pymatting on the trimap band);
  visible in the teal cutout.
- **Corner accuracy / reprojection:** improved on 4/5 (avg ~141 → ~108 px) but **still above the
  1.5 px target** — see §4.
- **Processing time:** SAM 2 segment ≈ **6.5 s on CPU** (tiny model) — *faster* than capped GrabCut
  (~11 s) — + ~2–3 s model build. Per-image total ~16–20 s. **Within the P1 CPU budget (< 90 s).**

## 4. Why reprojection still misses target (root cause)

Deep-dive on the teal fixture (`camera.json`): median border-to-edge deviation ≈ 81 px ≈ **8.5 cm**
at 9.6 px/cm. That is **not** a corner/solver/segmentation error — it is the rug **physically not
being a flat rectangle** in these shots: they are **angled**, the rug is **floppy/un-smoothed
(bowed edges)**, and **fringe fans out**. Straight-edge geometry cannot hit 1.5 px on a rug that
isn't lying flat and square to a nadir camera. The solver itself is proven on a synthetic known
rectangle (**< 1.5 px**), and the robust metric confirms the residual is systemic (bowed edges),
not fringe outliers alone.

## 5. Remaining failures, classified

| symptom | classification | fix |
|---|---|---|
| reprojection > target on every real fixture | **CAPTURE PROBLEM** | top-down nadir + rug laid flat & smoothed (§6) |
| ragged mask on the hardest multicolour patterned rug (305 upper-left) | **MODEL LIMITATION** (SAM 2-tiny + auto point-prompt snaps to strong internal motifs) | SAM 2-large, or an interactive click / `rug_box` (already supported), or top-down capture |
| — | no **implementation bugs** found | — |
| — | no **user error** | — |

## 6. Recommended TIZIRI Capture Standard additions (measurable)

1. **Enforce top-down nadir** (already specified) — validated as *essential*: angled shots give
   bowed edges → geometry can't hit target.
2. **Lay the rug flat and smooth it** (no ripples/curl) before shooting — directly removes the
   ~8 cm edge bow that dominates reprojection.
3. **Shoot on a plain, contrasting surface with NO other rugs/objects in frame** — eliminates the
   multi-rug ambiguity that broke GrabCut and still stresses SAM 2.
4. **Even margin around the rug** (already specified) — aids segmentation + matting.
5. **For irregular/heavily-patterned pieces, one interactive click** to seed the segmenter — the
   architecture already accepts `rug_box`.

## 7. Downstream impact — none architectural

- **Geometry solver:** additive only (a robust-RMS field); same solve. ✓
- **Matting / cutout:** unchanged; fringe path intact; cutout still `original × alpha`. ✓
- **Caching:** unchanged; `segmenter` is part of the cache key, so SAM 2 and GrabCut runs cache
  independently. ✓
- **Electron integration:** unchanged; `analysis-service` spawns the same sidecar, which simply uses
  SAM 2 when weights are present. No IPC/API change. ✓
- **Immutability:** unchanged; test passes; no regression.
- **Performance:** within budget; no regression.

---

## Is P1 now production-ready?

**No — not yet.** SAM 2 fixes the milestone's blocking defect (it cleanly isolates the primary rug
and no longer grabs background rugs), and it introduces **no architectural change** to geometry,
matting, caching, or the Electron integration. But two things remain before P2 can safely depend on
the analysis output:

1. **Geometry has not been demonstrated within target on a representative production image**, because
   we only have angled, floppy, fringed, multi-rug photos — a **capture problem**. The solver is
   proven on synthetic; it needs one set of **proper top-down Flat Heroes** (rug laid flat, plain
   surface, nothing else in frame) to confirm reprojection ≤ target on real content.
2. **SAM 2 auto-prompting is not flawless on the hardest patterned rugs** (a model limitation),
   needing either SAM 2-large or an interactive click for those edge cases.

**Estimated effort to production-ready: ~2–4 engineering days + one proper capture session** — and
most of it is *not* new code:
- Capture ~10 top-down Flat Heroes to the amended standard and re-run the fixtures — **~0.5 day**
  (mostly shooting); expected to bring geometry within target.
- Wire an interactive-click prompt path in the harness for hard rugs (backend already supports it),
  and optionally swap to SAM 2-large — **~0.5–1 day**.
- Decide shipping runtime: keep torch, or export the Apache-2.0 SAM 2 weights to ONNX to drop torch
  (the `Sam2OnnxSegmenter` scaffold already exists) — **~0.5–1 day**.
- Pin ONNX url/sha256 if going that route — **~0.25 day**.

Until the top-down re-validation confirms geometry within target on real content, P1 remains
**conditionally complete**, and **P2 should not begin.**
