/**
 * Runtime validation of a Reel document. Hand-rolled (no schema dependency) so
 * `core` stays dependency-free and the rules are explicit and auditable.
 */
import { type Result, ok, err } from "@tiziri/shared";
import { isAspect } from "../scene/index.ts";
import type { Reel } from "./reel.ts";
import type { Beat } from "../scene/index.ts";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStr(v: unknown): v is string {
  return typeof v === "string";
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateBeat(v: unknown, i: number, errs: string[]): void {
  if (!isObj(v)) {
    errs.push(`beat[${i}] is not an object`);
    return;
  }
  if (!isStr(v.id)) errs.push(`beat[${i}].id must be a string`);
  if (!isStr(v.presetId)) errs.push(`beat[${i}].presetId must be a string`);
  if (!isStr(v.captureId)) errs.push(`beat[${i}].captureId must be a string`);
  if (!isStr(v.plateId)) errs.push(`beat[${i}].plateId must be a string`);
  if (!isNum(v.durationSec) || v.durationSec <= 0)
    errs.push(`beat[${i}].durationSec must be a positive number`);
  if (typeof v.moonrise !== "boolean") errs.push(`beat[${i}].moonrise must be a boolean`);
}

/** Validate an unknown value as a well-formed Reel. Returns typed errors, never throws. */
export function validateReel(v: unknown): Result<Reel, string[]> {
  const errs: string[] = [];
  if (!isObj(v)) return err(["reel is not an object"]);

  if (!isNum(v.schemaVersion)) errs.push("schemaVersion must be a number");
  if (!isStr(v.id)) errs.push("id must be a string");
  if (!isStr(v.rugId)) errs.push("rugId must be a string");
  if (!isStr(v.title)) errs.push("title must be a string");
  if (!isStr(v.createdAt)) errs.push("createdAt must be an ISO string");
  if (!isStr(v.updatedAt)) errs.push("updatedAt must be an ISO string");

  const scene = v.scene;
  if (!isObj(scene)) {
    errs.push("scene must be an object");
  } else {
    if (!isAspect(scene.aspect)) errs.push("scene.aspect must be one of 9:16 | 1:1 | 16:9");
    if (!Array.isArray(scene.beats)) errs.push("scene.beats must be an array");
    else scene.beats.forEach((b, i) => validateBeat(b, i, errs));
  }

  if (errs.length > 0) return err(errs);
  // Shape verified above; the cast is now sound.
  return ok(v as unknown as Reel);
}

export type { Beat };
