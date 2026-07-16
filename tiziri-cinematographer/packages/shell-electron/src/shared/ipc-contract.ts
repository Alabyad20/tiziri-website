/**
 * The IPC contract — the ONLY channels that cross the main/renderer boundary.
 *
 * This file is shared by main, preload, and renderer. It imports only TYPES from
 * @tiziri/* (erased at build), so the renderer never pulls in Node-only code.
 * The preload exposes exactly these channels and no more; main registers a
 * handler for exactly these channels and validates every payload (Master Plan §9
 * security checklist: "explicitly allow-listed and validated").
 */
import type { Reel } from "@tiziri/core";
import type { RugRecord, RugInput } from "@tiziri/library";
import type { AnalysisRequestLite, AnalysisEvent } from "./analysis-contract.ts";

export interface AppInfo {
  readonly milestone: string;
  readonly version: string;
  readonly electron: string;
  readonly chrome: string;
  readonly node: string;
}

export interface ChildResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
  readonly signal: string | null;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  readonly durationMs: number;
}

export type LoadReelResult =
  | { readonly ok: true; readonly reel: Reel | null }
  | { readonly ok: false; readonly error: string };

/** channel → { request, response } */
export interface IpcContract {
  "app:info": { req: undefined; res: AppInfo };
  "library:list": { req: undefined; res: RugRecord[] };
  "library:addRug": { req: RugInput; res: RugRecord };
  "library:saveReel": { req: Reel; res: { ok: true } };
  "library:loadReel": { req: string; res: LoadReelResult };
  "spike:runChild": {
    req: { mode: "ok" | "fail" | "hang"; token: string; timeoutMs: number };
    res: ChildResult;
  };
  "spike:cancelChild": { req: { token: string }; res: { cancelled: boolean } };
  "analysis:run": { req: AnalysisRequestLite; res: AnalysisEvent };
  "analysis:cancel": { req: undefined; res: { cancelled: boolean } };
}

export type Channel = keyof IpcContract;

/** The allow-list. Anything not here cannot be invoked from the renderer. */
export const CHANNELS = [
  "app:info",
  "library:list",
  "library:addRug",
  "library:saveReel",
  "library:loadReel",
  "spike:runChild",
  "spike:cancelChild",
  "analysis:run",
  "analysis:cancel",
] as const satisfies readonly Channel[];

/** Main -> renderer push channel for streamed analysis progress/log events. */
export const ANALYSIS_EVENT_CHANNEL = "analysis:event";

/** The typed surface exposed on `window.tiziri` by the preload. */
export interface TiziriApi {
  appInfo(): Promise<AppInfo>;
  listRugs(): Promise<RugRecord[]>;
  addRug(input: RugInput): Promise<RugRecord>;
  saveReel(reel: Reel): Promise<{ ok: true }>;
  loadReel(id: string): Promise<LoadReelResult>;
  runChild(req: IpcContract["spike:runChild"]["req"]): Promise<ChildResult>;
  cancelChild(token: string): Promise<{ cancelled: boolean }>;
  runAnalysis(req: AnalysisRequestLite): Promise<AnalysisEvent>;
  cancelAnalysis(): Promise<{ cancelled: boolean }>;
  /** Subscribe to streamed analysis events; returns an unsubscribe fn. */
  onAnalysisEvent(cb: (e: AnalysisEvent) => void): () => void;
}
