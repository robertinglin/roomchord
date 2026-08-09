# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> projects cross-channel forwards to a connected client and after reload
- Location: e2e/mosh-closed-surfaces.spec.cjs:40:3

# Error details

```
Error: Matterhorn exited before readiness (1).
Cannot find module '@mh-gg/relay/src/matterhornrc.cjs'
Require stack:
- /tmp/mh-cli-ee959/package/runtime/bin/matterhorn.cjs

Cannot find module '@mh-gg/relay/src/matterhornrc.cjs'
Require stack:
- /tmp/mh-cli-ee959/package/runtime/bin/matterhorn.cjs

```

# Test source

```ts
  172 |     if (await frame.getByRole("button", { name: `#${readyChannel}`, exact: true }).isVisible().catch(() => false)) return frame;
  173 |   }
  174 |   throw new Error("Mosh frame disappeared after becoming ready.");
  175 | }
  176 | 
  177 | async function openChannel(page, name = "general") {
  178 |   const frame = await findFrame(page, name);
  179 |   const channel = frame.getByRole("button", { name: `#${name}`, exact: true });
  180 |   if (await channel.isVisible().catch(() => false)) await channel.click();
  181 |   await frame.getByRole("textbox", { name: `Message # ${name}` }).waitFor();
  182 |   return frame;
  183 | }
  184 | 
  185 | async function message(page, body, channel = "general") {
  186 |   const frame = await openChannel(page, channel);
  187 |   const composer = frame.getByRole("textbox", { name: `Message # ${channel}` });
  188 |   await composer.fill(body);
  189 |   await frame.getByRole("button", { name: "Send message" }).click();
  190 |   await expect(frame.getByText(body.trim().split(/\s+/)[0], { exact: false })).toBeVisible();
  191 | }
  192 | 
  193 | async function waitForMessage(page, body, channel = "general") {
  194 |   const frame = await openChannel(page, channel);
  195 |   await expect(frame.getByText(body, { exact: true })).toBeVisible();
  196 | }
  197 | 
  198 | async function createEnvironment(testInfo) {
  199 |   const project = copyProject();
  200 |   const output = { text: "" };
  201 |   const signalingPort = await freePort();
  202 |   const child = spawn(process.execPath, [matterhornCli(), "dev", "--local", "--no-install", "--no-emit", "--no-doctor"], {
  203 |     cwd: project,
  204 |     detached: process.platform !== "win32",
  205 |     env: {
  206 |       ...process.env,
  207 |       MATTERHORN_PEERJS_LOCAL_PORT: String(signalingPort),
  208 |     },
  209 |     stdio: ["ignore", "pipe", "pipe"],
  210 |   });
  211 |   child.stdout.on("data", (chunk) => { output.text += chunk.toString(); });
  212 |   child.stderr.on("data", (chunk) => { output.text += chunk.toString(); });
  213 |   let browser;
  214 |   const contexts = [];
  215 |   try {
  216 |     const links = await waitForLinks(child, output);
  217 |     const playwright = require("playwright");
  218 |     const browserType = playwright[testInfo.project.name] || playwright.chromium;
  219 |     const launchOptions = { headless: true };
  220 |     if (testInfo.project.name === "chromium") {
  221 |       launchOptions.args = [
  222 |         "--use-fake-ui-for-media-stream",
  223 |         "--use-fake-device-for-media-stream",
  224 |         "--autoplay-policy=no-user-gesture-required"
  225 |       ];
  226 |     }
  227 |     browser = await browserType.launch(launchOptions);
  228 |     const users = [
  229 |       ["admin", links.admin],
  230 |       ["moderator", links.member],
  231 |       ["member", links.member],
  232 |       ["guest", links.guest],
  233 |     ];
  234 |     const pages = {};
  235 |     const pending = [];
  236 |     let previousUserReady = Promise.resolve();
  237 |     for (const [name, url] of users) {
  238 |       const contextOptions = { viewport: { width: 1280, height: 900 } };
  239 |       if (testInfo.project.name === "chromium") contextOptions.permissions = ["camera", "microphone"];
  240 |       const context = await browser.newContext(contextOptions);
  241 |       contexts.push(context);
  242 |       await context.addInitScript(deterministicMedia);
  243 |       const page = await context.newPage();
  244 |       pages[name] = page;
  245 |       page.on("console", (entry) => {
  246 |         const text = entry.text();
  247 |         if (entry.type() === "error"
  248 |           || (name === "moderator" && entry.type() !== "debug")
  249 |           || text.includes("[matterhorn app-bridge]")) {
  250 |           output.text += `\n[${name} ${entry.type()}] ${text}`;
  251 |         }
  252 |       });
  253 |       page.on("pageerror", (error) => { output.text += `\n[${name} pageerror] ${error.stack || error.message}`; });
  254 |       page.on("requestfailed", (request) => {
  255 |         if (name === "moderator") output.text += `\n[moderator requestfailed] ${request.url()} ${request.failure()?.errorText || ""}`;
  256 |       });
  257 |       const channel = name === "guest" ? "guest" : "general";
  258 |       const ready = previousUserReady
  259 |         .then(() => page.goto(url, { waitUntil: "domcontentloaded" }))
  260 |         .then(() => openChannel(page, channel));
  261 |       previousUserReady = ready;
  262 |       pending.push(ready.catch((error) => {
  263 |         throw new Error(`${name} did not become ready. URL=${url}\nPage=${page.url()}`, { cause: error });
  264 |       }));
  265 |     }
  266 |     await Promise.all(pending);
  267 |     return { browser, child, contexts, pages, links, output, project, testInfo };
  268 |   } catch (error) {
  269 |     await browser?.close().catch(() => {});
  270 |     terminate(child);
  271 |     fs.rmSync(project, { recursive: true, force: true });
> 272 |     throw new Error(`${error.message}\n${output.text.slice(-20_000)}`, { cause: error });
      |           ^ Error: Matterhorn exited before readiness (1).
  273 |   }
  274 | }
  275 | 
  276 | async function closeEnvironment(environment) {
  277 |   for (const context of [...environment.contexts].reverse()) await context.close().catch(() => {});
  278 |   await environment.browser?.close().catch(() => {});
  279 |   terminate(environment.child);
  280 |   fs.rmSync(environment.project, { recursive: true, force: true });
  281 | }
  282 | 
  283 | const test = base.extend({
  284 |   mosh: async ({}, use, testInfo) => {
  285 |     const environment = await createEnvironment(testInfo);
  286 |     try {
  287 |       await use(environment);
  288 |     } finally {
  289 |       if (testInfo.status !== testInfo.expectedStatus) {
  290 |         await testInfo.attach("mosh-harness.log", {
  291 |           body: environment.output.text,
  292 |           contentType: "text/plain"
  293 |         });
  294 |       }
  295 |       await closeEnvironment(environment);
  296 |     }
  297 |   },
  298 | });
  299 | 
  300 | module.exports = { test, expect, findFrame, openChannel, message, waitForMessage };
  301 | 
```