export interface Pt {
  x: number;
  y: number;
}

/** Quad corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt];

export interface Homography {
  map: (u: number, v: number) => Pt;
  /** Inverse: screen point → (u,v) in the unit square. */
  invMap: (x: number, y: number) => Pt;
}

/**
 * Projective map from the unit square (u,v ∈ [0,1]) onto an arbitrary quad,
 * plus its inverse. Closed-form 4-point homography — no linear solver needed.
 */
export function homographyToQuad([p0, p1, p2, p3]: Quad): Homography {
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;

  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;

  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const c = p0.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const f = p0.y;

  // Inverse of [[a,b,c],[d,e,f],[g,h,1]] via adjugate.
  const ia = e - f * h;
  const ib = c * h - b;
  const ic = b * f - c * e;
  const id = f * g - d;
  const ie = a - c * g;
  const iff = c * d - a * f;
  const ig = d * h - e * g;
  const ih = b * g - a * h;
  const ii = a * e - b * d;

  return {
    map(u, v) {
      const w = g * u + h * v + 1;
      return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w };
    },
    invMap(x, y) {
      const w = ig * x + ih * y + ii;
      return { x: (ia * x + ib * y + ic) / w, y: (id * x + ie * y + iff) / w };
    },
  };
}

/**
 * Draw an image onto an arbitrary quad using an N×N mesh of affine triangles.
 * Canvas 2D has no projective transform, so we approximate it piecewise —
 * at 14×14 the seams are sub-pixel.
 */
export function drawImageInQuad(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgW: number,
  imgH: number,
  quad: Quad,
  subdiv = 14,
): void {
  const H = homographyToQuad(quad);

  for (let row = 0; row < subdiv; row++) {
    for (let col = 0; col < subdiv; col++) {
      const u0 = col / subdiv;
      const u1 = (col + 1) / subdiv;
      const v0 = row / subdiv;
      const v1 = (row + 1) / subdiv;

      const d00 = H.map(u0, v0);
      const d10 = H.map(u1, v0);
      const d11 = H.map(u1, v1);
      const d01 = H.map(u0, v1);

      const s = { x0: u0 * imgW, y0: v0 * imgH, x1: u1 * imgW, y1: v1 * imgH };

      drawTriangle(ctx, img, [s.x0, s.y0], [s.x1, s.y0], [s.x0, s.y1], d00, d10, d01);
      drawTriangle(ctx, img, [s.x1, s.y0], [s.x1, s.y1], [s.x0, s.y1], d10, d11, d01);
    }
  }
}

type XY = [number, number];

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: XY,
  s1: XY,
  s2: XY,
  d0: Pt,
  d1: Pt,
  d2: Pt,
): void {
  // Affine transform mapping source triangle → destination triangle.
  const [x0, y0] = s0;
  const [x1, y1] = s1;
  const [x2, y2] = s2;

  const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  if (Math.abs(den) < 1e-9) return;

  const a = (d0.x * (y1 - y2) + d1.x * (y2 - y0) + d2.x * (y0 - y1)) / den;
  const b = (d0.y * (y1 - y2) + d1.y * (y2 - y0) + d2.y * (y0 - y1)) / den;
  const c = (d0.x * (x2 - x1) + d1.x * (x0 - x2) + d2.x * (x1 - x0)) / den;
  const d = (d0.y * (x2 - x1) + d1.y * (x0 - x2) + d2.y * (x1 - x0)) / den;
  const e = d0.x - a * x0 - c * y0;
  const f = d0.y - b * x0 - d * y0;

  // Slightly inflate the clip around the centroid to hide seams between triangles.
  const cx = (d0.x + d1.x + d2.x) / 3;
  const cy = (d0.y + d1.y + d2.y) / 3;
  const grow = (p: Pt): Pt => ({ x: cx + (p.x - cx) * 1.04, y: cy + (p.y - cy) * 1.04 });
  const g0 = grow(d0);
  const g1 = grow(d1);
  const g2 = grow(d2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g0.x, g0.y);
  ctx.lineTo(g1.x, g1.y);
  ctx.lineTo(g2.x, g2.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
