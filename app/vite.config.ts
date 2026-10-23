import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The trip content lives at the repository root (src/data.json and the two files
// built from it), not inside the app, because the Python build scripts and the
// classic single-file page read them too.  One alias keeps that one copy.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@trip": new URL("../src", import.meta.url).pathname },
  },
  server: { fs: { allow: [".", ".."] } },
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    rollupOptions: {
      // MapLibre is most of the bundle and never changes between deploys; its own
      // chunk means a content edit does not make the phone re-download the engine.
      output: { manualChunks: { maplibre: ["maplibre-gl"] } },
    },
  },
});
