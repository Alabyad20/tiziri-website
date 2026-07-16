/**
 * Architectural boundaries, enforced (Engineering Master Plan §2).
 *
 * These rules are a BUILD GATE: violating the dependency direction fails CI. This
 * is what prevents the plan's most important structural guarantees from eroding —
 * above all, that `core` stays pure and that the (future) generative modules can
 * never share a render path with the cinematographer.
 */
module.exports = {
  forbidden: [
    {
      name: "core-stays-pure",
      comment: "core is the framework-agnostic domain; it may depend only on shared.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { path: "^packages/", pathNot: "^packages/(core|shared)/" },
    },
    {
      name: "shared-is-a-leaf",
      comment: "shared depends on nothing else in the workspace.",
      severity: "error",
      from: { path: "^packages/shared/" },
      to: { path: "^packages/", pathNot: "^packages/shared/" },
    },
    {
      name: "nothing-depends-on-shell",
      comment: "the Electron shell is a leaf; no package may import it.",
      severity: "error",
      from: { path: "^packages/", pathNot: "^packages/shell-electron/" },
      to: { path: "^packages/shell-electron/" },
    },
    {
      name: "no-circular",
      comment: "circular dependencies are forbidden.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    exclude: { path: "node_modules|\\.d\\.ts$" },
  },
};
