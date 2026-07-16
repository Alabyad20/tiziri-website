import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const dir = import.meta.dirname;

export default defineConfig({
  main: {
    // Bundle the @tiziri/* workspace packages INTO main (their source is .ts and
    // Electron's Node cannot strip types at runtime). Node built-ins (incl.
    // node:sqlite) stay external automatically.
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@tiziri/core", "@tiziri/library", "@tiziri/shared", "@electron-toolkit/utils"],
      }),
    ],
    build: {
      rollupOptions: { input: { index: resolve(dir, "src/main/index.ts") } },
    },
  },
  preload: {
    // Preload imports only TYPES from @tiziri (erased); nothing to bundle.
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(dir, "src/preload/index.ts") },
        // Sandboxed preload must be CommonJS; name it .cjs so Node never treats it as ESM.
        output: { format: "cjs", entryFileNames: "index.cjs" },
      },
    },
  },
  renderer: {
    root: resolve(dir, "src/renderer"),
    build: {
      rollupOptions: { input: { index: resolve(dir, "src/renderer/index.html") } },
    },
    plugins: [react()],
  },
});
