/**
 * Bridge from the shell to the Python analysis sidecar (P1). Electron-free (pure
 * node:child_process) so it is unit-testable without a window; the IPC layer
 * (ipc.ts) wires it to the renderer. Reuses the process-orchestration mechanism
 * proven in the shell-hardening milestone: streamed progress, timeout, and
 * cancellation.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AnalysisEvent } from "../shared/analysis-contract.ts";

export type { AnalysisEvent };

export interface AnalysisRequest {
  image_path: string;
  rug_width_cm: number;
  rug_height_cm: number;
  out_dir: string;
  cache_dir: string;
  segmenter?: "auto" | "sam2" | "grabcut";
  with_depth?: boolean;
  rug_box?: number[];
  points?: number[][];
  preview_only?: boolean;
}

export interface RunHandle {
  promise: Promise<AnalysisEvent>; // resolves with the final result|error event
  cancel: () => void;
}

export interface RunOptions {
  analysisDir: string;          // the tiziri-cinematographer/packages/analysis dir
  pythonCmd?: string;           // default: env TIZIRI_PYTHON or "python"
  modelsDir?: string;
  timeoutMs?: number;           // default 180s
  onEvent?: (e: AnalysisEvent) => void;
}

export function runAnalysis(request: AnalysisRequest, opts: RunOptions): RunHandle {
  const python = opts.pythonCmd ?? process.env["TIZIRI_PYTHON"] ?? "python";
  const scratch = mkdtempSync(join(tmpdir(), "tiziri-an-"));
  const reqFile = join(scratch, "request.json");
  writeFileSync(reqFile, JSON.stringify(request), "utf8");

  const env: NodeJS.ProcessEnv = { ...process.env, PYTHONPATH: opts.analysisDir };
  if (opts.modelsDir) env["TIZIRI_MODELS_DIR"] = opts.modelsDir;

  let child: ChildProcess | null = spawn(
    python,
    ["-m", "tiziri_analysis", "--request-file", reqFile],
    { cwd: opts.analysisDir, env, windowsHide: true },
  );

  let stderr = "";
  let buf = "";
  let finalEvent: AnalysisEvent | null = null;

  const cleanup = () => {
    try { rmSync(scratch, { recursive: true, force: true }); } catch { /* ignore */ }
  };

  const promise = new Promise<AnalysisEvent>((resolve) => {
    const timeout = setTimeout(() => {
      if (child) child.kill();
      if (!finalEvent) finalEvent = { type: "error", code: "timeout", message: `exceeded ${opts.timeoutMs ?? 180000}ms`, recoverable: true };
    }, opts.timeoutMs ?? 180000);

    const handleLine = (line: string) => {
      const s = line.trim();
      if (!s) return;
      let ev: AnalysisEvent;
      try { ev = JSON.parse(s) as AnalysisEvent; } catch { return; }
      if (ev.type === "result" || ev.type === "error") finalEvent = ev;
      opts.onEvent?.(ev);
    };

    child!.stdout!.on("data", (d: Buffer) => {
      buf += d.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        handleLine(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
      }
    });
    child!.stderr!.on("data", (d: Buffer) => (stderr += d.toString()));

    child!.on("close", (code) => {
      clearTimeout(timeout);
      handleLine(buf);
      child = null;
      cleanup();
      if (finalEvent) return resolve(finalEvent);
      resolve({
        type: "error", code: "no_result",
        message: `sidecar exited ${code} without a result; stderr: ${stderr.slice(-400)}`,
        recoverable: false,
      });
    });
    child!.on("error", (err) => {
      clearTimeout(timeout);
      cleanup();
      resolve({ type: "error", code: "spawn_failed", message: err.message, recoverable: false });
    });
  });

  return { promise, cancel: () => { if (child) child.kill(); } };
}
