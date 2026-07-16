/**
 * Reel schema migrations. A document written by any past version must load in
 * the current one — this is how a persisted archive survives the product's life
 * (Master Plan §2). Each step upgrades exactly one version; the chain runs until
 * the document is current, then it is validated.
 *
 * v0 → v1 (illustrative, real): the earliest drafts had no `schemaVersion`, used
 * `name` instead of `title`, and could omit `scene.aspect`.
 */
import { type Result } from "@tiziri/shared";
import { validateReel } from "./validate.ts";
import { REEL_SCHEMA_VERSION } from "./reel.ts";
import type { Reel } from "./reel.ts";

type AnyDoc = Record<string, unknown>;

function migrate_v0_to_v1(doc: AnyDoc, now: string): AnyDoc {
  const scene = (typeof doc.scene === "object" && doc.scene !== null ? doc.scene : {}) as AnyDoc;
  return {
    ...doc,
    schemaVersion: 1,
    title: doc.title ?? doc.name ?? "Untitled",
    name: undefined,
    createdAt: doc.createdAt ?? now,
    updatedAt: doc.updatedAt ?? now,
    scene: {
      ...scene,
      aspect: scene.aspect ?? "9:16",
      beats: Array.isArray(scene.beats) ? scene.beats : [],
    },
  };
}

/** Upgrade an unknown persisted document to the current Reel schema, then validate it. */
export function migrateReel(raw: unknown, now: Date = new Date()): Result<Reel, string[]> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: ["reel is not an object"] };
  }
  let doc = raw as AnyDoc;
  const iso = now.toISOString();

  // A missing version means the oldest (v0) shape.
  const version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 0;

  if (version < 1) doc = migrate_v0_to_v1(doc, iso);
  // Future: if (getVersion(doc) < 2) doc = migrate_v1_to_v2(doc, iso); ...

  if ((doc.schemaVersion as number) !== REEL_SCHEMA_VERSION) {
    return {
      ok: false,
      error: [`unsupported reel schemaVersion ${String(doc.schemaVersion)}`],
    };
  }
  return validateReel(doc);
}
