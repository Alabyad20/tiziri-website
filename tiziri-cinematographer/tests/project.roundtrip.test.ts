import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReel, type Reel } from "@tiziri/core";
import { openLibrary } from "@tiziri/library";

// Milestone P0 DoD: "a Reel doc round-trips through disk + SQLite."

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "tiziri-p0-"));
}

test("a Reel with beats round-trips through disk + SQLite unchanged", () => {
  const dir = tmp();
  const lib = openLibrary(dir);
  try {
    const rug = lib.addRug({ name: "Itto", widthCm: 300, lengthCm: 200 });
    const base = createReel({ rugId: rug.id, title: "Itto — Moonrise", aspect: "9:16" });
    const reel: Reel = {
      ...base,
      scene: {
        ...base.scene,
        beats: [
          { id: "b1", presetId: "moonrise", captureId: "hero", durationSec: 8, plateId: "plaster", moonrise: true },
          { id: "b2", presetId: "graze", captureId: "texture", durationSec: 7, plateId: "plaster", moonrise: false },
        ],
      },
    };

    lib.saveReel(reel);
    const loaded = lib.loadReel(reel.id);

    assert.deepEqual(loaded, reel);
  } finally {
    lib.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadReel returns null for an unknown id", () => {
  const dir = tmp();
  const lib = openLibrary(dir);
  try {
    assert.equal(lib.loadReel("does-not-exist"), null);
  } finally {
    lib.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the index survives reopening the same library directory", () => {
  const dir = tmp();
  let lib = openLibrary(dir);
  const rug = lib.addRug({ name: "Yenna", widthCm: 311, lengthCm: 200 });
  const reel = createReel({ rugId: rug.id, title: "Yenna", aspect: "16:9" });
  lib.saveReel(reel);
  lib.close();

  lib = openLibrary(dir); // reopen — simulates a new app session
  try {
    assert.equal(lib.listRugs().length, 1);
    assert.deepEqual(lib.loadReel(reel.id), reel);
  } finally {
    lib.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
