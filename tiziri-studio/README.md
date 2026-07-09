# Tiziri Studio

Internal AI workspace for running the Tiziri rug business — turns hours of
listing, staging, naming and posting work into minutes. Desktop-first,
local-only (never deployed; `/tiziri-studio/*` is blocked in netlify.toml).

## Run it

```bash
cd tiziri-studio
npm install
npm run dev        # http://localhost:5174
```

## Studios

| Studio | What it does |
|---|---|
| **Dashboard** | Recent projects/exports, quick actions, live catalog collections |
| **Mockup Studio** | Stages any rug photo in 6 painted room scenes with true perspective (homography compositor); sliders for size/position/rotation; 2400×1600 PNG export + history |
| **Listing Studio** | Etsy title/tags/materials, eBay title, description, alt text — editable blocks with limit counters and one-click copy |
| **Naming Studio** | Photo → palette (median-cut, wool-dye vocabulary) + Amazigh woman's name, meaning, collection, story; checks all catalog names for duplicates |
| **Designer PDF** | A4 trade tear sheet (hide-price toggle, designer notes); Export = browser print → Save as PDF |
| **Social Studio** | Instagram caption+hashtags, Pinterest pin, Facebook post, newsletter feature — per-channel limits, real product URLs |
| **Settings** | Theme, Anthropic API key (stored locally), brand voice, shortcuts |

## Generation

Copy studios call the Anthropic API directly from the browser
(`claude-opus-4-8`, schema-constrained JSON) using the key in Settings.
With no key, every studio falls back to honest brand-voice templates built
from the catalog data — usable, just less tailored.

## Data

- Catalog is imported live from `../data/rugs.json` (`@catalog` alias) — one
  source of truth with the site.
- All state autosaves to localStorage; ⌘Z/⌘⇧Z undo per studio (zundo).
- Shortcuts: ⌘K palette, ⌘1–6 studios, ⌘, settings, ⌘↵ generate.

## Stack

Vite 8 · React 19 · TypeScript · Tailwind v4 · zustand + zundo ·
Fraunces/Inter (self-hosted). No backend, no external requests except the
Anthropic API and catalog photos.

## Responsive behavior

Desktop-first: ≥1024px gets the fixed sidebar, keyboard shortcuts and
floating theme toggle. Below that, the shell switches to a top bar with a
slide-in navigation drawer; every studio's two-column layout stacks. All
pages verified overflow-free at 375px (phone) and 768px (tablet).

## Portability architecture

The code is layered so the same core can ship as a PWA, an Electron/Tauri
desktop app, or a React Native/Expo app later — none of which are built yet.

| Layer | Contents | Portability |
|---|---|---|
| `src/lib` | Engines: homography compositor, room scenes, palette extraction, copy generators, AI client | Pure TS + canvas — reusable everywhere (RN needs a canvas shim like react-native-skia for the compositor) |
| `src/stores` | zustand state, autosave, undo/redo | Platform-free; persistence is injected |
| `src/platform` | **The swap layer** — storage, clipboard, file save, print, touch detection | The only module that touches `window`/`navigator`/`document` host APIs |
| `src/pages`, `src/components` | Web UI (Tailwind) | Rewritten per target UI toolkit; RN gets native screens |

Per-target notes:

- **PWA** — `manifest.webmanifest` already ships and is linked; add a
  service worker (e.g. `vite-plugin-pwa`) + install prompt. Nothing else
  changes.
- **Electron/Tauri** — `HashRouter` already tolerates `file://`; point the
  shell at `dist/`, then swap `src/platform` (`downloadDataUrl` → native
  save dialog, `printDocument` → webContents/tauri print).
- **React Native/Expo** — keep `src/lib` + `src/stores`; swap
  `src/platform` (`storage` → AsyncStorage, print → `expo-print`), rebuild
  screens natively.
