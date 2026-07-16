/**
 * Path resolution — development vs packaged production are separated here, and
 * nowhere else (Master Plan §3 P0 DoD: "development and packaged-production path
 * resolution separated correctly").
 */
import { join } from "node:path";
import { is } from "@electron-toolkit/utils";

/** How the renderer is located: the Vite dev server in dev, the built file in prod. */
export type RendererTarget = { readonly kind: "url"; readonly url: string } | { readonly kind: "file"; readonly file: string };

export function resolveRendererTarget(mainDir: string): RendererTarget {
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (is.dev && devUrl) return { kind: "url", url: devUrl };
  // Production layout (electron-vite): out/main/index.js → out/renderer/index.html
  return { kind: "file", file: join(mainDir, "..", "renderer", "index.html") };
}

/** The preload script, resolved relative to the built main directory. */
export function resolvePreload(mainDir: string): string {
  return join(mainDir, "..", "preload", "index.cjs");
}

/**
 * Where the local-first library lives. In self-test/CI this is overridden via env
 * so tests can use temp dirs — including ones with spaces and non-ASCII — without
 * touching the real user profile.
 */
export function resolveLibraryDir(userData: string): string {
  const override = process.env["TIZIRI_LIBRARY_DIR"];
  return override && override.length > 0 ? override : join(userData, "library");
}
