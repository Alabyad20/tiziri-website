import { homographyToQuad, type Quad } from "./homography";
import type { SceneLight } from "./rooms";

/**
 * Photographic room templates: a licensed room photograph plus everything the
 * compositor needs to place a rug in it — calibrated floor plane, placement
 * bounds, light, furniture contact points, and a foreground occlusion mask so
 * furniture renders OVER the rug. Templates are plain JSON-shaped data: the
 * calibration page produces the same structure, so new rooms need no code.
 */
export interface RoomTemplate {
  id: string;
  kind: "photo";
  name: string;
  style: string;
  /** Photo URL (bundled) or data URL (calibrated by the user). */
  photo: string;
  /** photo height / width — lets geometry work before the image loads. */
  photoAspect: number;
  /** Vertical crop anchor when covering the 3:2 canvas: 0 top … 1 bottom. */
  focusY: number;
  attribution: { author: string; source: string; url: string; license: string };
  /** Floor quadrilateral in image fractions: far-left, far-right, near-right,
   *  near-left. Corners may lie outside [0,1] — the plane extends past frame. */
  floorQuad: [[number, number], [number, number], [number, number], [number, number]];
  /** Real-world meters spanned by the floor quad. */
  planeSize: { w: number; d: number };
  /**
   * Region the WHOLE rug rectangle may occupy, in plane meters — not just its
   * center. The far side may extend behind furniture the occlusion mask
   * covers (that's the "tucked under" zone); the near side should stop at the
   * bottom of the frame. fitRange() shrinks this by the rug's half-extents to
   * get the valid center range.
   */
  bounds: { x: [number, number]; d: [number, number] };
  light: SceneLight;
  /** Furniture feet, image fractions — pile compresses where these land. */
  legPoints: Array<[number, number]>;
  /** PNG with opaque pixels where FOREGROUND furniture must cover the rug. */
  occlusionMask?: string;
  /** Per-template overrides for the occlusion mask pipeline (see processMask). */
  maskProcessing?: MaskProcessing;
  /** Optional PNG screened over the finished scene (window light shapes). */
  lightMask?: string;
  orientation: "landscape" | "portrait" | "either";
  rugSize: { minW: number; maxW: number; minL: number; maxL: number };
}

/**
 * Occlusion-mask processing knobs. The pipeline runs ONCE per template at the
 * mask's native resolution (see processMask), and its output canvas is what
 * every renderer draws — preview and export therefore share one mask.
 */
export interface MaskProcessing {
  /** Alpha (0–255) below this becomes fully transparent — kills stray noise. */
  threshold?: number;
  /** Morphological grow (+px) or shrink (−px) at mask resolution. A small
   *  positive value hides floor slivers between furniture and rug. */
  expandPx?: number;
  /** Edge feather radius in px at mask resolution — a soft, photographic
   *  transition on top of a crisp edge. Keep ≤ 2. */
  featherPx?: number;
}

// expandPx defaults to 0: near contact edges the rug sits UNDER the mask, so
// any expansion stamps a ring of photo floor over the rug (a pale halo).
// Expansion exists for templates whose authored mask undershoots the object.
export const DEFAULT_MASK_PROCESSING: Required<MaskProcessing> = {
  threshold: 12,
  expandPx: 0,
  featherPx: 0.75,
};

const BASE = import.meta.env.BASE_URL + "rooms/";

export const bundledRoomTemplates: RoomTemplate[] = [
  {
    id: "organic-modern",
    kind: "photo",
    name: "Organic Modern",
    style: "organic-modern living room",
    photo: BASE + "organic-modern.jpg",
    photoAspect: 1067 / 1600,
    focusY: 0.5,
    attribution: {
      author: "Phillip Goldsberry",
      source: "Unsplash",
      url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
      license: "Unsplash License (free commercial use)",
    },
    floorQuad: [[-0.02, 0.79], [1.02, 0.79], [1.12, 1.03], [-0.12, 1.03]],
    planeSize: { w: 3.8, d: 1.6 },
    // Sofa front line = d 0 (mask covers the sofa, so up to 0.45 m tucks
    // under); frame bottom is d 1.43; sofa outer legs sit at x ±1.39.
    bounds: { x: [-1.45, 1.45], d: [-0.45, 1.4] },
    light: { dirX: -0.15, tint: [255, 214, 186], tintAlpha: 0.04 },
    // Sofa feet: true foot-tip positions measured from the photo (the mask's
    // bottom tips sat lower — glossy-floor reflections).
    legPoints: [[0.178, 0.812], [0.238, 0.774], [0.767, 0.771], [0.830, 0.825]],
    occlusionMask: BASE + "organic-modern-mask.png",
    orientation: "landscape",
    rugSize: { minW: 1.6, maxW: 3.0, minL: 1.0, maxL: 2.0 },
  },
  {
    id: "warm-minimal",
    kind: "photo",
    name: "Warm Minimalist",
    style: "warm minimalist living room",
    photo: BASE + "warm-minimal.jpg",
    photoAspect: 1412 / 1600,
    focusY: 0.85,
    attribution: {
      author: "Minh Pham",
      source: "Unsplash",
      url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7",
      license: "Unsplash License (free commercial use)",
    },
    floorQuad: [[0.06, 0.715], [1.02, 0.715], [1.16, 1.03], [-0.1, 1.03]],
    planeSize: { w: 4.2, d: 3.0 },
    // Chair front = d 0 (masked, 0.3 m tuck); frame bottom d 2.49; the
    // photo's own gray rug starts right of x ≈ 1.1 — stay left of it.
    bounds: { x: [-1.8, 1.0], d: [-0.3, 2.45] },
    light: { dirX: 0.3, tint: [255, 208, 172], tintAlpha: 0.05 },
    // Lamp base, chair front/back feet, marble cube, console front foot —
    // true tips measured from the photo (mask tips sat lower: reflections).
    // Rear chair feet sit in under-chair shadow — points there rendered as
    // orphaned dots, so only clearly visible contacts carry shadows.
    legPoints: [[0.272, 0.808], [0.366, 0.808], [0.470, 0.812],
                [0.650, 0.790], [0.758, 0.766]],
    occlusionMask: BASE + "warm-minimal-mask.png",
    orientation: "landscape",
    rugSize: { minW: 1.4, maxW: 2.6, minL: 0.9, maxL: 1.8 },
  },
  {
    id: "lux-neutral",
    kind: "photo",
    name: "Luxury Neutral",
    style: "luxury neutral living room",
    photo: BASE + "lux-neutral.jpg",
    photoAspect: 1029 / 1600,
    focusY: 0.5,
    attribution: {
      author: "Viaceslav Kat",
      source: "Pexels",
      url: "https://www.pexels.com/photo/1571460/",
      license: "Pexels License (free commercial use)",
    },
    floorQuad: [[0.02, 0.555], [0.98, 0.555], [1.18, 1.05], [-0.18, 1.05]],
    planeSize: { w: 6.0, d: 3.2 },
    // Lounge zone only: the photo's round rug spans d ≈ 1.5–3.0; sofa chaise
    // (masked) allows tuck to x −1.35; walkway to the stairs starts x ≈ 1.8;
    // frame bottom d 2.97; d ≥ 1.15 keeps the rug out of the dining area.
    bounds: { x: [-1.35, 1.75], d: [1.15, 2.9] },
    light: { dirX: -0.4, tint: [255, 206, 170], tintAlpha: 0.05 },
    // Chaise feet only: the sofa's other feet aren't visible once a rug
    // covers that floor, and the wire table's rim is too light to dent a rug
    // — points there rendered as orphaned shadow smudges.
    legPoints: [[0.432, 0.895], [0.442, 0.814]],
    occlusionMask: BASE + "lux-neutral-mask.png",
    orientation: "landscape",
    rugSize: { minW: 2.4, maxW: 3.6, minL: 1.6, maxL: 2.4 },
  },
  {
    id: "calm-bedroom",
    kind: "photo",
    name: "Calm Bedroom",
    style: "calm bedroom",
    photo: BASE + "calm-bedroom.jpg",
    photoAspect: 1068 / 1600,
    focusY: 0.5,
    attribution: {
      author: "Dmitry Zvolskiy",
      source: "Pexels",
      url: "https://www.pexels.com/photo/2082087/",
      license: "Pexels License (free commercial use)",
    },
    floorQuad: [[0.0, 0.685], [1.0, 0.69], [1.12, 1.03], [-0.12, 1.03]],
    planeSize: { w: 4.6, d: 2.4 },
    // Bed front foot at d ≈ 0.71 (bed base + bench are masked → tuck to
    // 0.35); frame bottom d 2.22; open floor both sides to x ±1.75.
    bounds: { x: [-1.75, 1.75], d: [0.35, 2.2] },
    light: { dirX: 0.2, tint: [255, 204, 164], tintAlpha: 0.06 },
    // Basket, bench front feet, bed base right corner — measured from the
    // segmented mask.
    legPoints: [[0.071, 0.769], [0.382, 0.968], [0.596, 0.967], [0.619, 0.888]],
    occlusionMask: BASE + "calm-bedroom-mask.png",
    orientation: "landscape",
    rugSize: { minW: 1.6, maxW: 3.0, minL: 1.0, maxL: 2.0 },
  },
  {
    id: "dining",
    kind: "photo",
    name: "Dining Room",
    style: "contemporary dining room",
    photo: BASE + "dining.jpg",
    photoAspect: 2010 / 1600,
    focusY: 1.0,
    attribution: {
      author: "Houzlook.com",
      source: "Pexels",
      url: "https://www.pexels.com/photo/3356416/",
      license: "Pexels License (free commercial use)",
    },
    floorQuad: [[0.03, 0.76], [0.97, 0.755], [1.25, 1.04], [-0.25, 1.04]],
    planeSize: { w: 3.6, d: 1.9 },
    // Dining set is centered and fully masked: table pedestal base d ≈ 0.1,
    // so the rug may start at d 0.05 behind it; frame bottom d 1.72; frame
    // half-width at the bottom is ±1.26.
    bounds: { x: [-1.15, 1.15], d: [0.05, 1.7] },
    light: { dirX: 0.55, tint: [255, 190, 140], tintAlpha: 0.08 },
    // Every visible chair leg tip + the table pedestal base — measured from
    // the segmented mask.
    legPoints: [[0.062, 0.929], [0.110, 0.982], [0.141, 0.873], [0.231, 0.889],
                [0.311, 0.937], [0.376, 0.932], [0.489, 0.901], [0.576, 0.807],
                [0.599, 0.941], [0.645, 0.904], [0.690, 0.893], [0.790, 0.988],
                [0.854, 0.934]],
    occlusionMask: BASE + "dining-mask.png",
    orientation: "either",
    rugSize: { minW: 1.8, maxW: 2.9, minL: 1.4, maxL: 2.2 },
  },
];

/* ------------------------------------------------------------------ */
/* Geometry: cover placement + floor mapping for a template            */
/* ------------------------------------------------------------------ */

export interface CoverPlacement {
  scale: number;
  dx: number;
  dy: number;
  iw: number;
  ih: number;
}

/** Where the (aspect-known) photo lands when covering a W×H canvas. */
export function coverPlacement(tpl: RoomTemplate, W: number, H: number): CoverPlacement {
  const iw = 1000;
  const ih = 1000 * tpl.photoAspect;
  const scale = Math.max(W / iw, H / ih);
  const dx = (W - iw * scale) / 2;
  const dy = (H - ih * scale) * tpl.focusY;
  return { scale, dx, dy, iw, ih };
}

export function templateMapper(tpl: RoomTemplate, W: number, H: number) {
  const cp = coverPlacement(tpl, W, H);
  const toCanvas = ([fx, fy]: [number, number]) => ({
    x: cp.dx + fx * cp.iw * cp.scale,
    y: cp.dy + fy * cp.ih * cp.scale,
  });
  const quad = tpl.floorQuad.map(toCanvas) as Quad;
  const h = homographyToQuad(quad);
  const { w, d } = tpl.planeSize;
  return {
    toScreen(xM: number, depthM: number) {
      return h.map((xM + w / 2) / w, depthM / d);
    },
    toPlane(x: number, y: number) {
      const uv = h.invMap(x, y);
      return { x: uv.x * w - w / 2, depth: uv.y * d };
    },
    fracToCanvas: toCanvas,
    cover: cp,
  };
}

/* ------------------------------------------------------------------ */
/* Occlusion-mask pipeline: threshold → morphology → feather           */
/* ------------------------------------------------------------------ */

/** One separable box-blur pass over an alpha field (radius r px). */
function boxBlurAlpha(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const win = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / win;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / win;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** 3×3 dilate (grow=true) or erode pass on an alpha field. */
function morphAlpha(src: Float32Array, w: number, h: number, grow: boolean): Float32Array {
  const out = new Float32Array(src.length);
  const pick = grow ? Math.max : Math.min;
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - 1) * w;
    const y1 = y * w;
    const y2 = Math.min(h - 1, y + 1) * w;
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1);
      const x2 = Math.min(w - 1, x + 1);
      out[y1 + x] = pick(
        src[y0 + x0], src[y0 + x], src[y0 + x2],
        src[y1 + x0], src[y1 + x], src[y1 + x2],
        src[y2 + x0], src[y2 + x], src[y2 + x2],
      );
    }
  }
  return out;
}

/**
 * The centralized mask pipeline. Returns a canvas at the mask's native
 * resolution whose alpha has been cleaned (threshold), grown/shrunk by
 * expandPx, and edge-feathered by featherPx. Color channels stay untouched —
 * the compositor's source-in step only reads alpha. Every consumer (preview,
 * full-scene export, marketplace crops, calibration view) draws THIS canvas,
 * so mask behavior is identical at every resolution by construction.
 */
export function processMask(
  mask: HTMLImageElement | HTMLCanvasElement,
  opts?: MaskProcessing,
): HTMLCanvasElement {
  const { threshold, expandPx, featherPx } = { ...DEFAULT_MASK_PROCESSING, ...opts };
  const w = mask.width;
  const h = mask.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(mask, 0, 0);
  const img = g.getImageData(0, 0, w, h);
  const data = img.data;

  let a: Float32Array = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) {
    const v = data[i * 4 + 3];
    a[i] = v < threshold ? 0 : v;
  }
  for (let n = 0; n < Math.round(Math.abs(expandPx)); n++) {
    a = morphAlpha(a, w, h, expandPx > 0);
  }
  if (featherPx > 0) {
    // Two box passes ≈ a soft gaussian; sub-pixel radii lerp toward r=1.
    const r = Math.max(1, Math.round(featherPx));
    const blurred = boxBlurAlpha(boxBlurAlpha(a, w, h, r), w, h, r);
    const mix = Math.min(1, featherPx);
    for (let i = 0; i < a.length; i++) a[i] = a[i] + (blurred[i] - a[i]) * mix;
  }
  for (let i = 0; i < a.length; i++) data[i * 4 + 3] = a[i];
  g.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------------------------------------------ */
/* Asset cache — photo + masks decoded and processed once per template */
/* ------------------------------------------------------------------ */

export interface TemplateAssets {
  img: HTMLImageElement;
  /** Raw occlusion mask as authored (calibration display only). */
  mask: HTMLImageElement | null;
  /** Pipeline output — what every compositor must draw. */
  processedMask: HTMLCanvasElement | null;
  lightMask: HTMLImageElement | null;
}

const assetCache = new Map<string, Promise<TemplateAssets>>();

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src.slice(0, 80)}`));
    img.src = src;
  });
}

export function ensureTemplateAssets(tpl: RoomTemplate): Promise<TemplateAssets> {
  const key = tpl.id + "|" + tpl.photo.slice(0, 64);
  let cached = assetCache.get(key);
  if (!cached) {
    cached = Promise.all([
      load(tpl.photo),
      tpl.occlusionMask ? load(tpl.occlusionMask).catch(() => null) : Promise.resolve(null),
      tpl.lightMask ? load(tpl.lightMask).catch(() => null) : Promise.resolve(null),
    ]).then(([img, mask, lightMask]) => ({
      img,
      mask,
      processedMask: mask ? processMask(mask, tpl.maskProcessing) : null,
      lightMask,
    }));
    assetCache.set(key, cached);
  }
  return cached;
}
