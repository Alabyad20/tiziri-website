/**
 * Process-orchestration SPIKE (Master Plan §3 P0, requested hardening item 8).
 *
 * This validates ONLY the mechanism P1's Python analysis sidecar will use:
 * spawn an external process, stream stdout/stderr, and support exit codes,
 * timeouts, and cancellation. It downloads no models and runs no Python — it
 * spawns a harmless script under Electron's own Node (ELECTRON_RUN_AS_NODE) so it
 * needs no system toolchain.
 */
import { spawn, type ChildProcess } from "node:child_process";
import type { ChildResult } from "../shared/ipc-contract.ts";

interface Running {
  readonly child: ChildProcess;
  cancelled: boolean;
  timedOut: boolean;
  timer: NodeJS.Timeout | null;
}

const registry = new Map<string, Running>();

const SCRIPTS: Record<"ok" | "fail" | "hang", string> = {
  ok: "process.stdout.write('hello from child'); process.stderr.write('a note'); process.exit(0);",
  fail: "process.stderr.write('deliberate failure'); process.exit(3);",
  hang: "setInterval(() => {}, 1000);", // never exits — for timeout/cancel tests
};

export function runChild(req: {
  mode: "ok" | "fail" | "hang";
  token: string;
  timeoutMs: number;
}): Promise<ChildResult> {
  const start = Date.now();
  const child = spawn(process.execPath, ["-e", SCRIPTS[req.mode]], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    windowsHide: true,
  });

  const rec: Running = { child, cancelled: false, timedOut: false, timer: null };
  registry.set(req.token, rec);

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
  child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));

  if (req.timeoutMs > 0) {
    rec.timer = setTimeout(() => {
      rec.timedOut = true;
      child.kill(); // SIGTERM
    }, req.timeoutMs);
  }

  return new Promise<ChildResult>((resolve) => {
    child.on("close", (code, signal) => {
      if (rec.timer) clearTimeout(rec.timer);
      registry.delete(req.token);
      resolve({
        stdout,
        stderr,
        code,
        signal: signal ?? null,
        timedOut: rec.timedOut,
        cancelled: rec.cancelled,
        durationMs: Date.now() - start,
      });
    });
    child.on("error", (err) => {
      if (rec.timer) clearTimeout(rec.timer);
      registry.delete(req.token);
      resolve({
        stdout,
        stderr: stderr + `\nspawn error: ${err.message}`,
        code: null,
        signal: null,
        timedOut: rec.timedOut,
        cancelled: rec.cancelled,
        durationMs: Date.now() - start,
      });
    });
  });
}

/** Cancel a running child by token. Returns whether a process was actually killed. */
export function cancelChild(token: string): { cancelled: boolean } {
  const rec = registry.get(token);
  if (!rec) return { cancelled: false };
  rec.cancelled = true;
  rec.child.kill();
  return { cancelled: true };
}
