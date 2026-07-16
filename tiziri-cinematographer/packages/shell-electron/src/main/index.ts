/**
 * Electron main — thin, hardened shell (Master Plan §1.2, §9).
 *
 * Owns windowing, IPC registration, the library service, and dev/prod path
 * resolution. Holds no domain logic. A `--self-test` mode runs the headless
 * verification battery and exits — this is how the shell proves itself in CI
 * without a display.
 */
import { app, BrowserWindow } from "electron";
import { mkdirSync } from "node:fs";
import { electronApp } from "@electron-toolkit/utils";
import { openLibrary, type LibraryIndex } from "@tiziri/library";
import { registerIpc } from "./ipc.ts";
import { resolveRendererTarget, resolvePreload, resolveLibraryDir } from "./paths.ts";
import { runSelfTest } from "./self-test.ts";

const here = import.meta.dirname;

const isSelfTest = process.argv.includes("--self-test");
const phaseArg = process.argv.find((a) => a.startsWith("--phase="));
const phase: "write" | "recover" = phaseArg?.split("=")[1] === "recover" ? "recover" : "write";

// Headless CI/self-test environments have no GPU; disable HW acceleration there
// (never in a real desktop session — production wants the GPU).
if (isSelfTest) app.disableHardwareAcceleration();

let lib: LibraryIndex | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: "#0e0f12",
    webPreferences: {
      preload: resolvePreload(here),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Navigation hardening: no popups, no navigating away from our own content.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());

  if (!isSelfTest) win.once("ready-to-show", () => win.show());

  const target = resolveRendererTarget(here);
  if (target.kind === "url") void win.loadURL(target.url);
  else void win.loadFile(target.file);

  return win;
}

void app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.tiziri.cinematographer");

  const libraryDir = resolveLibraryDir(app.getPath("userData"));
  mkdirSync(libraryDir, { recursive: true });
  lib = openLibrary(libraryDir);
  registerIpc(lib, { mainDir: here, userData: app.getPath("userData") });

  const win = createWindow();

  if (isSelfTest) {
    win.webContents.once("did-finish-load", () => {
      void (async () => {
        let code = 1;
        try {
          code = await runSelfTest(win, { phase, libraryDir });
        } catch (e) {
          process.stdout.write(`SELFTEST FAIL exception - ${String((e as Error).stack ?? e)}\n`);
          code = 1;
        } finally {
          lib?.close();
          app.exit(code);
        }
      })();
    });
  }
});

app.on("window-all-closed", () => {
  lib?.close();
  if (process.platform !== "darwin") app.quit();
});
