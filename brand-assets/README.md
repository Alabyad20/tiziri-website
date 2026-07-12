# TIZIRI Master Brand Asset Package

Generated 2026-07-12 from the locked Atlas Edition II mark construction. This
is the identity's execution package — not a new design pass. See
`specs/clearspace-and-minimum-size.md` and `specs/color-values.md` for the
rules that go with these files.

## What's honest about this package

- **`vector/*.ai`** files are PDF-compatible (Illustrator opens them as
  editable vector paths) but are not native Illustrator files with layers or
  artboard metadata — nothing in this process has access to real Illustrator.
  For anything requiring true `.ai` authoring features, treat the `.pdf` as
  the source of truth and re-save from Illustrator once opened.
- **CMYK values** in `specs/color-values.md` are a naive RGB→CMYK conversion,
  not a press-calibrated build. Get a physical proof before a real print run.
- **No Pantone numbers are provided.** A genuine PMS match requires a
  physical swatch book, not a computed guess.
- **No packaging or embossed/foil physical assets are in this package** —
  those don't exist as real production proofs yet (separate, known open item;
  see [[project_tiziri_logo_direction_2026_07]] in project memory).

## Folder guide

```
vector/    tiziri-mark.{svg,pdf,eps,ai}          full-color master
           tiziri-mark-black.{svg,pdf,eps,ai}    single-ink, transparent bg, light grounds
           tiziri-mark-white.{svg,pdf,eps,ai}    single-ink, transparent bg, dark grounds
           tiziri-mark-emboss.{svg,pdf,eps,ai}   line-only, for deboss/foil/laser dies
png/       tiziri-mark[-black|-white]-{64..2048}.png   transparent, multiple resolutions
favicon/   favicon.ico (16/32/48/256 multi-res), favicon.svg,
           favicon-16x16.png, favicon-32x32.png, favicon-48x48.png, favicon-256x256.png,
           apple-touch-icon.png (180px)
social/    tiziri-social-profile-cream.png, tiziri-social-profile-ink.png
           (1024px, 12% safe-crop padding for circular platform crops)
specs/     color-values.md, clearspace-and-minimum-size.md
```

## Verification performed

- PDF/EPS masters checked byte-level (xref offsets, valid PDF operators) and
  the base construction confirmed rendering correctly in Chrome's native PDF
  viewer before variant files were generated from the same code path.
- `favicon.ico` confirmed as a valid multi-resolution icon (Chrome resolved
  it to its 256×256 frame on load).
- Social profile crops verified visually at 1024px on both grounds.
