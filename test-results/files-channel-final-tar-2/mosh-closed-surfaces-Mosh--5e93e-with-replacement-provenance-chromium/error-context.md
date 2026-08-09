# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:82:3

# Error details

```
Error: Matterhorn exited before readiness (1).
(node:1184917) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
Publishing . and bootstrapping room local-73294432a0bcdaee06ce56671c21e153.
Started Matterhorn dev standalone relay peerjs:matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone-relay.
(node:1184934) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1184953) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
matterhorn room relay peer is live as matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone
matterhorn relay mesh peer is live as matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone-relay
matterhorn relay IPC is live.
IPC:        ws://127.0.0.1:44270/room
Room peer:  matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone
Mesh peer:  matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone-relay
Mesh addr:  peerjs:matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone-relay@ws://127.0.0.1:39217/peerjs
Profile:    development
Name:       local-73294432a0bcdaee06ce56671c21e153-standalone#0000
Identity:   sha256-spki:IBH3qQsy1aPrOhPI2SpbRVlSYhUS4f3tcTU45w2ieRk
PeerJS:     http://127.0.0.1:39217/peerjs
Storage:    /tmp/mosh-playwright-SPmJNV/.matterhorn/dev/relay/local-73294432a0bcdaee06ce56671c21e153/relay
Local Matterhorn launcher assets are missing at /tmp/mh-final-tar/package/runtime/client/dist. Build the launcher or configure a relay so dev can use an existing launcher.

(node:1184917) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
Publishing . and bootstrapping room local-73294432a0bcdaee06ce56671c21e153.
Started Matterhorn dev standalone relay peerjs:matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone-relay.
(node:1184934) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1184953) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
matterhorn room relay peer is live as matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone
matterhorn relay mesh peer is live as matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone-relay
matterhorn relay IPC is live.
IPC:        ws://127.0.0.1:44270/room
Room peer:  matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone
Mesh peer:  matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone-relay
Mesh addr:  peerjs:matterhorn-dev-local-73294432a0bcdaee06ce56671c21e153-standalone-relay@ws://127.0.0.1:39217/peerjs
Profile:    development
Name:       local-73294432a0bcdaee06ce56671c21e153-standalone#0000
Identity:   sha256-spki:IBH3qQsy1aPrOhPI2SpbRVlSYhUS4f3tcTU45w2ieRk
PeerJS:     http://127.0.0.1:39217/peerjs
Storage:    /tmp/mosh-playwright-SPmJNV/.matterhorn/dev/relay/local-73294432a0bcdaee06ce56671c21e153/relay
Local Matterhorn launcher assets are missing at /tmp/mh-final-tar/package/runtime/client/dist. Build the launcher or configure a relay so dev can use an existing launcher.

```

# Test source

```ts
  166 |     if (await frame.getByRole("button", { name: `#${readyChannel}`, exact: true }).isVisible().catch(() => false)) return frame;
  167 |   }
  168 |   throw new Error("Mosh frame disappeared after becoming ready.");
  169 | }
  170 | 
  171 | async function openChannel(page, name = "general") {
  172 |   const frame = await findFrame(page, name);
  173 |   const channel = frame.getByRole("button", { name: `#${name}`, exact: true });
  174 |   if (await channel.isVisible().catch(() => false)) await channel.click();
  175 |   await frame.getByRole("textbox", { name: `Message # ${name}` }).waitFor();
  176 |   return frame;
  177 | }
  178 | 
  179 | async function message(page, body, channel = "general") {
  180 |   const frame = await openChannel(page, channel);
  181 |   const composer = frame.getByRole("textbox", { name: `Message # ${channel}` });
  182 |   await composer.fill(body);
  183 |   await frame.getByRole("button", { name: "Send message" }).click();
  184 |   await expect(frame.getByText(body.trim().split(/\s+/)[0], { exact: false })).toBeVisible();
  185 | }
  186 | 
  187 | async function waitForMessage(page, body, channel = "general") {
  188 |   const frame = await openChannel(page, channel);
  189 |   await expect(frame.getByText(body, { exact: true })).toBeVisible();
  190 | }
  191 | 
  192 | async function createEnvironment(testInfo) {
  193 |   const project = copyProject();
  194 |   const output = { text: "" };
  195 |   const signalingPort = await freePort();
  196 |   const child = spawn(process.execPath, [matterhornCli(), "dev", "--local", "--no-install", "--no-emit", "--no-doctor"], {
  197 |     cwd: project,
  198 |     detached: process.platform !== "win32",
  199 |     env: {
  200 |       ...process.env,
  201 |       MATTERHORN_PEERJS_LOCAL_PORT: String(signalingPort),
  202 |     },
  203 |     stdio: ["ignore", "pipe", "pipe"],
  204 |   });
  205 |   child.stdout.on("data", (chunk) => { output.text += chunk.toString(); });
  206 |   child.stderr.on("data", (chunk) => { output.text += chunk.toString(); });
  207 |   let browser;
  208 |   const contexts = [];
  209 |   try {
  210 |     const links = await waitForLinks(child, output);
  211 |     const playwright = require("playwright");
  212 |     const browserType = playwright[testInfo.project.name] || playwright.chromium;
  213 |     const launchOptions = { headless: true };
  214 |     if (testInfo.project.name === "chromium") {
  215 |       launchOptions.args = [
  216 |         "--use-fake-ui-for-media-stream",
  217 |         "--use-fake-device-for-media-stream",
  218 |         "--autoplay-policy=no-user-gesture-required"
  219 |       ];
  220 |     }
  221 |     browser = await browserType.launch(launchOptions);
  222 |     const users = [
  223 |       ["admin", links.admin],
  224 |       ["moderator", links.member],
  225 |       ["member", links.member],
  226 |       ["guest", links.guest],
  227 |     ];
  228 |     const pages = {};
  229 |     const pending = [];
  230 |     let previousUserReady = Promise.resolve();
  231 |     for (const [name, url] of users) {
  232 |       const contextOptions = { viewport: { width: 1280, height: 900 } };
  233 |       if (testInfo.project.name === "chromium") contextOptions.permissions = ["camera", "microphone"];
  234 |       const context = await browser.newContext(contextOptions);
  235 |       contexts.push(context);
  236 |       await context.addInitScript(deterministicMedia);
  237 |       const page = await context.newPage();
  238 |       pages[name] = page;
  239 |       page.on("console", (entry) => {
  240 |         const text = entry.text();
  241 |         if (entry.type() === "error"
  242 |           || (name === "moderator" && entry.type() !== "debug")
  243 |           || text.includes("[matterhorn app-bridge]")) {
  244 |           output.text += `\n[${name} ${entry.type()}] ${text}`;
  245 |         }
  246 |       });
  247 |       page.on("pageerror", (error) => { output.text += `\n[${name} pageerror] ${error.stack || error.message}`; });
  248 |       page.on("requestfailed", (request) => {
  249 |         if (name === "moderator") output.text += `\n[moderator requestfailed] ${request.url()} ${request.failure()?.errorText || ""}`;
  250 |       });
  251 |       const channel = name === "guest" ? "guest" : "general";
  252 |       const ready = previousUserReady
  253 |         .then(() => page.goto(url, { waitUntil: "domcontentloaded" }))
  254 |         .then(() => openChannel(page, channel));
  255 |       previousUserReady = ready;
  256 |       pending.push(ready.catch((error) => {
  257 |         throw new Error(`${name} did not become ready. URL=${url}\nPage=${page.url()}`, { cause: error });
  258 |       }));
  259 |     }
  260 |     await Promise.all(pending);
  261 |     return { browser, child, contexts, pages, links, output, project, testInfo };
  262 |   } catch (error) {
  263 |     await browser?.close().catch(() => {});
  264 |     terminate(child);
  265 |     fs.rmSync(project, { recursive: true, force: true });
> 266 |     throw new Error(`${error.message}\n${output.text.slice(-20_000)}`, { cause: error });
      |           ^ Error: Matterhorn exited before readiness (1).
  267 |   }
  268 | }
  269 | 
  270 | async function closeEnvironment(environment) {
  271 |   for (const context of [...environment.contexts].reverse()) await context.close().catch(() => {});
  272 |   await environment.browser?.close().catch(() => {});
  273 |   terminate(environment.child);
  274 |   fs.rmSync(environment.project, { recursive: true, force: true });
  275 | }
  276 | 
  277 | const test = base.extend({
  278 |   mosh: async ({}, use, testInfo) => {
  279 |     const environment = await createEnvironment(testInfo);
  280 |     try {
  281 |       await use(environment);
  282 |     } finally {
  283 |       if (testInfo.status !== testInfo.expectedStatus) {
  284 |         await testInfo.attach("mosh-harness.log", {
  285 |           body: environment.output.text,
  286 |           contentType: "text/plain"
  287 |         });
  288 |       }
  289 |       await closeEnvironment(environment);
  290 |     }
  291 |   },
  292 | });
  293 | 
  294 | module.exports = { test, expect, findFrame, openChannel, message, waitForMessage };
  295 | 
```