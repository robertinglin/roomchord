const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { shouldWatchFrontendPath, splitExtraArgs } = require("../shared/frontendCommand.cjs");

test("frontend command splits extra Vite arguments after separator", () => {
  assert.deepEqual(splitExtraArgs(["watch", ".", "--", "--mode", "production"]), {
    args: ["watch", "."],
    extra: ["--mode", "production"]
  });
  assert.deepEqual(splitExtraArgs(["watch", ".", "--mode", "production"]), {
    args: ["watch", "."],
    extra: ["--mode", "production"]
  });
  assert.deepEqual(splitExtraArgs(["build", "."]), { args: ["build", "."], extra: [] });
});

test("frontend watcher reacts to source files and ignores generated outputs", () => {
  const sourceDir = path.resolve("app", "src");

  assert.equal(shouldWatchFrontendPath(sourceDir, undefined), true);
  assert.equal(shouldWatchFrontendPath(sourceDir, path.join(sourceDir, "app", "index.tsx")), true);
  assert.equal(shouldWatchFrontendPath(sourceDir, path.join(sourceDir, "shared", "ui", "styles.css")), true);
  assert.equal(shouldWatchFrontendPath(sourceDir, path.join(sourceDir, "dist", "matterhorn-mosh.js")), false);
  assert.equal(shouldWatchFrontendPath(sourceDir, path.join(sourceDir, "matterhorn-frontend-bundle.zip")), false);
  assert.equal(shouldWatchFrontendPath(sourceDir, path.join(sourceDir, "matterhorn-frontend-manifest.json")), false);
  assert.equal(shouldWatchFrontendPath(sourceDir, path.resolve("app", "public", "icon.svg")), false);
});
