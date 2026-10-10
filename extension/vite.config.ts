import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import * as fs from "fs";

function copyManifestPlugin() {
  return {
    name: "copy-manifest",
    closeBundle() {
      const manifestPath = resolve(__dirname, "manifest.json");
      const distManifestPath = resolve(__dirname, "dist/manifest.json");
      if (fs.existsSync(manifestPath)) {
        fs.copyFileSync(manifestPath, distManifestPath);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        popup: resolve(__dirname, "src/ui/popup/index.html"),
        interstitial: resolve(__dirname, "src/ui/interstitial/index.html"),
        options: resolve(__dirname, "src/ui/options/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") return "background.js";
          if (chunkInfo.name === "content") return "content.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    }
  },
  // @ts-ignore
  test: {
    include: ["tests/**/*.test.ts"]
  }
});
