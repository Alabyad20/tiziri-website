/**
 * The Scene model — the declarative description a film is made of.
 *
 * Deliberately data-only and renderer-agnostic: the same Scene drives the WebGPU
 * preview and the offline master, which is the mechanism that enforces
 * "preview == master" (Engineering Master Plan §1.9). No rendering logic lives
 * here. Milestone P0 defines the shape; later milestones add the render backends
 * that consume it. Fields kept intentionally minimal — we add only what a beat
 * needs to be described, not a parameter cockpit (Product Design §14).
 */

/** Export aspect ratios (Cinematography Bible §16). */
export const ASPECTS = ["9:16", "1:1", "16:9"] as const;
export type Aspect = (typeof ASPECTS)[number];

/** A single motivated shot: one preset applied to one capture. */
export interface Beat {
  readonly id: string;
  /** Which of the camera presets (Cinematography Bible §18). */
  readonly presetId: string;
  /** Which capture of the rug this beat draws its pixels from (capture-standard §1). */
  readonly captureId: string;
  readonly durationSec: number;
  /** Independent background plate id. */
  readonly plateId: string;
  /** The moonrise reveal (Cinematography Bible §8) on/off for this beat. */
  readonly moonrise: boolean;
}

/** An ordered sequence of beats plus the target framing. */
export interface Scene {
  readonly aspect: Aspect;
  readonly beats: readonly Beat[];
}

export function isAspect(v: unknown): v is Aspect {
  return typeof v === "string" && (ASPECTS as readonly string[]).includes(v);
}
