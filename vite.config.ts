import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import styleX from "@stylexjs/rollup-plugin";
import { matterhorn } from "matterhorn-sdk/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  base: process.env.MATTERHORN_BUNDLE_BASE || "/",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  plugins: [react(), styleX({ runtimeInjection: true }), matterhorn()],
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "src", "app"),
      "@pages": path.resolve(__dirname, "src", "pages"),
      "@widgets": path.resolve(__dirname, "src", "widgets"),
      "@features": path.resolve(__dirname, "src", "features"),
      "@entities": path.resolve(__dirname, "src", "entities"),
      "@shared": path.resolve(__dirname, "src", "shared")
    },
    dedupe: ["react", "react-dom"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: { entry: path.resolve(__dirname, "src", "index.tsx"), formats: ["es"], fileName: () => "matterhorn-mosh.js" },
    minify: false,
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  },
  server: { host: "127.0.0.1", port: 42732, strictPort: true, allowedHosts: ["launch.matterhorn.gg", "launch.matterhorn.app", "localhost", "127.0.0.1"] }
});
