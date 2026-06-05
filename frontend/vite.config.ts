import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  base: process.env.ROOMKIT_BUNDLE_BASE || "/",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: { entry: path.resolve(__dirname, "src", "index.tsx"), formats: ["es"], fileName: () => "roomkit-chord.js" },
    minify: false,
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  },
  server: { host: "127.0.0.1", port: 42732, strictPort: true, allowedHosts: ["launch.roomkit.app", "localhost", "127.0.0.1"] }
});
