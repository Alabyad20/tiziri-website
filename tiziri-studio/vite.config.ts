import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Live catalog from the main site — single source of truth, never duplicated.
      "@catalog": fileURLToPath(new URL("../data/rugs.json", import.meta.url)),
    },
  },
  server: {
    fs: {
      // Allow importing ../data/rugs.json from outside the app root.
      allow: [".."],
    },
    port: 5174,
  },
});
