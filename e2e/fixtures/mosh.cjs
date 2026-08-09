const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { test: base, expect } = require("playwright/test");

const MATTERHORN_ROOT = path.resolve(__dirname, "../../../matterhorn");
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const ANSI = /\u001b\[[0-9;]*m/g;
const LAUNCHER_ASSET_TYPES = new Set(["document", "script", "stylesheet", "font", "manifest", "image"]);

function isLauncherAsset(request) {
  if (LAUNCHER_ASSET_TYPES.has(request.resourceType())) return true;
  return /\.(?:css|gif|ico|jpeg|jpg|js|json|map|png|svg|ttf|woff2?)(?:$|[?#])/iu.test(request.url());
}

function assetDiagnostic(output, pageName, page, phase, kind, request, details = {}) {
  const status = details.status === undefined ? "n/a" : details.status;
  const failure = details.error ? ` error=${details.error}` : "";
  output.text += `\n[launcher asset ${kind}] phase=${phase} page=${pageName} pageUrl=${page.url()} status=${status} url=${request.url()}${failure}`;
}

function matterhornCli() {
  return process.env.MATTERHORN_PLAYWRIGHT_CLI || path.join(MATTERHORN_ROOT, "bin", "matterhorn.cjs");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function terminate(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") child.kill();
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill();
  }
}

function newestBuildInput(root) {
  let newest = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const item = path.join(root, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestBuildInput(item));
      continue;
    }
    if (/\.test\.[cm]?[jt]sx?$/.test(entry.name) || /\.(map|d\.ts)$/.test(entry.name)) continue;
    newest = Math.max(newest, fs.statSync(item).mtimeMs);
  }
  return newest;
}

function assertPrebuiltDistFresh() {
  const bundleEntry = path.join(PROJECT_ROOT, "dist", "index.html");
  if (!fs.existsSync(bundleEntry)) throw new Error("E2E requires a prebuilt dist/index.html; run pnpm run build:frontend first.");
  const bundleMtime = fs.statSync(bundleEntry).mtimeMs;
  const sourceMtime = ["src", "public", "shared", "index.html", "vite.config.ts", "tsconfig.json", "package.json", "pnpm-lock.yaml"]
    .map((relative) => path.join(PROJECT_ROOT, relative))
    .filter((input) => fs.existsSync(input))
    .reduce((newest, input) => Math.max(newest, fs.statSync(input).isDirectory() ? newestBuildInput(input) : fs.statSync(input).mtimeMs), 0);
  if (sourceMtime > bundleMtime) {
    throw new Error("E2E prebuilt dist is stale relative to the frontend sources; run pnpm run build:frontend before the linked proof.");
  }
}

function waitForLinks(child, output) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error(`Matterhorn did not publish invite links.\n${output.text.slice(-12000)}`)), 120_000);
    const onData = () => {
      const plain = output.text.replace(ANSI, "");
      const links = {
        admin: plain.match(/owner invite:\s+(https?:\/\/\S+)/i)?.[1],
        member: plain.match(/member invite:\s+(https?:\/\/\S+)/i)?.[1],
        guest: plain.match(/guest invite:\s+(https?:\/\/\S+)/i)?.[1],
      };
      if (links.admin && links.member && links.guest) finish(null, links);
    };
    const onExit = (code, signal) => finish(new Error(`Matterhorn exited before readiness (${code || signal}).\n${output.text.slice(-12000)}`));
    const finish = (error, value) => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.stderr.off("data", onData);
      child.off("exit", onExit);
      error ? reject(error) : resolve(value);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", onExit);
    onData();
  });
}

function copyProject(usePrebuilt = true) {
  assertPrebuiltDistFresh();
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "mosh-playwright-"));
  fs.cpSync(PROJECT_ROOT, target, {
    recursive: true,
    filter(item) {
      const relative = path.relative(PROJECT_ROOT, item);
      return relative !== ".matterhorn"
        && !relative.startsWith(`.matterhorn${path.sep}`)
        && relative !== ".git"
        && !relative.startsWith(`.git${path.sep}`)
        && relative !== "coverage"
        && !relative.startsWith(`coverage${path.sep}`)
        && relative !== "node_modules"
        && !relative.startsWith(`node_modules${path.sep}`)
        && relative !== "playwright-report"
        && !relative.startsWith(`playwright-report${path.sep}`)
        && relative !== "dist"
        && !relative.startsWith(`dist${path.sep}`)
        && relative !== "test-results"
        && !relative.startsWith(`test-results${path.sep}`);
    },
  });
  fs.symlinkSync(path.join(PROJECT_ROOT, "node_modules"), path.join(target, "node_modules"), "dir");
  fs.cpSync(path.join(PROJECT_ROOT, "dist"), path.join(target, "dist"), { recursive: true });

  // The checked-in dist is the fixture's explicit prebuilt runtime contract.
  // Freshness was checked above before copying it; prebuilt keeps Matterhorn
  // from rebuilding its sibling SDK during each test startup.
  if (usePrebuilt) {
    const descriptorPath = path.join(target, "gg.matterhorn.mosh.json");
    const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
    descriptor.frontend = {
      ...descriptor.frontend,
      bundle: {
        ...descriptor.frontend.bundle,
        prebuilt: true,
      },
    };
    fs.writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  } else {
    const descriptorPath = path.join(target, "gg.matterhorn.mosh.json");
    const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
    for (const command of [descriptor.frontend?.bundle?.dev, descriptor.frontend?.bundle?.build]) {
      if (!Array.isArray(command?.args)) continue;
      command.args = command.args.map((argument) => typeof argument === "string" && (argument === PROJECT_ROOT || argument.startsWith(`${PROJECT_ROOT}${path.sep}`))
        ? path.join(target, path.relative(PROJECT_ROOT, argument))
        : argument);
    }
    fs.writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  }
  return target;
}

function deterministicMedia() {
  function videoTrack() {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    let frame = 0;
    const draw = () => {
      frame += 1;
      context.fillStyle = `hsl(${frame % 360} 65% 45%)`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "white";
      context.font = "20px sans-serif";
      context.fillText(`Mosh E2E ${frame}`, 18, 92);
    };
    draw();
    const interval = window.setInterval(draw, 100);
    const track = canvas.captureStream(10).getVideoTracks()[0];
    const stop = track.stop.bind(track);
    track.stop = () => { window.clearInterval(interval); stop(); };
    return track;
  }

  function audioTrack() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const audio = new AudioContextCtor();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const destination = audio.createMediaStreamDestination();
    oscillator.frequency.value = 220;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();
    void audio.resume?.();
    const track = destination.stream.getAudioTracks()[0];
    const stop = track.stop.bind(track);
    track.stop = () => { try { oscillator.stop(); } catch {} void audio.close?.(); stop(); };
    return track;
  }

  const mediaDevices = navigator.mediaDevices || {};
  Object.defineProperty(mediaDevices, "getUserMedia", {
    configurable: true,
    writable: true,
    value: async (constraints = {}) => new MediaStream([
      ...(constraints.audio ? [audioTrack()] : []),
      ...(constraints.video ? [videoTrack()] : []),
    ]),
  });
  Object.defineProperty(mediaDevices, "getDisplayMedia", {
    configurable: true,
    writable: true,
    value: async () => new MediaStream([videoTrack()]),
  });
  try { Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: mediaDevices }); } catch {}
}

async function findFrame(page, readyChannel = "general") {
  await expect.poll(async () => {
    for (const frame of page.frames()) {
      if (await frame.getByRole("button", { name: `#${readyChannel}`, exact: true }).isVisible().catch(() => false)) return true;
    }
    return false;
  }, { timeout: 120_000 }).toBe(true);
  for (const frame of page.frames()) {
    if (await frame.getByRole("button", { name: `#${readyChannel}`, exact: true }).isVisible().catch(() => false)) return frame;
  }
  throw new Error("Mosh frame disappeared after becoming ready.");
}

async function openChannel(page, name = "general") {
  const frame = await findFrame(page, name);
  const channel = frame.getByRole("button", { name: `#${name}`, exact: true });
  if (await channel.isVisible().catch(() => false)) await channel.click();
  await frame.getByRole("textbox", { name: `Message # ${name}` }).waitFor();
  return frame;
}

async function message(page, body, channel = "general") {
  const frame = await openChannel(page, channel);
  const composer = frame.getByRole("textbox", { name: `Message # ${channel}` });
  await composer.fill(body);
  await frame.getByRole("button", { name: "Send message" }).click();
  await expect(frame.getByText(body.trim().split(/\s+/)[0], { exact: false })).toBeVisible();
}

async function waitForMessage(page, body, channel = "general") {
  const frame = await openChannel(page, channel);
  await expect(frame.getByText(body, { exact: true })).toBeVisible();
}

async function createEnvironment(testInfo) {
  const developmentReloadProof = testInfo.file.endsWith("mosh-development-reload.spec.cjs");
  const project = copyProject(!developmentReloadProof);
  const output = { text: "" };
  const signalingPort = await freePort();
  const child = spawn(process.execPath, [matterhornCli(), "dev", "--local", "--no-install", "--no-emit", "--no-doctor"], {
    cwd: project,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      MATTERHORN_PEERJS_LOCAL_PORT: String(signalingPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output.text += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output.text += chunk.toString(); });
  let browser;
  const contexts = [];
  const lifecycle = { phase: "startup" };
  try {
    const links = await waitForLinks(child, output);
    const playwright = require("playwright");
    const browserType = playwright[testInfo.project.name] || playwright.chromium;
    const launchOptions = { headless: true };
    if (testInfo.project.name === "chromium") {
      launchOptions.args = [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--autoplay-policy=no-user-gesture-required"
      ];
    }
    browser = await browserType.launch(launchOptions);
    const users = [
      ["admin", links.admin],
      ["moderator", links.member],
      ["member", links.member],
      ["guest", links.guest],
    ];
    const pages = {};
    const pending = [];
    let previousUserReady = Promise.resolve();
    for (const [name, url] of users) {
      const contextOptions = { viewport: { width: 1280, height: 900 } };
      if (testInfo.project.name === "chromium") contextOptions.permissions = ["camera", "microphone"];
      const context = await browser.newContext(contextOptions);
      contexts.push(context);
      await context.addInitScript(deterministicMedia);
      const page = await context.newPage();
      pages[name] = page;
      page.on("console", (entry) => {
        const text = entry.text();
        if (entry.type() === "error"
          || (name === "moderator" && entry.type() !== "debug")
          || text.includes("[matterhorn app-bridge]")) {
          output.text += `\n[${name} ${entry.type()}] ${text}`;
        }
      });
      page.on("pageerror", (error) => { output.text += `\n[${name} pageerror] ${error.stack || error.message}`; });
      page.on("response", (response) => {
        if (response.status() !== 404 || !isLauncherAsset(response.request())) return;
        assetDiagnostic(output, name, page, lifecycle.phase, "404", response.request(), { status: response.status() });
      });
      page.on("requestfailed", (request) => {
        const errorText = request.failure()?.errorText || "";
        if (lifecycle.phase === "teardown" && /ERR_ABORTED/iu.test(errorText)) return;
        if (isLauncherAsset(request)) assetDiagnostic(output, name, page, lifecycle.phase, "requestfailed", request, { error: errorText || "unknown" });
      });
      const channel = name === "guest" ? "guest" : "general";
      const ready = previousUserReady
        .then(() => page.goto(url, { waitUntil: "domcontentloaded" }))
        .then(() => openChannel(page, channel));
      previousUserReady = ready;
      pending.push(ready.catch((error) => {
        throw new Error(`${name} did not become ready. URL=${url}\nPage=${page.url()}`, { cause: error });
      }));
    }
    await Promise.all(pending);
    lifecycle.phase = "test";
    return { browser, child, contexts, pages, links, output, project, testInfo, lifecycle };
  } catch (error) {
    lifecycle.phase = "teardown";
    await browser?.close().catch(() => {});
    terminate(child);
    fs.rmSync(project, { recursive: true, force: true });
    throw new Error(`${error.message}\n${output.text.slice(-20_000)}`, { cause: error });
  }
}

async function closeEnvironment(environment) {
  environment.lifecycle.phase = "teardown";
  for (const context of [...environment.contexts].reverse()) await context.close().catch(() => {});
  await environment.browser?.close().catch(() => {});
  terminate(environment.child);
  fs.rmSync(environment.project, { recursive: true, force: true });
}

const test = base.extend({
  mosh: async ({}, use, testInfo) => {
    const environment = await createEnvironment(testInfo);
    try {
      await use(environment);
    } finally {
      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach("mosh-harness.log", {
          body: environment.output.text,
          contentType: "text/plain"
        });
      }
      await closeEnvironment(environment);
    }
  },
});

module.exports = { test, expect, findFrame, openChannel, message, waitForMessage };
