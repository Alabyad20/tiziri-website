/**
 * Preload — the sole, minimal bridge between the sandboxed renderer and main.
 *
 * Runs with contextIsolation on and sandbox on (so this file is CommonJS and can
 * touch only `electron`). It exposes a small TYPED api that forwards to a fixed
 * allow-list of channels via ipcRenderer.invoke. The renderer gets no ipcRenderer,
 * no Node, no arbitrary channel access — only these named methods.
 */
import { contextBridge, ipcRenderer } from "electron";
import type { TiziriApi } from "../shared/ipc-contract.ts";

const api: TiziriApi = {
  appInfo: () => ipcRenderer.invoke("app:info"),
  listRugs: () => ipcRenderer.invoke("library:list"),
  addRug: (input) => ipcRenderer.invoke("library:addRug", input),
  saveReel: (reel) => ipcRenderer.invoke("library:saveReel", reel),
  loadReel: (id) => ipcRenderer.invoke("library:loadReel", id),
  runChild: (req) => ipcRenderer.invoke("spike:runChild", req),
  cancelChild: (token) => ipcRenderer.invoke("spike:cancelChild", { token }),
};

contextBridge.exposeInMainWorld("tiziri", api);
