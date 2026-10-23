import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** The trip content lives at the repository root (src/data.json and the files built
 *  from it), not inside the app, because the Python build scripts and the classic
 *  single-file page read the same copy.
 *
 *  This used to be `new URL("../src", import.meta.url)`, which is wrong: Vite bundles
 *  this config to a temporary file and may put it in node_modules/.vite-temp, where
 *  "../src" resolves to app/node_modules/src — the dev server then answered every
 *  request with "Failed to resolve import @trip/data.json" and a 500.  Looking for the
 *  content relative to the working directory covers being run from the app or from the
 *  repository root, and throwing here beats a page that loads and then has no data. */
function tripDir() {
  const tries = [resolve(process.cwd(), "src"), resolve(process.cwd(), "../src")];
  const hit = tries.find((p) => existsSync(resolve(p, "data.json")));
  if (!hit) throw new Error(`cannot find the trip content (data.json) in: ${tries.join(", ")}`);
  return hit;
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@trip": tripDir() } },
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
