# P1 Validation — Flat Hero Shooting Checklist

Shoot ~10 rugs to this checklist so we can validate geometry on real production
captures. The difficult variations are deliberate — we want to find failures, not
hide them.

## Per-photo checklist (tape to the rig)

- [ ] **Rug completely flat** — smooth out every ripple, curl, and fold. This is the
      single biggest factor for geometry (bowed edges were the P1 blocker).
- [ ] **Camera true nadir & level** — lens axis perpendicular to the floor, centred.
      Use the phone/camera level; no tilt.
- [ ] **Entire rug in frame, including fringe** — nothing cropped.
- [ ] **Small even margin** of the surface all around the rug.
- [ ] **Plain matte surface** — no glossy floor. **No other rugs or objects in frame.**
- [ ] **Soft, even, neutral light** — no hot spots, no colour cast.
- [ ] **Max resolution, lowest practical ISO.**
- [ ] **Locked white balance & exposure.**
- [ ] **Record exact rug dimensions** (width × length in cm).

## The 10-rug difficult set

Shoot one rug for each row. If a rug covers two categories, note both.

| # | Variation | Why it stresses the pipeline |
|---|---|---|
| 1 | Ivory low-contrast | edge vs pale floor; low colour separation |
| 2 | Dark rug | edge vs shadow / dark floor |
| 3 | Bold multicolour | strong internal motifs can mislead segmentation |
| 4 | Dense patterned | many internal edges near the border |
| 5 | High-pile Mrirt | fuzzy, soft boundary |
| 6 | Long fringe | fringe vs woven-edge separation |
| 7 | Irregular handmade edges | non-straight true edges |
| 8 | Tonal rug | very low internal + edge contrast |
| 9 | Flatweave | thin, crisp edges; little pile |
| 10 | Large rug | perspective/keystone risk if not perfectly nadir |

## How to deliver them to me (zero-setup run)

Put the photos in one folder and give me the folder path, plus this manifest filled
in (copy into `fixtures/flat-heroes.json`). One entry per rug:

```json
{
  "repo_root": "<absolute path to the folder with your 10 photos>",
  "fixtures": [
    { "name": "01-ivory-lowcontrast", "file": "IMG_xxxx.jpg", "w_cm": 300, "h_cm": 200, "category": "ivory low-contrast" },
    { "name": "02-dark",              "file": "IMG_xxxx.jpg", "w_cm": 250, "h_cm": 160, "category": "dark rug" }
    // …10 total
  ]
}
```

(If you'd rather, just give me the folder + a list of `filename, width_cm, length_cm`
and I'll build the manifest.)

## What I will run and report per image

- Full P1 pipeline (SAM 2 primary, GrabCut fallback).
- Mask, soft alpha, transparent cutout, **corner overlay**, and diagnostic preview.
- **Corner + reprojection error** (robust woven-edge RMS + raw).
- Readiness decision (READY / REVIEW / RECAPTURE) per the fail-closed gate.
- Processing time and peak behaviour vs the performance budget.
- Immutability confirmation.

Results are reported **individually and as a set — failures are not averaged away.**

## Production acceptance target (per image)

- Primary rug selected; **no background objects**.
- Fringe retained cleanly.
- No material rug regions missing; no large floor leaks.
- **Corner + reprojection error within the Engineering Master Plan target.**
- Source pixels immutable.
- Within the performance budget.
