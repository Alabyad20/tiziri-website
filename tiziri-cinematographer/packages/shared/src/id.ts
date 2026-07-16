import { randomUUID } from "node:crypto";

/** A stable, URL-safe id for library entities (rugs, reels, beats). */
export function uid(): string {
  return randomUUID();
}

/** A filesystem/URL-safe slug derived from a human name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
