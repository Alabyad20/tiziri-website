import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openLibrary } from "@tiziri/library";

// Milestone P0 demo: "load a rug into the Library, see it indexed."

test("rugs are added, indexed, listed newest-first, and fetched by id", () => {
  const dir = mkdtempSync(join(tmpdir(), "tiziri-p0-lib-"));
  const lib = openLibrary(dir);
  try {
    const itto = lib.addRug({
      name: "Itto",
      widthCm: 300,
      lengthCm: 200,
      captures: { hero: true, texture: true, fringe: false },
    });
    const yenna = lib.addRug({ name: "Yenna", widthCm: 311, lengthCm: 200 });

    const all = lib.listRugs();
    assert.equal(all.length, 2);
    // newest-first ordering
    assert.equal(all[0]?.id, yenna.id);
    assert.equal(all[1]?.id, itto.id);

    const fetched = lib.getRug(itto.id);
    assert.equal(fetched?.name, "Itto");
    assert.equal(fetched?.slug, "itto");
    assert.equal(fetched?.widthCm, 300);
    assert.deepEqual(fetched?.captures, { hero: true, texture: true, fringe: false });

    assert.equal(lib.getRug("nope"), null);
  } finally {
    lib.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
