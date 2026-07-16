/**
 * The Reel — the project document. A rug's film, as serializable data.
 *
 * The Reel is the persisted truth (Product Design §15): a JSON file on disk is
 * the source of truth, indexed in SQLite. It is schema-versioned from day one so
 * documents written today survive every future change (Master Plan §2).
 */
import { uid } from "@tiziri/shared";
import type { Scene, Aspect } from "../scene/index.ts";

/** Bump when the on-disk shape changes; add a step in migrate.ts. */
export const REEL_SCHEMA_VERSION = 1 as const;

export interface Reel {
  readonly schemaVersion: number;
  readonly id: string;
  readonly rugId: string;
  readonly title: string;
  readonly scene: Scene;
  /** ISO-8601 timestamps. */
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NewReelInput {
  readonly rugId: string;
  readonly title: string;
  readonly aspect: Aspect;
}

/** Create a fresh, empty Reel at the current schema version. */
export function createReel(input: NewReelInput, now: Date = new Date()): Reel {
  const iso = now.toISOString();
  return {
    schemaVersion: REEL_SCHEMA_VERSION,
    id: uid(),
    rugId: input.rugId,
    title: input.title,
    scene: { aspect: input.aspect, beats: [] },
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Return a copy with a bumped updatedAt — reels are immutable values. */
export function touch(reel: Reel, now: Date = new Date()): Reel {
  return { ...reel, updatedAt: now.toISOString() };
}
