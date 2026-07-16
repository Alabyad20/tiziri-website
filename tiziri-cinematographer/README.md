# Tiziri Cinematographer

Provenance-grade product cinematography for handcrafted objects. The rug is never altered —
provably. Preview equals master.

This repository is the **commercial application** described by the frozen design canon in
`../tiziri-studio/docs/` (architecture, capture-standard, cinematography-bible, product-design,
engineering-master-plan). It is separate from the `tiziri-studio` prototype, which holds the working
Tier-1 proof-of-concept engine.

> **Status: Milestone P0 — Foundations.** Only the safe skeleton exists. No renderer, no analysis,
> no UI beyond a shell placeholder. See the master plan for what comes next.

## What P0 contains

| Package | Role |
|---|---|
| `@tiziri/shared` | Leaf utilities: `Result`, ids/slugs, hashing. Depends on nothing. |
| `@tiziri/core` | The pure, framework-agnostic domain: colour management (linear-light, deltaE2000), the Scene model, the Reel document (schema + validation + migrations). No DOM, no I/O, no framework. |
| `@tiziri/library` | Local-first library index: files on disk are the source of truth, SQLite is the index. Reel docs round-trip through disk + SQLite. |
| `@tiziri/shell-electron` | Thin, **hardened** Electron shell (Electron 43 + electron-vite + React): sandboxed, context-isolated, allow-listed/validated IPC, dev/prod path separation, headless self-test. See `docs/ADR-0002`. |

Boundaries between these are **enforced in CI** (`.dependency-cruiser.cjs`).

## Requirements

- **Node ≥ 22.6** (uses native TypeScript execution and the built-in `node:sqlite`). Developed on
  Node 24.

## Commands

```bash
npm install        # links the workspace packages
npm run check      # boundaries + typecheck + tests (what CI runs)

npm run typecheck  # tsc --noEmit across the monorepo
npm run boundaries # dependency-cruiser: fails on a boundary violation
npm test           # golden tests (colour round-trip, Reel round-trip, migrations, library)
npm run bench      # performance micro-budget harness (stub)
```

## Definition of Done (P0) — all verified

- [x] A Reel doc round-trips through disk + SQLite (`tests/project.roundtrip.test.ts`).
- [x] A colour round-trip test passes deltaE < 1 (`tests/color.roundtrip.test.ts`).
- [x] CI blocks a boundary violation (`.dependency-cruiser.cjs`, demonstrated in the milestone notes).
- [x] Demo: load a rug into the Library, see it indexed (`tests/library.index.test.ts`).

## Notable P0 engineering decisions

See `docs/ADR-0001-p0-foundations.md`. In brief: npm workspaces stand in for pnpm (pnpm not
required); the SQLite driver is Node's built-in `node:sqlite`, kept behind the `LibraryIndex`
interface so a production driver or cloud backend can replace it; the Electron shell is a
compile-only skeleton until the UI milestone (P4); TypeScript runs natively (no build step) and the
code is written in erasable-syntax-only TS.
