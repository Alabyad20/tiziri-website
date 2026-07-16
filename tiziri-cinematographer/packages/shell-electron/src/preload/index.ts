/**
 * Preload — the sole, minimal bridge between the sandboxed renderer and main.
 *
 * Runs with contextIsolation on and sandbox on (so this file is CommonJS and can
 * touch only `electron`). It exposes a small TYPED api that forwards to a fixed
 * allow-list of channels via ipcRenderer.invoke. The renderer gets no ipcRenderer,
 * no Node, no arbitrary channel access — only these named methods.
 */
import { contextBridge, ipcRenderer } from "electron";
import { ANALYSIS_EVENT_CHANNEL, type TiziriApi } from "../shared/ipc-contract.ts";
import type { AnalysisEvent } from "../shared/analysis-contract.ts";

const api: TiziriApi = {
  appInfo: () => ipcRenderer.invoke("app:info"),
  listRugs: () => ipcRenderer.invoke("library:list"),
  addRug: (input) => ipcRenderer.invoke("library:addRug", input),
  saveReel: (reel) => ipcRenderer.invoke("library:saveReel", reel),
  loadReel: (id) => ipcRenderer.invoke("library:loadReel", id),
  runChild: (req) => ipcRenderer.invoke("spike:runChild", req),
  cancelChild: (token) => ipcRenderer.invoke("spike:cancelChild", { token }),
  runAnalysis: (req) => ipcRenderer.invoke("analysis:run", req),
  cancelAnalysis: () => ipcRenderer.invoke("analysis:cancel"),
  onAnalysisEvent: (cb: (e: AnalysisEvent) => void) => {
    const listener = (_e: unknown, ev: AnalysisEvent) => cb(ev);
    ipcRenderer.on(ANALYSIS_EVENT_CHANNEL, listener);
    return () => ipcRenderer.removeListener(ANALYSIS_EVENT_CHANNEL, listener);
  },
};

contextBridge.exposeInMainWorld("tiziri", api);
