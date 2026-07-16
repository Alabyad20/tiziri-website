import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateReel, validateReel, createReel } from "@tiziri/core";

// Migrations: a document written by any past version must load in the current one.

test("a v0 document (no schemaVersion, `name`, no aspect) upgrades to current", () => {
  const v0 = {
    id: "r1",
    rugId: "rug1",
    name: "Old Draft", // v0 used `name`, not `title`
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    scene: { beats: [] }, // v0 could omit aspect
  };
  const r = migrateReel(v0);
  assert.ok(r.ok, r.ok ? "" : r.error.join("; "));
  if (r.ok) {
    assert.equal(r.value.schemaVersion, 1);
    assert.equal(r.value.title, "Old Draft");
    assert.equal(r.value.scene.aspect, "9:16");
    assert.equal((r.value as unknown as Record<string, unknown>).name, undefined);
  }
});

test("a current reel passes migration unchanged", () => {
  const reel = createReel({ rugId: "rug1", title: "Fresh", aspect: "1:1" });
  const r = migrateReel(reel);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value, reel);
});

test("an invalid document is rejected with useful errors", () => {
  const bad = { schemaVersion: 1, id: "x", title: "No rug", scene: { aspect: "9:16", beats: [] } };
  const r = validateReel(bad);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.error.some((e) => e.includes("rugId")));
});

test("a beat with a non-positive duration is rejected", () => {
  const reel = createReel({ rugId: "rug1", title: "Bad beat", aspect: "9:16" });
  const withBadBeat = {
    ...reel,
    scene: {
      ...reel.scene,
      beats: [{ id: "b", presetId: "p", captureId: "c", plateId: "pl", durationSec: 0, moonrise: false }],
    },
  };
  const r = validateReel(withBadBeat);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.error.some((e) => e.includes("durationSec")));
});
