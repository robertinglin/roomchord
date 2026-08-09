# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:94:3

# Error details

```
Error: E2E prebuilt dist is stale relative to the frontend sources; run pnpm run build:frontend before the packed proof.
```

# Test source

```ts
  1   | const fs = require("node:fs");
  2   | const net = require("node:net");
  3   | const os = require("node:os");
  4   | const path = require("node:path");
  5   | const { spawn } = require("node:child_process");
  6   | const { test: base, expect } = require("playwright/test");
  7   | 
  8   | const MATTERHORN_ROOT = path.resolve(__dirname, "../../../matterhorn");
  9   | const PROJECT_ROOT = path.resolve(__dirname, "../..");
  10  | const ANSI = /\u001b\[[0-9;]*m/g;
  11  | 
  12  | function matterhornCli() {
  13  |   return process.env.MATTERHORN_PLAYWRIGHT_CLI || path.join(MATTERHORN_ROOT, "bin", "matterhorn.cjs");
  14  | }
  15  | 
  16  | function freePort() {
  17  |   return new Promise((resolve, reject) => {
  18  |     const server = net.createServer();
  19  |     server.once("error", reject);
  20  |     server.listen(0, "127.0.0.1", () => {
  21  |       const address = server.address();
  22  |       server.close(() => resolve(address.port));
  23  |     });
  24  |   });
  25  | }
  26  | 
  27  | function terminate(child) {
  28  |   if (!child || child.exitCode !== null) return;
  29  |   try {
  30  |     if (process.platform === "win32") child.kill();
  31  |     else process.kill(-child.pid, "SIGTERM");
  32  |   } catch {
  33  |     child.kill();
  34  |   }
  35  | }
  36  | 
  37  | function newestBuildInput(root) {
  38  |   let newest = 0;
  39  |   for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  40  |     if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
  41  |     const item = path.join(root, entry.name);
  42  |     if (entry.isDirectory()) {
  43  |       newest = Math.max(newest, newestBuildInput(item));
  44  |       continue;
  45  |     }
  46  |     if (/\.test\.[cm]?[jt]sx?$/.test(entry.name) || /\.(map|d\.ts)$/.test(entry.name)) continue;
  47  |     newest = Math.max(newest, fs.statSync(item).mtimeMs);
  48  |   }
  49  |   return newest;
  50  | }
  51  | 
  52  | function assertPrebuiltDistFresh() {
  53  |   const bundleEntry = path.join(PROJECT_ROOT, "dist", "index.html");
  54  |   if (!fs.existsSync(bundleEntry)) throw new Error("E2E requires a prebuilt dist/index.html; run pnpm run build:frontend first.");
  55  |   const bundleMtime = fs.statSync(bundleEntry).mtimeMs;
  56  |   const sourceMtime = ["src", "public", "shared", "index.html", "vite.config.ts", "tsconfig.json", "package.json", "pnpm-lock.yaml"]
  57  |     .map((relative) => path.join(PROJECT_ROOT, relative))
  58  |     .filter((input) => fs.existsSync(input))
  59  |     .reduce((newest, input) => Math.max(newest, fs.statSync(input).isDirectory() ? newestBuildInput(input) : fs.statSync(input).mtimeMs), 0);
  60  |   if (sourceMtime > bundleMtime) {
> 61  |     throw new Error("E2E prebuilt dist is stale relative to the frontend sources; run pnpm run build:frontend before the packed proof.");
      |           ^ Error: E2E prebuilt dist is stale relative to the frontend sources; run pnpm run build:frontend before the packed proof.
  62  |   }
  63  | }
  64  | 
  65  | function waitForLinks(child, output) {
  66  |   return new Promise((resolve, reject) => {
  67  |     const timeout = setTimeout(() => finish(new Error(`Matterhorn did not publish invite links.\n${output.text.slice(-12000)}`)), 120_000);
  68  |     const onData = () => {
  69  |       const plain = output.text.replace(ANSI, "");
  70  |       const links = {
  71  |         admin: plain.match(/owner invite:\s+(https?:\/\/\S+)/i)?.[1],
  72  |         member: plain.match(/member invite:\s+(https?:\/\/\S+)/i)?.[1],
  73  |         guest: plain.match(/guest invite:\s+(https?:\/\/\S+)/i)?.[1],
  74  |       };
  75  |       if (links.admin && links.member && links.guest) finish(null, links);
  76  |     };
  77  |     const onExit = (code, signal) => finish(new Error(`Matterhorn exited before readiness (${code || signal}).\n${output.text.slice(-12000)}`));
  78  |     const finish = (error, value) => {
  79  |       clearTimeout(timeout);
  80  |       child.stdout.off("data", onData);
  81  |       child.stderr.off("data", onData);
  82  |       child.off("exit", onExit);
  83  |       error ? reject(error) : resolve(value);
  84  |     };
  85  |     child.stdout.on("data", onData);
  86  |     child.stderr.on("data", onData);
  87  |     child.once("exit", onExit);
  88  |     onData();
  89  |   });
  90  | }
  91  | 
  92  | function copyProject() {
  93  |   assertPrebuiltDistFresh();
  94  |   const target = fs.mkdtempSync(path.join(os.tmpdir(), "mosh-playwright-"));
  95  |   fs.cpSync(PROJECT_ROOT, target, {
  96  |     recursive: true,
  97  |     filter(item) {
  98  |       const relative = path.relative(PROJECT_ROOT, item);
  99  |       return relative !== ".matterhorn"
  100 |         && !relative.startsWith(`.matterhorn${path.sep}`)
  101 |         && relative !== ".git"
  102 |         && !relative.startsWith(`.git${path.sep}`)
  103 |         && relative !== "coverage"
  104 |         && !relative.startsWith(`coverage${path.sep}`)
  105 |         && relative !== "node_modules"
  106 |         && !relative.startsWith(`node_modules${path.sep}`)
  107 |         && relative !== "playwright-report"
  108 |         && !relative.startsWith(`playwright-report${path.sep}`)
  109 |         && relative !== "dist"
  110 |         && !relative.startsWith(`dist${path.sep}`)
  111 |         && relative !== "test-results"
  112 |         && !relative.startsWith(`test-results${path.sep}`);
  113 |     },
  114 |   });
  115 |   fs.symlinkSync(path.join(PROJECT_ROOT, "node_modules"), path.join(target, "node_modules"), "dir");
  116 |   fs.cpSync(path.join(PROJECT_ROOT, "dist"), path.join(target, "dist"), { recursive: true });
  117 | 
  118 |   // The checked-in dist is the fixture's explicit prebuilt runtime contract.
  119 |   // Freshness was checked above before copying it; prebuilt keeps Matterhorn
  120 |   // from rebuilding its sibling SDK during each test startup.
  121 |   const descriptorPath = path.join(target, "gg.matterhorn.mosh.json");
  122 |   const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
  123 |   descriptor.frontend = {
  124 |     ...descriptor.frontend,
  125 |     bundle: {
  126 |       ...descriptor.frontend.bundle,
  127 |       prebuilt: true,
  128 |     },
  129 |   };
  130 |   fs.writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  131 |   return target;
  132 | }
  133 | 
  134 | function deterministicMedia() {
  135 |   function videoTrack() {
  136 |     const canvas = document.createElement("canvas");
  137 |     canvas.width = 320;
  138 |     canvas.height = 180;
  139 |     const context = canvas.getContext("2d");
  140 |     let frame = 0;
  141 |     const draw = () => {
  142 |       frame += 1;
  143 |       context.fillStyle = `hsl(${frame % 360} 65% 45%)`;
  144 |       context.fillRect(0, 0, canvas.width, canvas.height);
  145 |       context.fillStyle = "white";
  146 |       context.font = "20px sans-serif";
  147 |       context.fillText(`Mosh E2E ${frame}`, 18, 92);
  148 |     };
  149 |     draw();
  150 |     const interval = window.setInterval(draw, 100);
  151 |     const track = canvas.captureStream(10).getVideoTracks()[0];
  152 |     const stop = track.stop.bind(track);
  153 |     track.stop = () => { window.clearInterval(interval); stop(); };
  154 |     return track;
  155 |   }
  156 | 
  157 |   function audioTrack() {
  158 |     const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  159 |     const audio = new AudioContextCtor();
  160 |     const oscillator = audio.createOscillator();
  161 |     const gain = audio.createGain();
```