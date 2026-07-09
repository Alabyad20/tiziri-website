/**
 * Platform layer — the ONLY module allowed to touch host capabilities
 * (storage, clipboard, file export, printing). Everything above this
 * (stores, lib engines, pages) talks to these functions, never to
 * window/navigator/document APIs directly.
 *
 * Porting targets swap this module:
 *  - PWA:            unchanged (add a service worker + manifest install flow)
 *  - Electron/Tauri: downloadDataUrl → native save dialog (ipc/fs),
 *                    printDocument → webContents.print / tauri print
 *  - React Native:   storage → AsyncStorage, copyText → Clipboard API,
 *                    downloadDataUrl → CameraRoll/FileSystem, print → expo-print
 */

import type { StateStorage } from "zustand/middleware";

/** Key-value persistence backing every zustand store. */
export const storage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

/** Copy text to the system clipboard. Resolves false when unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Save a data URL as a file with the given name. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Open the host print flow (used for PDF export via the print stylesheet). */
export function printDocument(): void {
  window.print();
}

/** Whether the pointer is coarse (touch-first device) — used for layout hints only. */
export function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}
