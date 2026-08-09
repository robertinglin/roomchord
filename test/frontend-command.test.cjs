const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  main,
  resolveFromRoots,
  resolvePackageBin,
  splitExtraArgs,
  viteBuildArgs
} = require("../shared/frontendCommand.cjs");

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

test("frontend command resolves tools from the application roots", () => {
  const root = path.resolve(".");
  const packageFile = resolveFromRoots("typescript/package.json", [root]);
  assert.equal(packageFile.endsWith("/typescript/package.json"), true);
  assert.equal(path.basename(resolvePackageBin("typescript", "tsc", [root])), "tsc");
});

test("frontend command rejects unknown commands after validating the app root", async () => {
  await assert.rejects(() => main(["unknown", "."]), /Unknown frontend command unknown/);
});

test("frontend command reports missing command arguments", async () => {
  const originalExit = process.exit;
  let exitCode;
  process.exit = (code) => {
    exitCode = code;
    throw new Error("frontend command exited");
  };
  try {
    await assert.rejects(() => main(["unknown"]), /frontend command exited/);
  } finally {
    process.exit = originalExit;
  }
  assert.equal(exitCode, 1);
});

test("frontend check delegates TypeScript validation to the resolved compiler", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mosh-frontend-command-"));
  try {
    fs.symlinkSync(path.resolve("node_modules"), path.join(root, "node_modules"), "dir");
    fs.writeFileSync(path.join(root, "empty.ts"), "export {};\n");
    fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { noEmit: true, strict: true },
      files: ["empty.ts"]
    }));
    await main(["check", root]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("frontend command dispatches each supported runtime command", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mosh-frontend-dispatch-"));
  try {
    for (const [packageName, binName] of [["typescript", "tsc"], ["vite", "vite"], ["vitest", "vitest"]]) {
      const packageRoot = path.join(root, "node_modules", packageName);
      fs.mkdirSync(path.join(packageRoot, "bin"), { recursive: true });
      fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({ name: packageName, bin: { [binName]: `bin/${binName}.cjs` } }));
      fs.writeFileSync(path.join(packageRoot, "bin", `${binName}.cjs`), "process.exit(0);\n");
    }
    fs.writeFileSync(path.join(root, "tsconfig.json"), "{}\n");
    await main(["build", root]);
    await main(["watch", root]);
    await main(["dev", root]);
    await main(["test", root]);
    fs.writeFileSync(path.join(root, "node_modules", "typescript", "bin", "tsc.cjs"), "process.exit(1);\n");
    await assert.rejects(() => main(["check", root]), /tsc\.cjs exited 1/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
