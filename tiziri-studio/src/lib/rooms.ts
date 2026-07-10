import {
  homographyToQuad,
  drawImageInQuad,
  quadOutline,
  type MeshDisplace,
  type Pt,
  type Quad,
} from "./homography";

/**
 * Procedural room scenes. Each scene paints a minimal, flat-illustration
 * interior; the rug is projected onto a shared floor plane (7m wide × 5m
 * deep) with a true homography, so position, size and rotation stay
 * perspective-correct in every room.
 */

export interface RugPlacement {
  /** Rug width across the room, meters. */
  widthM: number;
  /** Rug length into the room, meters (from image aspect by default). */
  lengthM: number;
  /** Sideways offset from room center, meters. */
  offsetX: number;
  /** Distance from the back wall to rug center, meters. */
  depth: number;
  /** Rotation on the floor plane, degrees. */
  rotation: number;
}

export interface SceneLight {
  /** Where the light comes from: -1 hard left … 1 hard right, 0 ambient. */
  dirX: number;
  /** Whole-frame photographic grade tint (applied soft-light at the end). */
  tint: [number, number, number];
  tintAlpha: number;
}

export interface RoomScene {
  id: string;
  name: string;
  blurb: string;
  light: SceneLight;
  /** Window light pools in floor-plane meters — painted over floor AND rug. */
  lightPools?: Array<{ pts: Array<[number, number]>; color: string; alpha: number }>;
  /** Furniture feet as screen fractions — the rug compresses where these land. */
  legPoints?: Array<[number, number]>;
  paintBack: (ctx: CanvasRenderingContext2D, W: number, H: number, plane: PlaneFn) => void;
  paintFront?: (ctx: CanvasRenderingContext2D, W: number, H: number, plane: PlaneFn) => void;
}

type PlaneFn = (xM: number, depthM: number) => Pt;

export const PLANE_W = 7; // meters across
export const PLANE_D = 5; // meters deep
const FLOOR_LINE = 0.44; // wall/floor split as a fraction of height

function floorHomography(W: number, H: number) {
  const quad: Quad = [
    { x: 0.16 * W, y: FLOOR_LINE * H }, // far left
    { x: 0.84 * W, y: FLOOR_LINE * H }, // far right
    { x: 1.32 * W, y: H }, // near right
    { x: -0.32 * W, y: H }, // near left
  ];
  return homographyToQuad(quad);
}

function floorPlane(W: number, H: number): PlaneFn {
  const h = floorHomography(W, H);
  return (xM, depthM) => h.map((xM + PLANE_W / 2) / PLANE_W, depthM / PLANE_D);
}

/**
 * Bidirectional floor mapper for interaction: screen point ↔ plane meters.
 * Used by the canvas drag handler to hit-test and move the rug.
 */
export function planeMapper(W: number, H: number) {
  const h = floorHomography(W, H);
  return {
    toScreen(xM: number, depthM: number): Pt {
      return h.map((xM + PLANE_W / 2) / PLANE_W, depthM / PLANE_D);
    },
    toPlane(x: number, y: number): { x: number; depth: number } {
      const uv = h.invMap(x, y);
      return { x: uv.x * PLANE_W - PLANE_W / 2, depth: uv.y * PLANE_D };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Small painting helpers                                              */
/* ------------------------------------------------------------------ */

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, r = 0) {
  ctx.fillStyle = fill;
  if (r > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Soft elliptical contact shadow under furniture. */
function contactShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 0.1) {
  ctx.save();
  ctx.fillStyle = `rgba(30, 22, 16, ${alpha})`;
  ctx.filter = "blur(6px)";
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function wallAndFloor(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  wall: string,
  floor: string,
  baseboard: string,
) {
  rect(ctx, 0, 0, W, FLOOR_LINE * H, wall);
  rect(ctx, 0, FLOOR_LINE * H, W, H - FLOOR_LINE * H, floor);
  rect(ctx, 0, FLOOR_LINE * H - H * 0.012, W, H * 0.012, baseboard);
}

/** Wooden plank joints, drawn in plane space so they converge correctly. */
function planks(ctx: CanvasRenderingContext2D, plane: PlaneFn, color: string, alpha = 0.16) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.4;
  for (let x = -PLANE_W / 2 + 0.7; x < PLANE_W / 2; x += 0.7) {
    const a = plane(x, 0);
    const b = plane(x, PLANE_D);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Stone tile grid in plane space (used in the entry hall). */
function tiles(ctx: CanvasRenderingContext2D, plane: PlaneFn, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1.2;
  for (let x = -PLANE_W / 2 + 1; x < PLANE_W / 2; x += 1) {
    const a = plane(x, 0);
    const b = plane(x, PLANE_D);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let d = 0.5; d < PLANE_D; d += 1) {
    const a = plane(-PLANE_W / 2, d);
    const b = plane(PLANE_W / 2, d);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function framedArt(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: string, matte: string, art: string) {
  rect(ctx, x, y, w, h, frame, 2);
  rect(ctx, x + w * 0.06, y + w * 0.06, w * 0.88, h - w * 0.12, matte);
  rect(ctx, x + w * 0.2, y + w * 0.2, w * 0.6, h - w * 0.4, art);
}

function plant(ctx: CanvasRenderingContext2D, x: number, baseY: number, s: number, potColor: string, leaf: string) {
  // Pot
  poly(
    ctx,
    [
      { x: x - 0.5 * s, y: baseY - s },
      { x: x + 0.5 * s, y: baseY - s },
      { x: x + 0.38 * s, y: baseY },
      { x: x - 0.38 * s, y: baseY },
    ],
    potColor,
  );
  // Leaves — simple tapered blades
  ctx.save();
  ctx.fillStyle = leaf;
  const blades = [
    { dx: 0, h: 2.6, w: 0.16, lean: 0 },
    { dx: -0.12, h: 2.1, w: 0.14, lean: -0.55 },
    { dx: 0.12, h: 2.2, w: 0.14, lean: 0.5 },
    { dx: -0.05, h: 1.7, w: 0.12, lean: -1.0 },
    { dx: 0.06, h: 1.8, w: 0.12, lean: 0.95 },
  ];
  for (const b of blades) {
    const bx = x + b.dx * s;
    const by = baseY - s;
    const tipX = bx + b.lean * s;
    const tipY = by - b.h * s;
    ctx.beginPath();
    ctx.moveTo(bx - b.w * s, by);
    ctx.quadraticCurveTo(bx - b.w * s + (tipX - bx) * 0.4, by - (by - tipY) * 0.6, tipX, tipY);
    ctx.quadraticCurveTo(bx + b.w * s + (tipX - bx) * 0.4, by - (by - tipY) * 0.6, bx + b.w * s, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function windowFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: string, glass: string, mullions = 2) {
  rect(ctx, x - w * 0.03, y - w * 0.03, w * 1.06, h + w * 0.06, frame, 3);
  rect(ctx, x, y, w, h, glass);
  ctx.fillStyle = frame;
  for (let i = 1; i <= mullions; i++) {
    ctx.fillRect(x + (w / (mullions + 1)) * i - w * 0.012, y, w * 0.024, h);
  }
  ctx.fillRect(x, y + h * 0.48, w, h * 0.028);
}

/* ------------------------------------------------------------------ */
/* Scenes                                                              */
/* ------------------------------------------------------------------ */

export const rooms: RoomScene[] = [
  {
    id: "living",
    name: "Living Room",
    blurb: "Linen sofa, oak floor, afternoon light",
    light: { dirX: -0.35, tint: [255, 196, 150], tintAlpha: 0.05 },
    legPoints: [
      [0.318, 0.505],
      [0.684, 0.505],
    ],
    paintBack(ctx, W, H, plane) {
      wallAndFloor(ctx, W, H, "#e9e1d2", "#c9a87d", "#d8cdb8");
      planks(ctx, plane, "#8a6a45");

      const fl = FLOOR_LINE * H;
      // Sofa centered on the back wall
      const sw = 0.42 * W;
      const sx = 0.5 * W - sw / 2;
      const sh = 0.21 * H;
      const sy = fl - sh + 0.045 * H;
      contactShadow(ctx, sx + sw / 2, sy + sh, sw * 0.96, H * 0.03);
      rect(ctx, sx, sy, sw, sh, "#d9cfba", W * 0.012); // body
      rect(ctx, sx + sw * 0.03, sy - sh * 0.38, sw * 0.94, sh * 0.42, "#d3c8b1", W * 0.012); // back
      rect(ctx, sx + sw * 0.05, sy + sh * 0.1, sw * 0.43, sh * 0.32, "#cfc3aa", W * 0.008); // cushions
      rect(ctx, sx + sw * 0.52, sy + sh * 0.1, sw * 0.43, sh * 0.32, "#cfc3aa", W * 0.008);
      rect(ctx, sx - sw * 0.045, sy - sh * 0.28, sw * 0.055, sh * 1.16, "#d3c8b1", W * 0.01); // arms
      rect(ctx, sx + sw * 0.99, sy - sh * 0.28, sw * 0.055, sh * 1.16, "#d3c8b1", W * 0.01);
      // Wood legs
      rect(ctx, sx + sw * 0.06, sy + sh, sw * 0.016, H * 0.02, "#7a5c3e");
      rect(ctx, sx + sw * 0.93, sy + sh, sw * 0.016, H * 0.02, "#7a5c3e");

      framedArt(ctx, 0.43 * W, 0.09 * H, 0.14 * W, 0.16 * H, "#8a6a45", "#f2ece0", "#b7906a");
      plant(ctx, 0.87 * W, fl + 0.03 * H, W * 0.022, "#a67b52", "#6f7a56");
      contactShadow(ctx, 0.87 * W, fl + 0.032 * H, W * 0.06, H * 0.014, 0.08);
    },
  },
  {
    id: "bedroom",
    name: "Bedroom",
    blurb: "Low bed, undyed linen, quiet morning",
    light: { dirX: 0.25, tint: [255, 205, 165], tintAlpha: 0.045 },
    legPoints: [
      [0.255, 0.47],
      [0.745, 0.47],
    ],
    paintBack(ctx, W, H, plane) {
      wallAndFloor(ctx, W, H, "#ded4c3", "#b98f68", "#cfc2ac");
      planks(ctx, plane, "#7d5f3f");

      const fl = FLOOR_LINE * H;
      const bw = 0.4 * W;
      const bx = 0.5 * W - bw / 2;
      // Headboard
      rect(ctx, bx + bw * 0.06, fl - 0.27 * H, bw * 0.88, 0.16 * H, "#a98a68", W * 0.01);
      // Mattress + duvet
      const mh = 0.15 * H;
      const my = fl - mh + 0.05 * H;
      contactShadow(ctx, bx + bw / 2, my + mh, bw * 1.02, H * 0.028);
      rect(ctx, bx, my, bw, mh, "#efe8db", W * 0.014);
      rect(ctx, bx, my + mh * 0.52, bw, mh * 0.48, "#e4dbc9", W * 0.012);
      // Pillows
      rect(ctx, bx + bw * 0.12, my - mh * 0.22, bw * 0.32, mh * 0.34, "#f4efe4", W * 0.012);
      rect(ctx, bx + bw * 0.56, my - mh * 0.22, bw * 0.32, mh * 0.34, "#f4efe4", W * 0.012);
      // Bedside tables + lamps
      for (const side of [bx - 0.075 * W, bx + bw + 0.015 * W]) {
        rect(ctx, side, fl - 0.055 * H, 0.06 * W, 0.085 * H, "#9a7a56", W * 0.006);
        rect(ctx, side + 0.022 * W, fl - 0.1 * H, 0.016 * W, 0.045 * H, "#8a6a45");
        rect(ctx, side + 0.012 * W, fl - 0.125 * H, 0.036 * W, 0.03 * H, "#e8ddc4", W * 0.008);
      }
    },
  },
  {
    id: "reading",
    name: "Reading Corner",
    blurb: "Leather armchair, tall window, floor lamp",
    light: { dirX: 0.6, tint: [255, 214, 170], tintAlpha: 0.055 },
    lightPools: [
      { pts: [[1.1, 0.1], [3.2, 0.1], [3.4, 2.6], [0.6, 2.6]], color: "#fffbe9", alpha: 0.13 },
    ],
    legPoints: [
      [0.18, 0.48],
      [0.315, 0.48],
      [0.382, 0.47],
    ],
    paintBack(ctx, W, H, plane) {
      wallAndFloor(ctx, W, H, "#e4dbc8", "#c19d72", "#d3c7ae");
      planks(ctx, plane, "#83643f");

      const fl = FLOOR_LINE * H;
      windowFrame(ctx, 0.66 * W, 0.06 * H, 0.2 * W, 0.31 * H, "#8a7a5f", "#e9e9df", 1);

      // Armchair, back-left
      const cw = 0.17 * W;
      const cx = 0.16 * W;
      const ch = 0.17 * H;
      const cy = fl - ch + 0.04 * H;
      contactShadow(ctx, cx + cw / 2, cy + ch, cw * 1.05, H * 0.024);
      rect(ctx, cx, cy - ch * 0.5, cw, ch * 1.5, "#a5825d", W * 0.016); // back
      rect(ctx, cx + cw * 0.1, cy + ch * 0.08, cw * 0.8, ch * 0.5, "#b08c66", W * 0.012); // seat
      rect(ctx, cx - cw * 0.12, cy - ch * 0.05, cw * 0.16, ch * 0.75, "#997651", W * 0.012); // arms
      rect(ctx, cx + cw * 0.96, cy - ch * 0.05, cw * 0.16, ch * 0.75, "#997651", W * 0.012);

      // Floor lamp beside the chair
      const lx = 0.38 * W;
      rect(ctx, lx, fl - 0.22 * H, 0.004 * W, 0.25 * H, "#5c4a35");
      poly(
        ctx,
        [
          { x: lx - 0.028 * W, y: fl - 0.22 * H },
          { x: lx + 0.032 * W, y: fl - 0.22 * H },
          { x: lx + 0.024 * W, y: fl - 0.165 * H },
          { x: lx - 0.02 * W, y: fl - 0.165 * H },
        ],
        "#e8ddc4",
      );
      contactShadow(ctx, lx + 0.002 * W, fl + 0.03 * H, W * 0.035, H * 0.01, 0.07);
    },
  },
  {
    id: "hallway",
    name: "Entry Hall",
    blurb: "Stone tiles, console table, runner territory",
    light: { dirX: 0, tint: [255, 210, 175], tintAlpha: 0.04 },
    legPoints: [
      [0.4, 0.46],
      [0.597, 0.46],
    ],
    paintBack(ctx, W, H, plane) {
      wallAndFloor(ctx, W, H, "#e6ddcd", "#cbb695", "#d6cab3");
      tiles(ctx, plane, "#8f7a58");

      const fl = FLOOR_LINE * H;
      // Console table against the back wall
      const tw = 0.24 * W;
      const tx = 0.5 * W - tw / 2;
      contactShadow(ctx, tx + tw / 2, fl + 0.018 * H, tw, H * 0.016, 0.08);
      rect(ctx, tx, fl - 0.1 * H, tw, 0.02 * H, "#8a6a45", W * 0.004);
      rect(ctx, tx + tw * 0.06, fl - 0.08 * H, 0.012 * W, 0.1 * H, "#8a6a45");
      rect(ctx, tx + tw * 0.88, fl - 0.08 * H, 0.012 * W, 0.1 * H, "#8a6a45");
      // Vase + stems
      rect(ctx, tx + tw * 0.44, fl - 0.145 * H, 0.024 * W, 0.045 * H, "#b3552f", W * 0.01);
      ctx.strokeStyle = "#6f7a56";
      ctx.lineWidth = W * 0.0022;
      for (const lean of [-0.5, 0, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(tx + tw * 0.455 + 0.006 * W, fl - 0.14 * H);
        ctx.quadraticCurveTo(
          tx + tw * 0.455 + lean * 0.02 * W,
          fl - 0.19 * H,
          tx + tw * 0.455 + lean * 0.032 * W,
          fl - 0.215 * H,
        );
        ctx.stroke();
      }
      // Round mirror above
      ctx.fillStyle = "#8a6a45";
      ctx.beginPath();
      ctx.arc(0.5 * W, 0.17 * H, 0.055 * W, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#efeade";
      ctx.beginPath();
      ctx.arc(0.5 * W, 0.17 * H, 0.049 * W, 0, Math.PI * 2);
      ctx.fill();
      // Door frames left and right
      rect(ctx, 0.035 * W, 0.05 * H, 0.012 * W, FLOOR_LINE * H - 0.06 * H, "#c9bda6");
      rect(ctx, 0.953 * W, 0.05 * H, 0.012 * W, FLOOR_LINE * H - 0.06 * H, "#c9bda6");
    },
  },
  {
    id: "loft",
    name: "Minimal Loft",
    blurb: "Big window, pale floor, one bench",
    light: { dirX: -0.6, tint: [206, 214, 232], tintAlpha: 0.05 },
    lightPools: [
      { pts: [[-3.2, 0.1], [-0.4, 0.1], [0.2, 2.8], [-3.5, 2.8]], color: "#fffdf0", alpha: 0.12 },
    ],
    legPoints: [
      [0.701, 0.475],
      [0.853, 0.475],
    ],
    paintBack(ctx, W, H, plane) {
      wallAndFloor(ctx, W, H, "#d8d1c5", "#d3c3a6", "#c6bca9");
      planks(ctx, plane, "#96825f");

      const fl = FLOOR_LINE * H;
      windowFrame(ctx, 0.12 * W, 0.055 * H, 0.34 * W, 0.32 * H, "#3d3a34", "#e7e6df", 3);
      // Oak bench, back-right
      const bw = 0.2 * W;
      const bx = 0.68 * W;
      contactShadow(ctx, bx + bw / 2, fl + 0.03 * H, bw, H * 0.016, 0.08);
      rect(ctx, bx, fl - 0.035 * H, bw, 0.022 * H, "#b08c60", W * 0.006);
      rect(ctx, bx + bw * 0.08, fl - 0.015 * H, 0.01 * W, 0.05 * H, "#a07c50");
      rect(ctx, bx + bw * 0.84, fl - 0.015 * H, 0.01 * W, 0.05 * H, "#a07c50");
    },
    paintFront(ctx, W, H) {
      // Large plant anchoring the near-left corner, in front of the rug
      plant(ctx, 0.07 * W, 0.99 * H, W * 0.036, "#9c7048", "#657049");
    },
  },
  {
    id: "atelier",
    name: "Atelier",
    blurb: "Clay walls, walnut floor, hung textile",
    light: { dirX: -0.2, tint: [255, 180, 120], tintAlpha: 0.075 },
    legPoints: [
      [0.736, 0.455],
      [0.784, 0.455],
    ],
    paintBack(ctx, W, H, plane) {
      wallAndFloor(ctx, W, H, "#c49a79", "#8d6c4c", "#ab8362");
      planks(ctx, plane, "#4f3a26");

      const fl = FLOOR_LINE * H;
      // Hung flat-weave on the back wall
      rect(ctx, 0.4 * W, 0.07 * H, 0.2 * W, 0.005 * H, "#5c4a35");
      const hx = 0.415 * W;
      const hw = 0.17 * W;
      rect(ctx, hx, 0.075 * H, hw, 0.24 * H, "#e8ddc6");
      ctx.fillStyle = "#b3552f";
      for (let i = 0; i < 4; i++) {
        const y = 0.095 * H + i * 0.055 * H;
        ctx.beginPath();
        ctx.moveTo(hx + hw * 0.12, y + 0.018 * H);
        ctx.lineTo(hx + hw * 0.5, y);
        ctx.lineTo(hx + hw * 0.88, y + 0.018 * H);
        ctx.lineTo(hx + hw * 0.5, y + 0.036 * H);
        ctx.closePath();
        ctx.fill();
      }
      // Wooden stool
      const sx = 0.76 * W;
      contactShadow(ctx, sx, fl + 0.02 * H, W * 0.07, H * 0.014, 0.1);
      rect(ctx, sx - 0.035 * W, fl - 0.075 * H, 0.07 * W, 0.016 * H, "#6d5233", W * 0.005);
      rect(ctx, sx - 0.028 * W, fl - 0.06 * H, 0.008 * W, 0.075 * H, "#5c4128");
      rect(ctx, sx + 0.02 * W, fl - 0.06 * H, 0.008 * W, 0.075 * H, "#5c4128");
    },
  },
];

export function roomById(id: string): RoomScene {
  return rooms.find((r) => r.id === id) ?? rooms[0];
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

export type PileType = "flat" | "low" | "high";

export interface RugStyleOpts {
  pile: PileType;
  fringe: boolean;
}

export interface RenderOptions {
  sceneId: string;
  rug: { img: HTMLImageElement | HTMLCanvasElement; w: number; h: number } | null;
  placement: RugPlacement;
  style: RugStyleOpts;
}

/** Physical pile height in meters — drives the visible edge and shadows. */
const PILE_HEIGHT: Record<PileType, number> = { flat: 0.004, low: 0.013, high: 0.026 };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic wool-grain tile, generated once. */
let noiseTile: HTMLCanvasElement | null = null;
function getNoiseTile(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  const img = g.createImageData(128, 128);
  const rnd = mulberry32(20260709);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(rnd() * 64);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

interface RugColors {
  /** Darkened tone for the visible pile edge. */
  edge: string;
  /** Warm ivory-leaning tone for fringe strands. */
  fringe: string;
}

const rugColorCache = new WeakMap<object, RugColors>();

/** Sample the rug photo's end rows to derive edge + fringe colors. */
function sampleRugColors(img: HTMLImageElement | HTMLCanvasElement): RugColors {
  const cached = rugColorCache.get(img);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = 24;
  c.height = 24;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, 24, 24);
  const data = g.getImageData(0, 0, 24, 24).data;
  let r = 0;
  let gr = 0;
  let b = 0;
  let n = 0;
  // Bottom three rows — closest to what the viewer sees as the rug's edge.
  for (let y = 21; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const i = (y * 24 + x) * 4;
      r += data[i];
      gr += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  r /= n;
  gr /= n;
  b /= n;
  const colors: RugColors = {
    edge: `rgb(${Math.round(r * 0.5)}, ${Math.round(gr * 0.5)}, ${Math.round(b * 0.5)})`,
    // Fringe reads as undyed cotton/wool: pull the sampled tone toward ivory.
    fringe: `rgb(${Math.round(r * 0.35 + 233 * 0.65)}, ${Math.round(gr * 0.35 + 226 * 0.65)}, ${Math.round(
      b * 0.35 + 210 * 0.65,
    )})`,
  };
  rugColorCache.set(img, colors);
  return colors;
}

/** Rug-local (dx across, dd along length) → plane meters, honoring rotation. */
function rugToPlane(p: RugPlacement, dx: number, dd: number): { x: number; d: number } {
  const rad = (p.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: p.offsetX + dx * cos - dd * sin,
    d: Math.max(0.05, Math.min(PLANE_D - 0.05, p.depth + dx * sin + dd * cos)),
  };
}

/** Rug corner points on the floor plane, mapped to screen space. */
export function rugQuad(plane: PlaneFn, p: RugPlacement): Quad {
  const hw = p.widthM / 2;
  const hl = p.lengthM / 2;
  const corner = (dx: number, dd: number): Pt => {
    const { x, d } = rugToPlane(p, dx, dd);
    return plane(x, d);
  };
  return [corner(-hw, -hl), corner(hw, -hl), corner(hw, hl), corner(-hw, hl)];
}

/* ------------------------------------------------------------------ */
/* Small geometry + texture helpers for the photographic pipeline      */
/* ------------------------------------------------------------------ */

function pathPts(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

function fillPts(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  pathPts(ctx, pts);
  ctx.fill();
}

function expandPts(pts: Pt[], factor: number): Pt[] {
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  return pts.map((p) => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor }));
}

function ptsBounds(pts: Pt[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Deterministic smooth value noise in [0,1]. */
function valueNoise(x: number, y: number, seed: number): number {
  const h = (ix: number, iy: number) => {
    let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = h(ix, iy);
  const b = h(ix + 1, iy);
  const c = h(ix, iy + 1);
  const d = h(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Soft cloudy tile for pile sheen — high pile catches light in patches. */
let sheenTile: HTMLCanvasElement | null = null;
function getSheenTile(): HTMLCanvasElement {
  if (sheenTile) return sheenTile;
  const small = document.createElement("canvas");
  small.width = 16;
  small.height = 16;
  const sg = small.getContext("2d")!;
  const img = sg.createImageData(16, 16);
  const rnd = mulberry32(90210);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 92 + Math.floor(rnd() * 72);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  sg.putImageData(img, 0, 0);
  const big = document.createElement("canvas");
  big.width = 256;
  big.height = 256;
  const bg = big.getContext("2d")!;
  bg.imageSmoothingEnabled = true;
  bg.imageSmoothingQuality = "high";
  bg.drawImage(small, 0, 0, 256, 256); // 16x upscale = soft blobs
  sheenTile = big;
  return big;
}

/* ------------------------------------------------------------------ */
/* The photographic render                                              */
/* ------------------------------------------------------------------ */

export function renderMockup(canvas: HTMLCanvasElement, opts: RenderOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const scene = roomById(opts.sceneId);
  const plane = floorPlane(W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.clearRect(0, 0, W, H);
  scene.paintBack(ctx, W, H, plane);

  /** Depth-direction pixels-per-meter at a plane point (for physical sizes). */
  const ppmPlane = (x: number, d: number) => {
    const here = plane(x, d);
    const nearer = plane(x, Math.max(0.05, d - 0.25));
    return Math.abs(here.y - nearer.y) / 0.25;
  };

  if (opts.rug) {
    const p = opts.placement;
    const quad = rugQuad(plane, p);
    const pileH = PILE_HEIGHT[opts.style.pile];
    const diag = Math.hypot(quad[2].x - quad[0].x, quad[2].y - quad[0].y);
    const hw = p.widthM / 2;
    const hl = p.lengthM / 2;

    const cornerLift = (dx: number, dd: number) => {
      const a = rugToPlane(p, dx, dd);
      return pileH * ppmPlane(a.x, a.d);
    };
    const lifts = [cornerLift(-hw, -hl), cornerLift(hw, -hl), cornerLift(hw, hl), cornerLift(-hw, hl)];

    // Organic border wobble — heavy wool never lies in a perfect rectangle.
    // Shared by shadows, side, and face so every layer keeps one silhouette.
    const amp = diag * 0.0085;
    const baseDisp: MeshDisplace = (u, v, pt) => {
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const border = 1 - Math.min(1, edge / 0.1);
      if (border <= 0) return pt;
      const b2 = border * border;
      return {
        x: pt.x + b2 * (valueNoise(u * 4.3, v * 3.7, 11) - 0.5) * amp,
        y: pt.y + b2 * (valueNoise(u * 3.9 + 7, v * 4.1, 23) - 0.5) * amp * 1.6,
      };
    };
    // The face additionally rises by the pile height, settling at the corners.
    const liftAt = (u: number, v: number) => {
      const top = lifts[0] + (lifts[1] - lifts[0]) * u;
      const bot = lifts[3] + (lifts[2] - lifts[3]) * u;
      const lift = top + (bot - top) * v;
      const dc = Math.min(
        Math.hypot(u, v),
        Math.hypot(1 - u, v),
        Math.hypot(1 - u, 1 - v),
        Math.hypot(u, 1 - v),
      );
      const settle = 1 - 0.35 * (1 - Math.min(1, dc / 0.22));
      return lift * settle;
    };
    const faceDisp: MeshDisplace = (u, v, pt) => {
      const b = baseDisp(u, v, pt);
      return { x: b.x, y: b.y - liftAt(u, v) };
    };

    const basePts = quadOutline(quad, 12, baseDisp);
    const facePts = quadOutline(quad, 12, faceDisp);

    // Shadows: three stacked passes from tight ambient occlusion to a wide
    // penumbra, each offset away from the room's window — no uniform blur.
    const dir = scene.light.dirX;
    const shadowPasses = [
      {
        grow: 1.006,
        blur: Math.max(2, W * 0.0026),
        a: opts.style.pile === "high" ? 0.33 : 0.27,
        ox: -dir * W * 0.003,
        oy: H * 0.002,
      },
      { grow: 1.022, blur: W * 0.006, a: 0.13, ox: -dir * W * 0.009, oy: H * 0.006 },
      { grow: 1.05, blur: W * 0.012, a: 0.08, ox: -dir * W * 0.018, oy: H * 0.011 },
    ];
    for (const s of shadowPasses) {
      ctx.save();
      ctx.fillStyle = `rgba(26, 17, 10, ${s.a})`;
      ctx.filter = `blur(${s.blur}px)`;
      ctx.translate(s.ox, s.oy);
      fillPts(ctx, expandPts(basePts, s.grow));
      ctx.restore();
    }

    const colors = sampleRugColors(opts.rug.img);

    // Fringe sits UNDER the rug ends, like real knotted warp threads.
    if (opts.style.fringe) {
      drawFringe(ctx, plane, p, colors.fringe, W);
    }

    // Pile side (the rug's thickness) + a thin AO seam where it meets the floor.
    ctx.save();
    ctx.fillStyle = colors.edge;
    fillPts(ctx, basePts);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(20, 13, 8, 0.28)";
    ctx.lineWidth = Math.max(1, W * 0.0011);
    ctx.filter = `blur(${Math.max(1, W * 0.001)}px)`;
    pathPts(ctx, basePts);
    ctx.stroke();
    ctx.restore();

    // Face — crop, never stretch, when the entered size disagrees with the
    // photo's shape: the weave must keep its true proportions.
    const imgAspect = opts.rug.h / opts.rug.w;
    const targetAspect = p.lengthM / Math.max(0.01, p.widthM);
    let src = { x: 0, y: 0, w: opts.rug.w, h: opts.rug.h };
    const ratio = targetAspect / imgAspect;
    if (ratio < 0.92) {
      const h = opts.rug.h * ratio;
      src = { x: 0, y: (opts.rug.h - h) / 2, w: opts.rug.w, h };
    } else if (ratio > 1.08) {
      const w = opts.rug.w / ratio;
      src = { x: (opts.rug.w - w) / 2, y: 0, w, h: opts.rug.h };
    }
    drawImageInQuad(ctx, opts.rug.img, src, quad, 16, faceDisp);

    // Texture — fine wool grain plus pile-dependent light scatter.
    ctx.save();
    pathPts(ctx, facePts);
    ctx.clip();
    const bounds = ptsBounds(facePts);
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = { flat: 0.07, low: 0.1, high: 0.12 }[opts.style.pile];
    ctx.fillStyle = ctx.createPattern(getNoiseTile(), "repeat")!;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    if (opts.style.pile !== "flat") {
      ctx.globalAlpha = opts.style.pile === "high" ? 0.2 : 0.11;
      ctx.fillStyle = ctx.createPattern(getSheenTile(), "repeat")!;
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    }
    ctx.restore();

    if (opts.style.pile === "flat") {
      // Weft ridges along the weave, drawn in plane space so they converge.
      ctx.save();
      pathPts(ctx, facePts);
      ctx.clip();
      ctx.globalAlpha = 0.045;
      ctx.strokeStyle = "#241a10";
      ctx.lineWidth = Math.max(0.6, W * 0.0005);
      const step = 0.016;
      for (let dd = -hl + step; dd < hl; dd += step) {
        const a = rugToPlane(p, -hw, dd);
        const b = rugToPlane(p, hw, dd);
        const sa = plane(a.x, a.d);
        const sb = plane(b.x, b.d);
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Window light falls across floor AND rug — it no longer stops at the edge.
  for (const pool of scene.lightPools ?? []) {
    poly(
      ctx,
      pool.pts.map(([x, d]) => plane(x, d)),
      pool.color,
      pool.alpha,
    );
  }

  scene.paintFront?.(ctx, W, H, plane);

  // Furniture feet compress the pile where they land on the rug.
  if (opts.rug && opts.style.pile !== "flat") {
    const mapper = planeMapper(W, H);
    const p = opts.placement;
    const hw = p.widthM / 2;
    const hl = p.lengthM / 2;
    for (const [fx, fy] of scene.legPoints ?? []) {
      const sx = fx * W;
      const sy = fy * H;
      const pt = mapper.toPlane(sx, sy);
      const rad = (-p.rotation * Math.PI) / 180;
      const dx = pt.x - p.offsetX;
      const dd = pt.depth - p.depth;
      const lx = dx * Math.cos(rad) - dd * Math.sin(rad);
      const ld = dx * Math.sin(rad) + dd * Math.cos(rad);
      if (Math.abs(lx) > hw - 0.05 || Math.abs(ld) > hl - 0.05) continue;
      const r = 0.07 * ppmPlane(pt.x, pt.depth);
      const a = opts.style.pile === "high" ? 0.3 : 0.18;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `rgba(24, 15, 9, ${a})`);
      g.addColorStop(1, "rgba(24, 15, 9, 0)");
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  gradePass(ctx, W, H, scene.light);
}

/**
 * Whole-frame photographic grade: directional daylight from the window side,
 * the room's color temperature over every layer (this is what makes the rug
 * live IN the light instead of on top of it), a gentle vignette, and film
 * grain to unify the composite.
 */
function gradePass(ctx: CanvasRenderingContext2D, W: number, H: number, light: SceneLight): void {
  ctx.save();
  if (Math.abs(light.dirX) > 0.05) {
    const g = ctx.createLinearGradient(light.dirX > 0 ? W : 0, 0, light.dirX > 0 ? 0 : W, 0);
    const s = 0.14 * Math.abs(light.dirX);
    g.addColorStop(0, `rgba(255, 252, 244, ${s})`);
    g.addColorStop(0.6, "rgba(255, 252, 244, 0)");
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Multiply, not soft-light: a translucent soft-light wash is numerically
  // near-invisible, while multiply genuinely pulls the frame toward the
  // room's color temperature (warm rooms warm the rug).
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgba(${light.tint[0]}, ${light.tint[1]}, ${light.tint[2]}, ${Math.min(1, light.tintAlpha * 2)})`;
  ctx.fillRect(0, 0, W, H);

  const v = ctx.createRadialGradient(
    W / 2,
    H * 0.42,
    Math.min(W, H) * 0.45,
    W / 2,
    H * 0.5,
    Math.hypot(W, H) * 0.62,
  );
  v.addColorStop(0, "rgba(18, 12, 7, 0)");
  v.addColorStop(1, "rgba(18, 12, 7, 0.14)");
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = ctx.createPattern(getNoiseTile(), "repeat")!;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/**
 * Hand-drawn warp fringe at both rug ends: strands clump the way washed
 * cotton does, with jittered length, drift, tone and the odd stray thread.
 * Seeded — identical every render.
 */
function drawFringe(
  ctx: CanvasRenderingContext2D,
  plane: PlaneFn,
  p: RugPlacement,
  color: string,
  W: number,
) {
  const rnd = mulberry32(7 + Math.round(p.widthM * 100) * 31 + Math.round(p.rotation) * 7);
  const hw = p.widthM / 2;
  const hl = p.lengthM / 2;
  const strandCount = Math.max(36, Math.round(p.widthM * 34));

  // Undyed cotton varies thread to thread — three tones around the sampled base.
  const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(color);
  const [br, bg, bb] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [225, 218, 202];
  const tones = [
    color,
    `rgb(${Math.min(255, br + 14)}, ${Math.min(255, bg + 13)}, ${Math.min(255, bb + 11)})`,
    `rgb(${Math.max(0, br - 16)}, ${Math.max(0, bg - 15)}, ${Math.max(0, bb - 13)})`,
  ];

  ctx.save();
  ctx.lineCap = "round";

  for (const end of [-1, 1] as const) {
    let clumpDrift = 0;
    let clumpLeft = 0;
    for (let i = 0; i <= strandCount; i++) {
      if (clumpLeft <= 0) {
        clumpLeft = 4 + Math.floor(rnd() * 6);
        clumpDrift = (rnd() - 0.5) * 0.055;
      }
      clumpLeft--;
      const t = i / strandCount;
      const baseX = -hw + t * p.widthM + (rnd() - 0.5) * 0.012;
      const stray = rnd() < 0.08;
      let len = 0.05 + rnd() * 0.04;
      let drift = clumpDrift + (rnd() - 0.5) * 0.02;
      if (stray) {
        len *= 1.5;
        drift *= 2.2;
      }
      const base = rugToPlane(p, baseX, end * (hl - 0.01));
      const mid = rugToPlane(p, baseX + drift * 0.4, end * (hl + len * 0.55));
      const tip = rugToPlane(p, baseX + drift, end * (hl + len));
      const sBase = plane(base.x, base.d);
      const sMid = plane(mid.x, mid.d);
      const sTip = plane(tip.x, tip.d);
      ctx.strokeStyle = tones[Math.floor(rnd() * 3)];
      ctx.globalAlpha = (stray ? 0.35 : 0.45) + rnd() * 0.45;
      ctx.lineWidth = Math.max(0.7, W * 0.0009 * (0.7 + rnd() * 0.6));
      ctx.beginPath();
      ctx.moveTo(sBase.x, sBase.y);
      ctx.quadraticCurveTo(sMid.x, sMid.y, sTip.x, sTip.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}
