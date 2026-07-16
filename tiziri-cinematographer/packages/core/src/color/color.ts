/**
 * Colour management, from day zero (Engineering Master Plan §1.7).
 *
 * The Flat Hero photograph is colour-calibrated and is the reference for truth.
 * All compositing happens in LINEAR light; encode/decode use the correct
 * transfer function per space; conversions go through CIE XYZ (D65). deltaE2000
 * against the calibrated hero is a build gate — see tests/color.roundtrip.test.ts.
 *
 * Nothing here is approximate-by-convenience: implicit sRGB assumptions are the
 * classic way a "colour-accurate" product silently shifts hue. We refuse them.
 */
import { type Mat3, type Vec3, apply, invert } from "./matrix.ts";

export type RgbSpace = "srgb" | "display-p3";

/* ---- transfer functions (encoded [0,1] <-> linear [0,1]) ---- */
// Display P3 shares the sRGB transfer function; only its primaries differ.

export function decodeTransfer(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function encodeTransfer(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/* ---- primaries: linear RGB <-> CIE XYZ (D65) ---- */

const SRGB_TO_XYZ: Mat3 = [
  [0.4123907992659593, 0.357584339383878, 0.1804807884018343],
  [0.2126390058715102, 0.715168678767756, 0.0721923153607337],
  [0.0193308187155918, 0.119194779794626, 0.9505321522496607],
];

const P3_TO_XYZ: Mat3 = [
  [0.4865709486482162, 0.2656676931690931, 0.1982172852343625],
  [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
  [0.0, 0.0451133818589026, 1.043944368900976],
];

const TO_XYZ: Record<RgbSpace, Mat3> = { srgb: SRGB_TO_XYZ, "display-p3": P3_TO_XYZ };
const FROM_XYZ: Record<RgbSpace, Mat3> = {
  srgb: invert(SRGB_TO_XYZ),
  "display-p3": invert(P3_TO_XYZ),
};

/** Encoded 8-bit RGB in a given space → CIE XYZ (D65). */
export function rgb8ToXyz(rgb: Vec3, space: RgbSpace): Vec3 {
  const lin: Vec3 = [
    decodeTransfer(rgb[0] / 255),
    decodeTransfer(rgb[1] / 255),
    decodeTransfer(rgb[2] / 255),
  ];
  return apply(TO_XYZ[space], lin);
}

/** CIE XYZ (D65) → encoded 8-bit RGB in a given space (unclamped channels are clipped). */
export function xyzToRgb8(xyz: Vec3, space: RgbSpace): Vec3 {
  const lin = apply(FROM_XYZ[space], xyz);
  const enc = lin.map((v) => Math.round(clamp01(encodeTransfer(clampLow(v))) * 255)) as unknown as Vec3;
  return enc;
}

/* ---- CIE XYZ (D65) <-> CIELAB ---- */

const D65: Vec3 = [0.9504559270516716, 1.0, 1.0890577507598784];

export function xyzToLab(xyz: Vec3): Vec3 {
  const fx = pivot(xyz[0] / D65[0]);
  const fy = pivot(xyz[1] / D65[1]);
  const fz = pivot(xyz[2] / D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIELAB piecewise pivot (uses the CIE-standard ε and κ as exact fractions).
function pivot(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
}

/* ---- deltaE 2000 (CIEDE2000) ---- */

export function deltaE2000(lab1: Vec3, lab2: Vec3): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = hp(b1, a1p);
  const h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else dhp = diff > 180 ? diff - 360 : diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbarp = h1p + h2p < 360 ? hbarp + 360 : hbarp - 360;
    hbarp /= 2;
  } else {
    hbarp = h1p + h2p;
  }

  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

  return Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) +
      Math.pow(dCp / (kC * Sc), 2) +
      Math.pow(dHp / (kH * Sh), 2) +
      Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh)),
  );
}

/** Convenience: deltaE2000 between two encoded 8-bit colours in given spaces. */
export function deltaE8(a: Vec3, aSpace: RgbSpace, b: Vec3, bSpace: RgbSpace): number {
  return deltaE2000(xyzToLab(rgb8ToXyz(a, aSpace)), xyzToLab(rgb8ToXyz(b, bSpace)));
}

/* ---- helpers ---- */
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function clampLow(v: number): number {
  return v < 0 ? 0 : v;
}
function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function hp(b: number, ap: number): number {
  if (b === 0 && ap === 0) return 0;
  const h = (Math.atan2(b, ap) * 180) / Math.PI;
  return h >= 0 ? h : h + 360;
}
