import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import styleX from "@stylexjs/rollup-plugin";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react(), styleX({ runtimeInjection: true })],
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
  test: {
    environment: "jsdom",
    setupFiles: ["src/shared/testing/setup.ts"],
    globals: true,
    css: true
  }
});
