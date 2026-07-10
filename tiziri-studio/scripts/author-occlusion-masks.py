"""Re-author occlusion masks for all 5 photo rooms via isnet segmentation.

Each room lists furniture 'pieces' as generous crop boxes (photo fractions).
rembg/isnet extracts the silhouette per crop; the union becomes the new mask.
Candidates land in ./masks_new for visual review before copying to public/rooms.
"""
import os, sys
from PIL import Image
import numpy as np
from rembg import remove, new_session

SRC = r"C:\Users\nigel\Moroccan-Rug-Website\tiziri-studio\public\rooms"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "masks_new")
os.makedirs(OUT, exist_ok=True)

ROOMS = {
    "organic-modern": {
        "pieces": [("sofa", (0.02, 0.30, 0.98, 0.93))],
        # Inner legs sit in the sofa's shadow — isnet captures only slivers.
        # Solid traced polygons keep them attached to the floor.
        "polys": [
            ("innerL-leg", 255, [(0.2255, 0.744), (0.2475, 0.744), (0.2425, 0.7755), (0.2335, 0.7755)]),
        ],
        # Glossy laminate: isnet captures each leg's floor reflection at high
        # alpha. Zero everything below the true foot tips (measured from the
        # photo) in a band around each leg.
        "cuts": [
            (0.155, 0.818, 0.205, 0.92),
            (0.215, 0.778, 0.262, 0.92),
            (0.748, 0.7765, 0.792, 0.92),
            (0.805, 0.831, 0.856, 0.92),
            # Bright under-sofa floor reflection left of the inner-right leg —
            # isnet kept it as "sofa"; the true sofa bottom edge is y 0.742.
            (0.730, 0.7395, 0.770, 0.7765),
        ],
        "legs": [[0.178, 0.812], [0.235, 0.772], [0.767, 0.770], [0.830, 0.825]],
    },
    "warm-minimal": {
        "pieces": [
            ("lamp", (0.08, 0.08, 0.45, 0.85)),
            ("chair", (0.30, 0.35, 0.75, 0.82)),
        ],
        # Chair-leg reflections on the wood floor, below the true tips.
        "cuts": [
            (0.340, 0.808, 0.386, 0.87),
            (0.455, 0.812, 0.492, 0.88),
            (0.378, 0.786, 0.398, 0.806),
            (0.512, 0.770, 0.535, 0.83),
        ],
        "polys": [
            # Wardrobe: straight right edge, diagonal floor contact line.
            ("wardrobe", 255, [(0, 0), (0.186, 0), (0.190, 0.865), (0.135, 0.90),
                               (0.075, 0.94), (0.02, 0.98), (0, 0.99)]),
            # TV console: body + sled base down to its floor line.
            ("console", 255, [(0.748, 0.585), (1.0, 0.573), (1.0, 0.752),
                              (0.768, 0.768), (0.748, 0.768)]),
            # Side table: marble cube base + gold stem + round top.
            ("cube", 255, [(0.605, 0.727), (0.70, 0.710), (0.752, 0.725),
                           (0.752, 0.768), (0.662, 0.785), (0.605, 0.762)]),
            ("stem", 255, [(0.6865, 0.598), (0.6985, 0.598), (0.6985, 0.722), (0.6865, 0.722)]),
        ],
        "ellipses": [("tabletop", 255, (0.613, 0.576, 0.757, 0.603))],
        "legs": [[0.37, 0.718], [0.615, 0.725], [0.265, 0.708]],
    },
    "lux-neutral": {
        "pieces": [
            # grow_down: isnet stops at the shadow line a few px above the
            # sofa's true fabric bottom — fringe strands poked through.
            ("sofa", (0.00, 0.35, 0.62, 1.00), {"grow_down": 14}),
            ("table", (0.42, 0.58, 0.72, 0.95)),
        ],
        "polys": [
            # Stairs need no mask: rug far bound d>=1.15 maps to screen y>=0.696,
            # the stair base ends at y~0.665 — the bounds already protect them.
            # Sideboard: wood top + white body to frame bottom.
            ("sideboard", 255, [(0.893, 0.598), (1.0, 0.545), (1.0, 1.0), (0.862, 1.0)]),
        ],
        "legs": [[0.5, 0.77], [0.6, 0.75], [0.2, 0.85], [0.4, 0.84]],
    },
    "calm-bedroom": {
        "pieces": [
            ("bedbench", (0.24, 0.40, 0.75, 1.00)),
            ("screen", (0.00, 0.08, 0.24, 0.98)),
            ("shelf", (0.70, 0.08, 1.00, 0.88)),
            ("tableL", (0.24, 0.48, 0.40, 0.75)),
            ("tableR", (0.58, 0.50, 0.74, 0.72)),
        ],
        # Duvet drape + bed-base corners came out semi-transparent from isnet
        # (white-on-pale / brown-on-wood ambiguity) — solidify them.
        "polys": [
            ("duvetL", 255, [(0.315, 0.715), (0.43, 0.72), (0.43, 0.862), (0.36, 0.868),
                             (0.328, 0.855), (0.320, 0.79)]),
            ("bedR", 255, [(0.56, 0.74), (0.62, 0.732), (0.648, 0.752), (0.652, 0.778),
                           (0.684, 0.802), (0.694, 0.822), (0.688, 0.842), (0.660, 0.860),
                           (0.56, 0.866)]),
        ],
        "legs": [[0.375, 0.905], [0.545, 0.905]],
    },
    "dining": {
        "pieces": [
            ("set", (0.00, 0.52, 0.90, 1.00)),
        ],
        "polys": [
            # Sheer curtain: slightly translucent so the rug ghosts through.
            ("curtain", 235, [(0.893, 0), (1.0, 0), (1.0, 0.85), (0.96, 0.838),
                              (0.93, 0.842), (0.91, 0.833), (0.893, 0.825)]),
            # Fluted pedestal reads semi-transparent from isnet (dark-on-dark)
            # — solidify the cylinder down to its curved base.
            ("pedestal", 255, [(0.408, 0.715), (0.572, 0.715), (0.572, 0.868),
                               (0.545, 0.892), (0.49, 0.899), (0.435, 0.892),
                               (0.408, 0.868)]),
        ],
        "legs": [[0.1, 0.925], [0.235, 0.94], [0.6, 0.9], [0.76, 0.925], [0.5, 0.885]],
    },
}

session = new_session("isnet-general-use")
only = sys.argv[1:] or list(ROOMS)

for room in only:
    info = ROOMS[room]
    photo = Image.open(os.path.join(SRC, f"{room}.jpg")).convert("RGB")
    pw, ph = photo.size
    full = np.zeros((ph, pw), dtype=np.float32)

    for piece in info["pieces"]:
        name, (x0, y0, x1, y1) = piece[0], piece[1]
        opts = piece[2] if len(piece) > 2 else {}
        box = (int(x0 * pw), int(y0 * ph), int(x1 * pw), int(y1 * ph))
        crop = photo.crop(box)
        res = remove(crop, session=session)
        a = np.asarray(res)[:, :, 3].astype(np.float32)
        # Downward-only growth: extend bottom edges toward the floor without
        # widening the silhouette sideways.
        for k in range(1, int(opts.get("grow_down", 0)) + 1):
            shifted = np.zeros_like(a)
            shifted[k:, :] = a[:-k, :]
            a = np.maximum(a, shifted)
        full[box[1]:box[3], box[0]:box[2]] = np.maximum(full[box[1]:box[3], box[0]:box[2]], a)
        # per-piece overlay for debugging
        rgb = np.asarray(crop).astype(np.float32)
        t = (a / 255.0)[:, :, None] * 0.55
        over = (rgb * (1 - t) + np.array([255, 30, 30]) * t).astype(np.uint8)
        pim = Image.fromarray(over)
        if pim.width > 900:
            pim = pim.resize((900, int(pim.height * 900 / pim.width)), Image.LANCZOS)
        pim.save(os.path.join(OUT, f"{room}-piece-{name}.png"))

    # Manual polygons/ellipses for straight-edged built-ins isnet can't see.
    # Drawn at 4x supersampling for anti-aliased edges.
    from PIL import ImageDraw
    shapes = list(info.get("polys", [])) + [
        ("__ell__" + n, a, box) for n, a, box in info.get("ellipses", [])
    ]
    if shapes:
        ss = 4
        layer = Image.new("L", (pw * ss, ph * ss), 0)
        dr = ImageDraw.Draw(layer)
        for name, alpha, geom in shapes:
            if name.startswith("__ell__"):
                x0, y0, x1, y1 = geom
                dr.ellipse((x0 * pw * ss, y0 * ph * ss, x1 * pw * ss, y1 * ph * ss), fill=alpha)
            else:
                dr.polygon([(x * pw * ss, y * ph * ss) for x, y in geom], fill=alpha)
        layer = layer.resize((pw, ph), Image.LANCZOS)
        full = np.maximum(full, np.asarray(layer).astype(np.float32))

    # Cleanup: isnet keeps floor reflections / contact shadows of legs at
    # partial alpha — stamped over the rug they read as ghost smears. Remap
    # alpha so everything below ~0.45 dies and the remainder re-stretches to
    # a full ramp; the runtime feather restores edge softness.
    full = np.clip((full - 115.0) * (255.0 / (255.0 - 115.0)), 0, 255)

    # Reflection cuts: zero alpha in rectangles below true foot tips.
    for (x0, y0, x1, y1) in info.get("cuts", []):
        full[int(y0 * ph):int(y1 * ph), int(x0 * pw):int(x1 * pw)] = 0
    mask = np.zeros((ph, pw, 4), dtype=np.uint8)
    mask[:, :, 0:3] = 255
    mask[:, :, 3] = full.astype(np.uint8)
    Image.fromarray(mask, "RGBA").save(os.path.join(OUT, f"{room}-mask.png"))

    # full overlay for review
    rgb = np.asarray(photo).astype(np.float32)
    t = (full / 255.0)[:, :, None] * 0.55
    over = (rgb * (1 - t) + np.array([255, 30, 30]) * t).astype(np.uint8)
    ov = Image.fromarray(over)
    ov.resize((pw // 2, ph // 2), Image.LANCZOS).save(os.path.join(OUT, f"{room}-overlay.png"))

    # leg crops (photo | new overlay)
    for i, (fx, fy) in enumerate(info["legs"]):
        cx, cy = int(fx * pw), int(fy * ph)
        r = 130
        box = (max(0, cx - r), max(0, cy - r), min(pw, cx + r), min(ph, cy + r))
        pc = photo.crop(box); oc = ov.crop(box)
        w, h = pc.size
        strip = Image.new("RGB", (w * 2 + 4, h), (255, 255, 0))
        strip.paste(pc, (0, 0)); strip.paste(oc, (w + 4, 0))
        strip = strip.resize((strip.width * 2, strip.height * 2), Image.NEAREST)
        strip.save(os.path.join(OUT, f"{room}-leg{i}.png"))
    print(room, "done")
print("all done")
