/**
 * IPC registry — every channel is allow-listed AND its payload validated before
 * any action (never trust the renderer). Handlers live only in main; the renderer
 * reaches them solely through the preload's fixed api.
 */
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { app, ipcMain, type WebContents } from "electron";
import { validateReel } from "@tiziri/core";
import type { LibraryIndex, RugInput } from "@tiziri/library";
import {
  CHANNELS, ANALYSIS_EVENT_CHANNEL,
  type AppInfo, type LoadReelResult, type ChildResult,
} from "../shared/ipc-contract.ts";
import type { AnalysisRequestLite } from "../shared/analysis-contract.ts";
import { runChild, cancelChild } from "./child-process.ts";
import { runAnalysis, type RunHandle } from "./analysis-service.ts";
import { resolveAnalysisDir, resolveModelsDir } from "./paths.ts";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseRugInput(v: unknown): RugInput {
  if (!isObj(v)) throw new Error("addRug: payload must be an object");
  const name = v["name"];
  const widthCm = v["widthCm"];
  const lengthCm = v["lengthCm"];
  if (typeof name !== "string" || name.trim() === "") throw new Error("addRug: name required");
  if (typeof widthCm !== "number" || !Number.isFinite(widthCm) || widthCm <= 0)
    throw new Error("addRug: widthCm must be a positive number");
  if (typeof lengthCm !== "number" || !Number.isFinite(lengthCm) || lengthCm <= 0)
    throw new Error("addRug: lengthCm must be a positive number");
  const captures = v["captures"];
  return {
    name,
    widthCm,
    lengthCm,
    ...(isObj(captures) ? { captures: captures as Record<string, boolean> } : {}),
  };
}

function parseChildReq(v: unknown): { mode: "ok" | "fail" | "hang"; token: string; timeoutMs: number } {
  if (!isObj(v)) throw new Error("runChild: payload must be an object");
  const mode = v["mode"];
  const token = v["token"];
  const timeoutMs = v["timeoutMs"];
  if (mode !== "ok" && mode !== "fail" && mode !== "hang") throw new Error("runChild: invalid mode");
  if (typeof token !== "string" || token === "") throw new Error("runChild: token required");
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs < 0)
    throw new Error("runChild: timeoutMs must be a non-negative number");
  return { mode, token, timeoutMs };
}

function parseAnalysisReq(v: unknown): AnalysisRequestLite {
  if (!isObj(v)) throw new Error("analysis: payload must be an object");
  const image_path = v["image_path"];
  const w = v["rug_width_cm"];
  const h = v["rug_height_cm"];
  if (typeof image_path !== "string" || image_path === "") throw new Error("analysis: image_path required");
  if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) throw new Error("analysis: rug_width_cm must be positive");
  if (typeof h !== "number" || !Number.isFinite(h) || h <= 0) throw new Error("analysis: rug_height_cm must be positive");
  const seg = v["segmenter"];
  const pts = v["points"];
  let points: number[][] | undefined;
  if (Array.isArray(pts)) {
    points = [];
    for (const p of pts) {
      if (!Array.isArray(p) || p.length !== 3 || !p.every((n) => typeof n === "number" && Number.isFinite(n)))
        throw new Error("analysis: each point must be [x, y, label]");
      points.push(p as number[]);
    }
  }
  return {
    image_path, rug_width_cm: w, rug_height_cm: h,
    ...(seg === "auto" || seg === "sam2" || seg === "grabcut" ? { segmenter: seg } : {}),
    ...(typeof v["with_depth"] === "boolean" ? { with_depth: v["with_depth"] } : {}),
    ...(points ? { points } : {}),
    ...(typeof v["preview_only"] === "boolean" ? { preview_only: v["preview_only"] } : {}),
  };
}

/** Read a small preview PNG back as a data URL so the sandboxed renderer can show
 * it (file:// is blocked; data: is allowed by the CSP's img-src). */
function attachPreviewDataUrl(result: Record<string, unknown>): Record<string, unknown> {
  const arts = result["artifacts"] as { preview?: string } | undefined;
  if (result["type"] === "result" && arts?.preview) {
    try {
      result["previewDataUrl"] = "data:image/png;base64," + readFileSync(arts.preview).toString("base64");
    } catch {
      /* ignore */
    }
  }
  return result;
}

export function registerIpc(lib: LibraryIndex, ctx: { mainDir: string; userData: string }): void {
  const analysisDir = resolveAnalysisDir(ctx.mainDir);
  const modelsDir = resolveModelsDir(ctx.mainDir);
  const analysisRoot = join(ctx.userData, "analysis");
  let currentRun: RunHandle | null = null;

  ipcMain.handle("analysis:run", async (event, arg: unknown) => {
    const lite = parseAnalysisReq(arg);
    const sender: WebContents = event.sender;
    const handle = runAnalysis(
      {
        ...lite,
        out_dir: join(analysisRoot, lite.preview_only ? "preview" : "out"),
        cache_dir: join(analysisRoot, "cache"),
      },
      {
        analysisDir, modelsDir, timeoutMs: 180000,
        onEvent: (e) => { if (!sender.isDestroyed()) sender.send(ANALYSIS_EVENT_CHANNEL, e); },
      },
    );
    currentRun = handle;
    try {
      const res = await handle.promise;
      return attachPreviewDataUrl(res as unknown as Record<string, unknown>);
    } finally {
      currentRun = null;
    }
  });

  ipcMain.handle("analysis:cancel", () => {
    const active = currentRun !== null;
    currentRun?.cancel();
    return { cancelled: active };
  });

  ipcMain.handle("app:info", (): AppInfo => {
    return {
      milestone: "P0",
      version: app.getVersion(),
      electron: process.versions.electron ?? "",
      chrome: process.versions.chrome ?? "",
      node: process.versions.node,
    };
  });

  ipcMain.handle("library:list", () => lib.listRugs());

  ipcMain.handle("library:addRug", (_e, arg: unknown) => lib.addRug(parseRugInput(arg)));

  ipcMain.handle("library:saveReel", (_e, arg: unknown) => {
    const result = validateReel(arg);
    if (!result.ok) throw new Error(`saveReel: invalid reel — ${result.error.join("; ")}`);
    lib.saveReel(result.value);
    return { ok: true } as const;
  });

  // Corrupted/invalid projects are returned as a STRUCTURED error, never a crash.
  ipcMain.handle("library:loadReel", (_e, arg: unknown): LoadReelResult => {
    if (typeof arg !== "string") return { ok: false, error: "loadReel: id must be a string" };
    try {
      return { ok: true, reel: lib.loadReel(arg) };
    } catch (e) {
      return { ok: false, error: String((e as Error).message ?? e) };
    }
  });

  ipcMain.handle("spike:runChild", (_e, arg: unknown): Promise<ChildResult> => runChild(parseChildReq(arg)));

  ipcMain.handle("spike:cancelChild", (_e, arg: unknown) => {
    if (!isObj(arg) || typeof arg["token"] !== "string") throw new Error("cancelChild: token required");
    return cancelChild(arg["token"]);
  });

  // Safety net: assert we registered exactly the allow-listed channels.
  const registered = new Set(CHANNELS);
  if (registered.size !== CHANNELS.length) throw new Error("duplicate channel in allow-list");
}
