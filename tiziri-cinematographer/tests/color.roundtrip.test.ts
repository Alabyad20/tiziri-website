import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type Vec3,
  decodeTransfer,
  encodeTransfer,
  rgb8ToXyz,
  xyzToRgb8,
  xyzToLab,
  deltaE2000,
  deltaE8,
} from "@tiziri/core";

// Milestone P0 DoD: "a colour round-trip test passes deltaE < 1."

test("sRGB transfer function is its own inverse", () => {
  for (let i = 0; i <= 100; i++) {
    const x = i / 100;
    assert.ok(Math.abs(encodeTransfer(decodeTransfer(x)) - x) < 1e-9);
  }
});

test("white maps to Lab L≈100, neutral chroma", () => {
  const lab = xyzToLab(rgb8ToXyz([255, 255, 255], "srgb"));
  assert.ok(Math.abs(lab[0] - 100) < 0.01, `L=${lab[0]}`);
  assert.ok(Math.hypot(lab[1], lab[2]) < 0.02, `chroma=${Math.hypot(lab[1], lab[2])}`);
});

test("sRGB → XYZ → 8-bit Display-P3 → back stays within deltaE < 1", () => {
  const patches: Vec3[] = [
    [0, 0, 0],
    [255, 255, 255],
    [128, 128, 128],
    [239, 233, 224], // TIZIRI plaster
    [31, 138, 134], // a teal rug border
    [200, 60, 60],
    [60, 60, 200],
    [180, 160, 90],
  ];
  for (const p of patches) {
    const xyz = rgb8ToXyz(p, "srgb");
    const p3 = xyzToRgb8(xyz, "display-p3"); // encode into the wider working space
    const back = rgb8ToXyz(p3, "display-p3"); // decode it again
    const dE = deltaE2000(xyzToLab(xyz), xyzToLab(back));
    assert.ok(dE < 1, `patch ${p.join(",")} round-tripped with deltaE=${dE.toFixed(3)}`);
  }
});

test("deltaE2000 is zero for identical colours and matches a Sharma reference", () => {
  assert.equal(deltaE2000([50, 2, -3], [50, 2, -3]), 0);
  // Sharma et al. CIEDE2000 reference pair #1 → 2.0425.
  const dE = deltaE2000([50.0, 2.6772, -79.7751], [50.0, 0.0, -82.7485]);
  assert.ok(Math.abs(dE - 2.0425) < 0.01, `expected ~2.0425, got ${dE}`);
});

test("deltaE8 convenience agrees with the manual path", () => {
  const a: Vec3 = [120, 80, 40];
  const b: Vec3 = [122, 78, 44];
  const manual = deltaE2000(xyzToLab(rgb8ToXyz(a, "srgb")), xyzToLab(rgb8ToXyz(b, "srgb")));
  assert.ok(Math.abs(deltaE8(a, "srgb", b, "srgb") - manual) < 1e-9);
});
