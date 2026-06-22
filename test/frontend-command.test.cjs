const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { splitExtraArgs, viteBuildArgs } = require("../shared/frontendCommand.cjs");

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

test("frontend watch uses Vite build watch so bundle plugins rerun", () => {
  const root = path.resolve("app");

  assert.deepEqual(viteBuildArgs(root, ["--mode", "production"]), [
    "build",
    "--config",
    path.join(root, "vite.config.ts"),
    "--mode",
    "production"
  ]);
  assert.deepEqual(viteBuildArgs(root, [], { watch: true }), [
    "build",
    "--watch",
    "--config",
    path.join(root, "vite.config.ts")
  ]);
});
