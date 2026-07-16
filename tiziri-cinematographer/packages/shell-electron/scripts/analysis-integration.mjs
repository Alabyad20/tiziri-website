/**
 * Integration test: drives the REAL Python analysis sidecar through the shell's
 * electron-free analysis-service — the exact orchestration the IPC layer uses.
 * Verifies a real Flat Hero submission returns a result with a cutout + geometry,
 * plus cancellation, timeout, and structured error handling.
 *
 * Requires system `python` with the analysis deps installed (see
 * packages/analysis/requirements.txt). No model weights needed (classical path).
 */
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const here = import.meta.dirname;
const analysisDir = join(here, "..", "..", "analysis");
const image = join(here, "..", "..", "..", "..", "rug-photos",
  "July 4th Photoshoot", "300x190cm", "IMG_20260704_195425.jpg");

const { runAnalysis } = await import(
  pathToFileURL(join(here, "..", "src", "main", "analysis-service.ts")).href
);

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  (ok ? pass++ : fail++);
  console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`);
};

function scratch() {
  const d = mkdtempSync(join(tmpdir(), "tiziri-int-"));
  return { out: join(d, "out"), cache: join(d, "cache"), root: d };
}

// 1) A real Flat Hero submitted end-to-end returns a result + artifacts + progress.
{
  const s = scratch();
  const stages = [];
  const h = runAnalysis(
    { image_path: image, rug_width_cm: 300, rug_height_cm: 190, out_dir: s.out, cache_dir: s.cache, segmenter: "grabcut" },
    { analysisDir, timeoutMs: 180000, onEvent: (e) => e.type === "progress" && stages.push(e.stage) },
  );
  const res = await h.promise;
  check("submit-returns-result", res.type === "result", res.type === "error" ? res.message : "");
  check("progress-events-received", stages.length >= 3, `stages=${stages.length}`);
  if (res.type === "result") {
    check("cutout-artifact-exists", existsSync(res.artifacts.cutout));
    check("camera-artifact-exists", existsSync(res.artifacts.camera));
    check("reprojection-reported", typeof res.reprojection_rms_px === "number", `rms=${res.reprojection_rms_px}`);
    check("segmenter-and-device-reported", !!res.segmenter_used && !!res.device, `${res.segmenter_used}/${res.device}`);
  }
  rmSync(s.root, { recursive: true, force: true });
}

// 2) Cancellation terminates a run promptly with an error-type event.
{
  const s = scratch();
  const h = runAnalysis(
    { image_path: image, rug_width_cm: 300, rug_height_cm: 190, out_dir: s.out, cache_dir: s.cache, segmenter: "grabcut" },
    { analysisDir, timeoutMs: 180000 },
  );
  setTimeout(() => h.cancel(), 400);
  const t0 = Date.now();
  const res = await h.promise;
  check("cancel-returns-error", res.type === "error", `type=${res.type}`);
  check("cancel-is-prompt", Date.now() - t0 < 20000, `${Date.now() - t0}ms`);
  rmSync(s.root, { recursive: true, force: true });
}

// 3) Timeout fires and returns a timeout error.
{
  const s = scratch();
  const res = await runAnalysis(
    { image_path: image, rug_width_cm: 300, rug_height_cm: 190, out_dir: s.out, cache_dir: s.cache, segmenter: "grabcut" },
    { analysisDir, timeoutMs: 60 },
  ).promise;
  check("timeout-returns-error", res.type === "error" && res.code === "timeout", `code=${res.type === "error" ? res.code : res.type}`);
  rmSync(s.root, { recursive: true, force: true });
}

// 4) A bad input yields a structured error (not a crash).
{
  const s = scratch();
  const res = await runAnalysis(
    { image_path: "C:/does/not/exist.jpg", rug_width_cm: 300, rug_height_cm: 190, out_dir: s.out, cache_dir: s.cache },
    { analysisDir, timeoutMs: 30000 },
  ).promise;
  check("bad-input-structured-error", res.type === "error" && !!res.code, res.type === "error" ? res.code : res.type);
  rmSync(s.root, { recursive: true, force: true });
}

console.log(`\nANALYSIS INTEGRATION: ${fail === 0 ? "PASS" : "FAIL"} ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
