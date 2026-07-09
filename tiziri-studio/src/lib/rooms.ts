import { homographyToQuad, drawImageInQuad, type Pt, type Quad } from "./homography";

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

export interface RoomScene {
  id: string;
  name: string;
  blurb: string;
  paintBack: (ctx: CanvasRenderingContext2D, W: number, H: number, plane: PlaneFn) => void;
  paintFront?: (ctx: CanvasRenderingContext2D, W: number, H: number, plane: PlaneFn) => void;
}

type PlaneFn = (xM: number, depthM: number) => Pt;

export const PLANE_W = 7; // meters across
export const PLANE_D = 5; // meters deep
const FLOOR_LINE = 0.44; // wall/floor split as a fraction of height

function floorPlane(W: number, H: number): PlaneFn {
  const quad: Quad = [
    { x: 0.16 * W, y: FLOOR_LINE * H }, // far left
    { x: 0.84 * W, y: FLOOR_LINE * H }, // far right
    { x: 1.32 * W, y: H }, // near right
    { x: -0.32 * W, y: H }, // near left
  ];
  const h = homographyToQuad(quad);
  return (xM, depthM) => h.map((xM + PLANE_W / 2) / PLANE_W, depthM / PLANE_D);
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
    paintBack(ctx, W, H, plane) {
      wallAndFloor(ctx, W, H, "#e4dbc8", "#c19d72", "#d3c7ae");
      planks(ctx, plane, "#83643f");

      const fl = FLOOR_LINE * H;
      windowFrame(ctx, 0.66 * W, 0.06 * H, 0.2 * W, 0.31 * H, "#8a7a5f", "#e9e9df", 1);
      // Light pooling on floor from the window
      poly(
        ctx,
        [plane(1.1, 0.1), plane(3.2, 0.1), plane(3.4, 2.6), plane(0.6, 2.6)],
        "#fffbe9",
        0.13,
      );

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
    paintBack(ctx, W, H, plane) {
      wallAndFloor(ctx, W, H, "#d8d1c5", "#d3c3a6", "#c6bca9");
      planks(ctx, plane, "#96825f");

      const fl = FLOOR_LINE * H;
      windowFrame(ctx, 0.12 * W, 0.055 * H, 0.34 * W, 0.32 * H, "#3d3a34", "#e7e6df", 3);
      poly(
        ctx,
        [plane(-3.2, 0.1), plane(-0.4, 0.1), plane(0.2, 2.8), plane(-3.5, 2.8)],
        "#fffdf0",
        0.12,
      );
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

export interface RenderOptions {
  sceneId: string;
  rug: { img: CanvasImageSource; w: number; h: number } | null;
  placement: RugPlacement;
}

/** Rug corner points on the floor plane, mapped to screen space. */
function rugQuad(plane: PlaneFn, p: RugPlacement): Quad {
  const rad = (p.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = p.widthM / 2;
  const hl = p.lengthM / 2;
  const corner = (dx: number, dd: number): Pt => {
    const x = p.offsetX + dx * cos - dd * sin;
    const d = p.depth + dx * sin + dd * cos;
    return plane(x, Math.max(0.05, Math.min(PLANE_D - 0.05, d)));
  };
  return [corner(-hw, -hl), corner(hw, -hl), corner(hw, hl), corner(-hw, hl)];
}

export function renderMockup(canvas: HTMLCanvasElement, opts: RenderOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const scene = roomById(opts.sceneId);
  const plane = floorPlane(W, H);

  ctx.clearRect(0, 0, W, H);
  scene.paintBack(ctx, W, H, plane);

  if (opts.rug) {
    const quad = rugQuad(plane, opts.placement);

    // Soft drop shadow under the rug
    ctx.save();
    ctx.fillStyle = "rgba(30, 20, 12, 0.22)";
    ctx.filter = `blur(${Math.max(4, W * 0.006)}px)`;
    ctx.beginPath();
    quad.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + H * 0.006) : ctx.lineTo(p.x, p.y + H * 0.006)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawImageInQuad(ctx, opts.rug.img, opts.rug.w, opts.rug.h, quad, 16);
  }

  scene.paintFront?.(ctx, W, H, plane);
}
