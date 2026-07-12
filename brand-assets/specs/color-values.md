# TIZIRI Mark — Color Values

## Brand palette (source of truth: HEX)

| Name    | HEX       | RGB               | Use |
|---------|-----------|--------------------|-----|
| Ink     | `#0F0D0A` | `15, 13, 10`       | Primary mark color, body text |
| Cream   | `#F5EFDE` | `245, 239, 222`    | Ground color, reversed-mark fill |
| Indigo  | `#2E4157` | `46, 65, 87`       | Accent only (never the mark itself) |
| Stone   | `#8C7A56` | `140, 122, 86`     | Accent only (never the mark itself) |

## CMYK — approximate, not press-verified

The values below are a naive device-independent RGB→CMYK conversion. They are a
starting point for a proof, not a production value. Real CMYK output depends on
the specific press, paper stock, and ICC profile in use — get a physical proof
from the actual print vendor before finalizing any printed piece (business
cards, packaging, tags).

| Name    | Approx. CMYK        |
|---------|----------------------|
| Ink     | C0 M13 Y33 K94       |
| Cream   | C0 M2 Y9 K4          |
| Indigo  | C47 M25 Y0 K66       |
| Stone   | C0 M13 Y39 K45       |

## Pantone — not provided

No Pantone (PMS) numbers are given here. A genuine Pantone match requires
holding the physical color against a current Pantone Formula Guide or Bridge
Guide under standard lighting — it cannot be derived accurately from a HEX
value, and guessing a PMS number here would be fabricating a precision this
process doesn't have. When a vendor needs a Pantone reference (foil stamp,
spot-color print), match Ink and Cream against a physical guide at that time.

## Where these numbers come from

Ink, Cream, Indigo, and Stone are the four tokens locked for the TIZIRI
identity (Atlas Edition II, 2026-07-12) — see the identity guideline
artifacts for full rationale. Nothing here is new; this file exists so a
vendor or collaborator has one place to read the values without opening a
design document.
