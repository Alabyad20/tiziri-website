/**
 * Benchmark harness STUB (Master Plan §3 P0, §8 performance budget).
 *
 * P0 only stands up the harness and a couple of micro-budgets so later milestones
 * have a place to assert against. It is not the real startup benchmark (that needs
 * the shell + renderer, P4). Run: `npm run bench`.
 */
import { performance } from "node:perf_hooks";
import { createReel, validateReel, deltaE8 } from "@tiziri/core";

interface Budget {
  readonly name: string;
  readonly run: () => void;
  readonly iterations: number;
  readonly maxMsBudget: number;
}

const budgets: Budget[] = [
  {
    name: "create + validate 1k reels",
    iterations: 1000,
    maxMsBudget: 250,
    run: () => {
      const reel = createReel({ rugId: "rug", title: "Bench", aspect: "9:16" });
      validateReel(reel);
    },
  },
  {
    name: "100k deltaE2000 (sRGB)",
    iterations: 100_000,
    maxMsBudget: 400,
    run: () => {
      deltaE8([239, 233, 224], "srgb", [31, 138, 134], "srgb");
    },
  },
];

let failed = false;
for (const b of budgets) {
  const t0 = performance.now();
  for (let i = 0; i < b.iterations; i++) b.run();
  const ms = performance.now() - t0;
  const ok = ms <= b.maxMsBudget;
  failed = failed || !ok;
  process.stdout.write(
    `${ok ? "✓" : "✗"} ${b.name}: ${ms.toFixed(1)}ms (budget ${b.maxMsBudget}ms)\n`,
  );
}
process.exit(failed ? 1 : 0);
