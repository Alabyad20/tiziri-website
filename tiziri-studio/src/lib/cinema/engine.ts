/**
 * Tiziri Virtual Cinematographer — Tier-1 planar-projection engine.
 *
 * The rug photo is treated as a flat card lying on a virtual floor. A pinhole
 * camera moves around it; we project the card's four corners to screen space
 * and draw the ORIGINAL pixels into that quad via `drawImageInQuad`. Every
 * output pixel is therefore a resample of the source image — no pixel is ever
 * generated. Fidelity is a property of this pipeline, not a setting.
 *
 * See docs/virtual-cinematographer-architecture.md (§2 fidelity invariant).
 */
import { drawImageInQuad, quadOutline, type Quad, type Pt } from "@/lib/homography";

export type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Camera in spherical terms around the rug centre, matched to how the real shots look. */
export interface CamState {
  /** Distance from rug centre (rug is 1 unit wide). */
  radius: number;
  /** Elevation above the floor, radians. 90° = straight top-down. */
  elevation: number;
  /** Azimuth around the vertical axis, radians. 0 = straight in front. */
  azimuth: number;
  /** Look-at point offset along the rug's length (−0.5 far … +0.5 near). */
  targetZ: number;
  /** Vertical field of view, radians. */
  fov: number;
}

/** A 2D letterbox fit (uniform scale + translate) applied identically to every frame. */
export interface Fit {
  sc: number;
  tx: number;
  ty: number;
}

/** The rug's four floor corners in world space, ordered TL,TR,BR,BL to match the image UVs. */
function cardCorners(aspect: number): Quad4 {
  const halfW = 0.5;
  const halfL = aspect / 2; // length runs along Z (image top = far, bottom = near)
  return [
    [-halfW, 0, -halfL], // TL  image(0,0) → far-left
    [halfW, 0, -halfL], //  TR  image(1,0) → far-right
    [halfW, 0, halfL], //   BR  image(1,1) → near-right
    [-halfW, 0, halfL], //  BL  image(0,1) → near-left
  ];
}
type Quad4 = [Vec3, Vec3, Vec3, Vec3];

function eyeFrom(cam: CamState): Vec3 {
  const { radius: r, elevation: e, azimuth: a } = cam;
  return [r * Math.cos(e) * Math.sin(a), r * Math.sin(e), r * Math.cos(e) * Math.cos(a)];
}

/** Project world corners to screen pixels for a given camera and viewport. */
export function projectQuad(corners: Quad4, cam: CamState, W: number, H: number): Quad {
  const eye = eyeFrom(cam);
  const target: Vec3 = [0, 0, cam.targetZ];
  const fwd = norm(sub(target, eye));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const scale = H / 2 / Math.tan(cam.fov / 2);
  const cx = W / 2;
  const cy = H / 2;

  const project = (p: Vec3): Pt => {
    const d = sub(p, eye);
    const z = dot(d, fwd) || 1e-4; // depth along view axis (>0 in front)
    return { x: cx + (dot(d, right) / z) * scale, y: cy - (dot(d, up) / z) * scale };
  };
  return [project(corners[0]), project(corners[1]), project(corners[2]), project(corners[3])];
}

/** Fit a quad's bounding box into the viewport with margin — computed once for the base frame. */
export function fitFor(quad: Quad, W: number, H: number, margin = 0.9): Fit {
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sc = Math.min((W * margin) / (maxX - minX), (H * margin) / (maxY - minY));
  const tx = W / 2 - ((minX + maxX) / 2) * sc;
  const ty = H / 2 - ((minY + maxY) / 2) * sc;
  return { sc, tx, ty };
}

const applyFit = (q: Quad, f: Fit): Quad =>
  q.map((p) => ({ x: p.x * f.sc + f.tx, y: p.y * f.sc + f.ty })) as Quad;

/* ----------------------------- camera moves ----------------------------- */

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface CinemaMove {
  id: string;
  name: string;
  blurb: string;
  /** Camera at normalised time t∈[0,1], given the framing base camera. */
  at: (t: number, base: CamState) => CamState;
}

export const MOVES: CinemaMove[] = [
  {
    id: "hero",
    name: "Static Hero",
    blurb: "A held, breathing frame. The safe editorial default.",
    at: (t, b) => ({ ...b, radius: b.radius * (1 - 0.012 * Math.sin(t * Math.PI)) }),
  },
  {
    id: "push",
    name: "Slow Push",
    blurb: "Dolly in along the view axis. Zero disocclusion.",
    at: (t, b) => ({ ...b, radius: b.radius * (1 - 0.17 * easeInOut(t)) }),
  },
  {
    id: "pull",
    name: "Slow Pull",
    blurb: "Reveal the whole rug by drawing back.",
    at: (t, b) => ({ ...b, radius: b.radius * (0.85 + 0.17 * easeInOut(t)) }),
  },
  {
    id: "pan",
    name: "Editorial Pan",
    blurb: "A few-degree arc — real parallax across the field.",
    at: (t, b) => ({ ...b, azimuth: b.azimuth + ((easeInOut(t) - 0.5) * 13 * Math.PI) / 180 }),
  },
  {
    id: "crane",
    name: "Floating Crane",
    blurb: "Boom up toward a museum top-down.",
    at: (t, b) => ({
      ...b,
      elevation: b.elevation + (easeInOut(t) * 9 * Math.PI) / 180,
      radius: b.radius * (1 - 0.05 * easeInOut(t)),
    }),
  },
  {
    id: "macro",
    name: "Macro Glide",
    blurb: "Push toward the near detail and fringe.",
    at: (t, b) => ({
      ...b,
      radius: b.radius * (1 - 0.28 * easeInOut(t)),
      targetZ: b.targetZ + 0.18 * easeInOut(t),
      elevation: b.elevation - (easeInOut(t) * 6 * Math.PI) / 180,
    }),
  },
];

export interface BackgroundPlate {
  id: string;
  name: string;
  /** Paints the full canvas behind the rug. Independent of the rug pixels. */
  paint: (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
}

const solid = (a: string, b: string): BackgroundPlate["paint"] => (ctx, W, H) => {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
};

export const PLATES: BackgroundPlate[] = [
  { id: "plaster", name: "Plaster", paint: solid("#efe9e0", "#ded5c7") },
  { id: "oak", name: "Warm Oak", paint: solid("#d8c3a3", "#b99b73") },
  { id: "limestone", name: "Limestone", paint: solid("#e9e6df", "#cfcabf") },
  { id: "concrete", name: "Concrete", paint: solid("#cfd0cf", "#a9abac") },
  { id: "sweep", name: "White Sweep", paint: solid("#ffffff", "#e6e6e6") },
  { id: "charcoal", name: "Charcoal", paint: solid("#2b2b2e", "#161617") },
];

/* ------------------------------- rendering ------------------------------ */

export interface Scene {
  img: CanvasImageSource;
  aspect: number; // img height / width
  move: CinemaMove;
  plate: BackgroundPlate;
  elevationDeg: number; // base framing elevation
  shadow: boolean;
}

/** The base (framing) camera for a scene, derived from the chosen elevation. */
export function baseCam(elevationDeg: number, aspect: number): CamState {
  const fov = (38 * Math.PI) / 180;
  // Distance chosen so the rug roughly fills frame before the letterbox fit tidies it.
  const radius = (0.6 + aspect * 0.5) / Math.tan(fov / 2) + 0.4;
  return { radius, elevation: (elevationDeg * Math.PI) / 180, azimuth: 0, targetZ: 0, fov };
}

/** Render a single frame at normalised time t. Pure resample — no pixel is generated. */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  t: number,
  fit: Fit,
): void {
  const { width: W, height: H } = ctx.canvas;
  const corners = cardCorners(scene.aspect);
  const base = baseCam(scene.elevationDeg, scene.aspect);
  const cam = scene.move.at(t, base);
  const quad = applyFit(projectQuad(corners, cam, W, H), fit);

  scene.plate.paint(ctx, W, H);

  if (scene.shadow) {
    const outline = quadOutline(quad, 8);
    ctx.save();
    ctx.filter = "blur(18px)";
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 10) : ctx.moveTo(p.x, p.y + 10)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawImageInQuad(
    ctx,
    scene.img,
    { x: 0, y: 0, w: sourceW(scene.img), h: sourceH(scene.img) },
    quad,
    18,
  );
}

/** The fit is computed from the base camera so framing is stable across the whole move. */
export function fitForScene(ctx: CanvasRenderingContext2D, scene: Scene): Fit {
  const { width: W, height: H } = ctx.canvas;
  const base = baseCam(scene.elevationDeg, scene.aspect);
  // Fit against the widest extent the move reaches, so a push-in never crops out.
  const quad = projectQuad(cardCorners(scene.aspect), base, W, H);
  return fitFor(quad, W, H, 0.92);
}

function sourceW(img: CanvasImageSource): number {
  if (img instanceof HTMLImageElement) return img.naturalWidth;
  const any = img as { width?: number; displayWidth?: number; videoWidth?: number };
  return any.width ?? any.displayWidth ?? any.videoWidth ?? 0;
}
function sourceH(img: CanvasImageSource): number {
  if (img instanceof HTMLImageElement) return img.naturalHeight;
  const any = img as { height?: number; displayHeight?: number; videoHeight?: number };
  return any.height ?? any.displayHeight ?? any.videoHeight ?? 0;
}
