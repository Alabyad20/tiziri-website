# TIZIRI Mark — Clearspace & Minimum Size

These are the locked production rules from the Atlas Edition II identity
(2026-07-12). Restated here so they travel with the asset files themselves.

## Minimum clearspace

Keep a minimum clear margin around the mark equal to **half the mark's own
radius (R/2)**, measured from the outer ring, on all sides — no text, edge,
or other logo may enter that margin.

Example: at a 100px mark, keep at least 47px of clear space on every side
(R = 94/200 of the mark's width, so R/2 ≈ 23.5% of the mark's own diameter).

## Minimum size

| Context                          | Minimum size |
|-----------------------------------|--------------|
| Digital (screen)                  | 16px         |
| Print                              | 10mm         |
| Embroidery / woven label           | 15mm (bezel ring omitted below this — use the no-bezel mono variant) |
| Favicon / browser tab              | 16px (use `favicon-16x16.png`, not a scaled-down master) |

Below these sizes the inner bezel ring and seam hairline lose fidelity —
always drop to a size-appropriate asset rather than force-scaling a large
master down.

## Which file for which use

- **Full-color master** (`tiziri-mark.svg` / `.pdf` / `.eps` / `.ai`) — the
  default, for any placement where both ink and cream are real background
  colors already in play (site header, product tags, most print).
- **Black version** (`tiziri-mark-black.*`) — single-ink mark, transparent
  background, for placement on light/white grounds where a second color
  isn't available (e.g. a single-color print run, black stamp on paper).
- **White version** (`tiziri-mark-white.*`) — same, for dark/ink grounds.
- **Emboss version** (`tiziri-mark-emboss.*`) — line-only construction (no
  filled plateau) for blind deboss, foil stamp, or laser engraving, where
  only tooled edges register, not flat fills.
- **Social profile PNGs** (`social/tiziri-social-profile-*.png`) — pre-padded
  12% on all sides so platform circular crops don't clip the outer ring;
  provided on both cream and ink grounds.

## What did not change

This file restates existing locked specs — it does not introduce new
clearspace or size rules. If a real production defect surfaces at any of
these sizes, that's a reason to revisit; a fresh internal design review is
not (see the identity closure note, 2026-07-12).
