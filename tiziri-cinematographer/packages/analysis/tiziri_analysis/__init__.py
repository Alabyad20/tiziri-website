"""Tiziri analysis sidecar (Milestone P1).

Turns an immutable Flat Hero photograph into SIDECAR analysis data only: a rug
mask, a soft fringe alpha + transparent cutout, a shadow layer, refined corners,
a homography/camera solve, optional depth, diagnostics, and previews.

Hard invariant (Engineering Master Plan; P1 constraints #3-#5): the original rug
pixels are NEVER generated or altered. Every neural component only *measures* the
image (masks / alpha / depth). There is no generative fill, inpainting, or pixel
reconstruction anywhere in this package. The cutout is the original pixels times a
computed alpha — nothing more.
"""

__version__ = "0.1.0"
PIPELINE_VERSION = "p1-2026-07-16"
