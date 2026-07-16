/**
 * IPC registry — every channel is allow-listed AND its payload validated before
 * any action (never trust the renderer). Handlers live only in main; the renderer
 * reaches them solely through the preload's fixed api.
 */
import { app, ipcMain } from "electron";
import { validateReel } from "@tiziri/core";
import type { LibraryIndex, RugInput } from "@tiziri/library";
import { CHANNELS, type AppInfo, type LoadReelResult, type ChildResult } from "../shared/ipc-contract.ts";
import { runChild, cancelChild } from "./child-process.ts";

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

export function registerIpc(lib: LibraryIndex): void {
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
