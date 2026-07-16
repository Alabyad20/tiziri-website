/**
 * Headless self-test — verifies the hardened shell WITHOUT a human at the screen.
 *
 * It drives the real renderer -> preload -> main path via executeJavaScript, checks
 * the security posture from the authoritative main side, exercises every P0
 * workflow through IPC, and validates the child-process spike. Two phases:
 *   write   - run the full battery + persist a recovery fixture
 *   recover - a FRESH process reads that fixture back (restart recovery)
 *
 * Prints `CHECK PASS|FAIL <name> - <detail>` lines and returns an exit code.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrowserWindow } from "electron";

interface Ctx {
  pass: number;
  fail: number;
}

function check(ctx: Ctx, name: string, ok: boolean, detail = ""): void {
  if (ok) ctx.pass++;
  else ctx.fail++;
  process.stdout.write(`CHECK ${ok ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}\n`);
}

async function evalJs<T>(win: BrowserWindow, code: string): Promise<T> {
  return (await win.webContents.executeJavaScript(code, true)) as T;
}

async function waitForReady(win: BrowserWindow): Promise<boolean> {
  for (let i = 0; i < 100; i++) {
    const ready = await evalJs<boolean>(
      win,
      `document.querySelector('[data-testid=ready]')?.textContent === 'ready'`,
    );
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

export async function runSelfTest(
  win: BrowserWindow,
  opts: { phase: "write" | "recover"; libraryDir: string },
): Promise<number> {
  const ctx: Ctx = { pass: 0, fail: 0 };
  const marker = join(opts.libraryDir, "selftest-marker.json");

  /* security posture (authoritative, from main) */
  const prefs = (
    win.webContents as unknown as {
      getLastWebPreferences(): {
        contextIsolation?: boolean;
        nodeIntegration?: boolean;
        sandbox?: boolean;
      } | null;
    }
  ).getLastWebPreferences();
  check(ctx, "contextIsolation-enabled", prefs?.contextIsolation === true, String(prefs?.contextIsolation));
  check(ctx, "nodeIntegration-disabled", prefs?.nodeIntegration !== true, String(prefs?.nodeIntegration));
  check(ctx, "sandbox-enabled", prefs?.sandbox === true, String(prefs?.sandbox));

  /* renderer loaded + is Node-free */
  const ready = await waitForReady(win);
  check(ctx, "react-ui-loaded", ready, ready ? "" : "renderer never became ready");
  const h1 = await evalJs<string>(win, `document.querySelector('h1')?.textContent ?? ''`);
  check(ctx, "react-rendered-content", h1 === "Tiziri", h1);
  const nodeFree = await evalJs<boolean>(
    win,
    `typeof require==='undefined' && typeof process==='undefined' && typeof module==='undefined' && typeof global==='undefined'`,
  );
  check(ctx, "renderer-has-no-node", nodeFree === true);

  /* preload exposes ONLY the minimal typed api */
  const apiKeys = await evalJs<string[]>(win, `Object.keys(window.tiziri).sort()`);
  const expected = ["addRug", "appInfo", "cancelChild", "listRugs", "loadReel", "runChild", "saveReel"];
  check(ctx, "preload-api-exact", JSON.stringify(apiKeys) === JSON.stringify(expected), apiKeys.join(","));
  const noIpcRenderer = await evalJs<boolean>(
    win,
    `typeof window.ipcRenderer==='undefined' && typeof window.require==='undefined'`,
  );
  check(ctx, "no-raw-ipc-or-require-on-window", noIpcRenderer === true);

  /* renderer cannot reach fs / child_process directly */
  const fsBlocked = await evalJs<boolean>(
    win,
    `(() => { try { return typeof require==='undefined'; } catch { return true; } })()`,
  );
  check(ctx, "renderer-no-fs-or-childprocess", fsBlocked === true);

  if (opts.phase === "write") {
    /* P0 workflow via IPC: add rug, list, save/load reel */
    const added = await evalJs<{ id: string; slug: string }>(
      win,
      `window.tiziri.addRug({ name: 'Selftest Rug', widthCm: 300, lengthCm: 200, captures: { hero: true } })`,
    );
    check(ctx, "ipc-addRug", typeof added?.id === "string" && added.slug === "selftest-rug", added?.slug);

    const listLen = await evalJs<number>(win, `window.tiziri.listRugs().then(r => r.length)`);
    check(ctx, "ipc-listRugs", listLen >= 1, String(listLen));

    const roundTrip = await evalJs<{ equal: boolean; id: string }>(
      win,
      `(async () => {
        const rugs = await window.tiziri.listRugs();
        const rugId = rugs[0].id;
        const reel = { schemaVersion: 1, id: 'selftest-reel', rugId, title: 'Selftest Reel',
          scene: { aspect: '9:16', beats: [{ id: 'b1', presetId: 'moonrise', captureId: 'hero', durationSec: 8, plateId: 'plaster', moonrise: true }] },
          createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z' };
        await window.tiziri.saveReel(reel);
        const loaded = await window.tiziri.loadReel('selftest-reel');
        return { equal: loaded.ok && JSON.stringify(loaded.reel) === JSON.stringify(reel), id: rugId };
      })()`,
    );
    check(ctx, "ipc-reel-save-load-roundtrip", roundTrip.equal);

    const unknown = await evalJs<{ ok: boolean; reel: unknown }>(win, `window.tiziri.loadReel('nope')`);
    check(ctx, "ipc-loadReel-unknown-null", unknown.ok === true && unknown.reel === null);

    /* corrupted project handling: save a valid reel, then corrupt its file */
    const corrupt = await evalJs<{ ok: boolean; error?: string }>(
      win,
      `(async () => {
        const reel = { schemaVersion: 1, id: 'corrupt-reel', rugId: 'x', title: 'C',
          scene: { aspect: '1:1', beats: [] }, createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z' };
        await window.tiziri.saveReel(reel);
        return await window.tiziri.loadReel('corrupt-reel');
      })()`,
    );
    writeFileSync(join(opts.libraryDir, "reels", "corrupt-reel.json"), "{ broken", "utf8");
    const corruptLoad = await evalJs<{ ok: boolean; error?: string }>(
      win,
      `window.tiziri.loadReel('corrupt-reel')`,
    );
    check(
      ctx,
      "corrupted-project-structured-error",
      corrupt.ok === true && corruptLoad.ok === false,
      corruptLoad.error ?? "",
    );

    /* child-process spike */
    const okRun = await evalJs<{ code: number; stdout: string }>(
      win,
      `window.tiziri.runChild({ mode: 'ok', token: 't-ok', timeoutMs: 5000 })`,
    );
    check(ctx, "spike-child-ok", okRun.code === 0 && okRun.stdout.includes("hello from child"), `code=${okRun.code}`);

    const failRun = await evalJs<{ code: number; stderr: string }>(
      win,
      `window.tiziri.runChild({ mode: 'fail', token: 't-fail', timeoutMs: 5000 })`,
    );
    check(ctx, "spike-child-exit-code", failRun.code === 3 && failRun.stderr.includes("deliberate failure"), `code=${failRun.code}`);

    const timeoutRun = await evalJs<{ timedOut: boolean; code: number | null }>(
      win,
      `window.tiziri.runChild({ mode: 'hang', token: 't-timeout', timeoutMs: 400 })`,
    );
    check(ctx, "spike-child-timeout", timeoutRun.timedOut === true, `timedOut=${timeoutRun.timedOut}`);

    const cancelRun = await evalJs<{ c: { cancelled: boolean }; res: { cancelled: boolean } }>(
      win,
      `(async () => {
        const p = window.tiziri.runChild({ mode: 'hang', token: 't-cancel', timeoutMs: 0 });
        await new Promise(r => setTimeout(r, 250));
        const c = await window.tiziri.cancelChild('t-cancel');
        const res = await p;
        return { c, res };
      })()`,
    );
    check(ctx, "spike-child-cancel", cancelRun.c.cancelled === true && cancelRun.res.cancelled === true);

    /* persist a recovery fixture for phase 2 */
    const fixture = await evalJs<{ rugId: string; reelId: string; reelJson: string }>(
      win,
      `(async () => {
        const rug = await window.tiziri.addRug({ name: 'Recovery Rug', widthCm: 250, lengthCm: 180 });
        const reel = { schemaVersion: 1, id: 'recovery-reel', rugId: rug.id, title: 'Recovery',
          scene: { aspect: '16:9', beats: [] }, createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z' };
        await window.tiziri.saveReel(reel);
        return { rugId: rug.id, reelId: reel.id, reelJson: JSON.stringify(reel) };
      })()`,
    );
    writeFileSync(marker, JSON.stringify(fixture), "utf8");
    check(ctx, "recovery-fixture-written", true, `rug=${fixture.rugId.slice(0, 8)}`);
  } else {
    /* phase: recover - a fresh process reads what phase 1 persisted */
    const fixture = JSON.parse(readFileSync(marker, "utf8")) as {
      rugId: string;
      reelId: string;
      reelJson: string;
    };
    const found = await evalJs<boolean>(
      win,
      `window.tiziri.listRugs().then(rs => rs.some(r => r.id === ${JSON.stringify(fixture.rugId)}))`,
    );
    check(ctx, "restart-recovery-rug-persisted", found === true);
    const reel = await evalJs<{ ok: boolean; reel: unknown }>(
      win,
      `window.tiziri.loadReel(${JSON.stringify(fixture.reelId)})`,
    );
    check(
      ctx,
      "restart-recovery-reel-persisted",
      reel.ok === true && JSON.stringify(reel.reel) === fixture.reelJson,
    );
  }

  /* path with spaces + non-ASCII actually worked */
  const hasSpace = opts.libraryDir.includes(" ");
  const hasNonAscii = [...opts.libraryDir].some((c) => c.charCodeAt(0) > 127);
  check(ctx, "library-path-spaces-and-nonascii", hasSpace && hasNonAscii, opts.libraryDir);

  process.stdout.write(`SELFTEST ${ctx.fail === 0 ? "PASS" : "FAIL"} ${ctx.pass}/${ctx.pass + ctx.fail}\n`);
  return ctx.fail === 0 ? 0 : 1;
}
