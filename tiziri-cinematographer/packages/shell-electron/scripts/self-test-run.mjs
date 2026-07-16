/**
 * Orchestrates the headless self-test: launches the BUILT Electron app twice
 * against a library directory whose path contains spaces AND non-ASCII
 * characters — phase "write" then phase "recover" (restart recovery) — and
 * asserts every CHECK passed. No display required.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const electronPath = require("electron"); // resolves to the electron.exe path
const mainEntry = join(import.meta.dirname, "..", "out", "main", "index.js");

// A deliberately awkward library path: spaces + non-ASCII (requirement 6).
const base = mkdtempSync(join(tmpdir(), "tiziri-shell-"));
const libraryDir = join(base, "Tíziri Démo çå 月光");
mkdirSync(libraryDir, { recursive: true });

function run(phase) {
  return new Promise((resolve) => {
    const child = spawn(electronPath, [mainEntry, "--self-test", `--phase=${phase}`], {
      env: { ...process.env, TIZIRI_LIBRARY_DIR: libraryDir },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    const timer = setTimeout(() => child.kill(), 60000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out });
    });
  });
}

let failed = false;
for (const phase of ["write", "recover"]) {
  const { code, out } = await run(phase);
  const lines = out.split(/\r?\n/).filter((l) => /^CHECK |^SELFTEST /.test(l));
  process.stdout.write(`\n===== phase: ${phase} (exit ${code}) =====\n${lines.join("\n")}\n`);
  if (code !== 0) failed = true;
}

rmSync(base, { recursive: true, force: true });
process.stdout.write(`\nSELF-TEST OVERALL: ${failed ? "FAIL" : "PASS"}\n`);
process.exit(failed ? 1 : 0);
