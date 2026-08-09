# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-integrations-media.spec.cjs >> Mosh integrations and catalog-only custom media >> keeps integration secrets private through the real management surface
- Location: e2e/mosh-integrations-media.spec.cjs:12:3

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Store secret' })
    - locator resolved to <button disabled type="button" class="x3nfvp2 x6s0dn4 xl56j7k x1j9xkj6 x16wdlz0 x1xk1jr8 xjxlxqh x1s688f xif65rj x1ypdohk xuxw1ft x16zmg18 x1ymh6t9">Store secret</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- iframe [active] [ref=e4]:
  - main [ref=f1e3]:
    - complementary "Room navigation" [ref=f1e4]:
      - generic [ref=f1e5]:
        - img [ref=f1e7]
        - generic [ref=f1e9]:
          - heading "Mosh" [level=1] [ref=f1e10]
          - paragraph [ref=f1e11]:
            - generic [ref=f1e13]: "on"
            - generic [ref=f1e14]: local-344bf616e55e5cba6c7690af935625bf
        - generic [ref=f1e15]:
          - generic [ref=f1e16]: Live
          - group "Display settings" [ref=f1e18]:
            - button "Toggle compact mode" [ref=f1e19] [cursor=pointer]: Compact
      - generic [ref=f1e20]:
        - generic [ref=f1e21]:
          - generic:
            - img
          - textbox "Find or start a conversation" [ref=f1e22]
        - group [ref=f1e23]:
          - generic "Bookmarks & reminders" [ref=f1e24]
        - region "Channels" [ref=f1e25]:
          - generic [ref=f1e26]:
            - button "Guest" [expanded] [ref=f1e28] [cursor=pointer]:
              - img [ref=f1e30]
              - generic [ref=f1e32]: Guest
            - button "#guest" [active] [ref=f1e33] [cursor=pointer]:
              - img [ref=f1e35]
              - generic [ref=f1e38]:
                - generic [ref=f1e39]: guest
                - generic [ref=f1e40]: Guest lobby
        - generic [ref=f1e41]:
          - generic [ref=f1e42]:
            - img [ref=f1e44]
            - generic [ref=f1e46]: Direct Messages
          - button "Start group DM" [ref=f1e47] [cursor=pointer]
      - generic "User controls" [ref=f1e48]:
        - generic [ref=f1e49]:
          - button "Open status menu" [ref=f1e50] [cursor=pointer]:
            - img "Guest 479 avatar" [ref=f1e51]:
              - generic [ref=f1e52]: 🔥
            - generic [ref=f1e54]:
              - generic [ref=f1e55]: Guest 479
              - generic [ref=f1e56]: guest
          - generic [ref=f1e57]:
            - button "Mute mic" [ref=f1e58] [cursor=pointer]:
              - img [ref=f1e59]
            - button "Deafen" [ref=f1e62] [cursor=pointer]:
              - img [ref=f1e63]
            - button "Open voice settings" [ref=f1e67] [cursor=pointer]:
              - img [ref=f1e68]
    - generic [ref=f1e71]:
      - generic [ref=f1e72]:
        - img [ref=f1e74]
        - heading "guest" [level=2] [ref=f1e77]
        - generic [ref=f1e78]: │Guest lobby
      - group "Message history controls" [ref=f1e79]:
        - button "Load older messages" [ref=f1e80] [cursor=pointer]
        - textbox "History cursor" [ref=f1e81]
        - button "Jump to cursor" [ref=f1e82] [cursor=pointer]
      - log "# guest messages" [ref=f1e83]:
        - generic [ref=f1e84]:
          - img [ref=f1e86]
          - 'heading "Welcome to # guest" [level=3] [ref=f1e89]'
          - paragraph [ref=f1e90]: "This is the start of # guest. Send the first message to break the ice."
      - generic [ref=f1e92]:
        - button "Insert link" [ref=f1e94] [cursor=pointer]:
          - img [ref=f1e95]
        - 'textbox "Message # guest" [ref=f1e98]'
        - generic [ref=f1e99]:
          - generic [ref=f1e100]:
            - generic [ref=f1e101]:
              - button "Attach file" [disabled] [ref=f1e102]: Attach
              - button "Share to Google Drive" [ref=f1e103] [cursor=pointer]: Drive
              - button "Advanced file picker" [disabled] [ref=f1e104]: Advanced
              - status [ref=f1e105]: Encrypted attachments are waiting for Matterhorn's packed Files v2 runtime fix.
            - button "Add emoji" [ref=f1e106] [cursor=pointer]:
              - img [ref=f1e107]
            - button "Open custom media catalog" [ref=f1e111] [cursor=pointer]: Custom media
          - generic [ref=f1e112]: 0 / 2000
          - button "Send message" [disabled] [ref=f1e113]:
            - img [ref=f1e114]
            - text: Send
    - complementary "Room details" [ref=f1e116]:
      - generic [ref=f1e117]:
        - generic [ref=f1e118]: Online — 4
        - generic [ref=f1e119]:
          - button "Guest 479 (you)" [disabled] [ref=f1e121]:
            - generic [ref=f1e122]:
              - img "Guest 479 (you) avatar" [ref=f1e123]:
                - generic [ref=f1e124]: 🔥
              - generic [ref=f1e126]:
                - generic [ref=f1e127]: Guest 479 (you)
                - generic [ref=f1e128]: Member
          - button "Guest 328, online" [ref=f1e130] [cursor=pointer]:
            - generic [ref=f1e131]:
              - img "Guest 328 avatar" [ref=f1e132]:
                - generic [ref=f1e133]: 🪩
              - generic [ref=f1e135]:
                - generic [ref=f1e136]: Guest 328
                - generic [ref=f1e137]: Guest
          - button "Guest 328, online" [ref=f1e139] [cursor=pointer]:
            - generic [ref=f1e140]:
              - img "Guest 328 avatar" [ref=f1e141]:
                - generic [ref=f1e142]: 🎧
              - generic [ref=f1e144]:
                - generic [ref=f1e145]: Guest 328
                - generic [ref=f1e146]: Guest
          - button "Guest 464, online" [ref=f1e148] [cursor=pointer]:
            - generic [ref=f1e149]:
              - img "Guest 464 avatar" [ref=f1e150]:
                - generic [ref=f1e151]: 🌙
              - generic [ref=f1e153]:
                - generic [ref=f1e154]: Guest 464
                - generic [ref=f1e155]: Owner
      - generic [ref=f1e156]:
        - generic [ref=f1e157]: Live now — 0
        - paragraph [ref=f1e159]: Nothing live
```

# Test source

```ts
  1  | const { test, expect, findFrame, openChannel } = require("./fixtures/mosh.cjs");
  2  | 
  3  | async function openManagement(page, tab) {
  4  |   const frame = await findFrame(page);
  5  |   await frame.getByRole("button", { name: "Manage", exact: true }).click();
  6  |   await expect(frame.getByRole("dialog", { name: "Manage" })).toBeVisible();
  7  |   await frame.getByRole("button", { name: new RegExp(`^${tab}`) }).click();
  8  |   return frame;
  9  | }
  10 | 
  11 | test.describe("Mosh integrations and catalog-only custom media", () => {
  12 |   test("keeps integration secrets private through the real management surface", async ({ mosh }) => {
  13 |     const frame = await openManagement(mosh.pages.admin, "Integrations");
  14 |     const unavailable = frame.getByRole("region", { name: "Integrations unavailable" });
  15 |     if (await unavailable.isVisible().catch(() => false)) {
  16 |       await expect(unavailable).toContainText("Matterhorn integrations are unavailable");
  17 |       return;
  18 |     }
  19 | 
  20 |     const integrationId = `e2e-integration-${Date.now()}`;
  21 |     const displayName = "E2E encrypted integration";
  22 |     await frame.getByLabel("Integration ID").fill(integrationId);
  23 |     await frame.getByLabel("Integration display name").fill(displayName);
  24 |     await frame.getByRole("button", { name: "Create identity and install" }).click();
  25 |     const installation = frame.getByRole("button", { name: `Select ${displayName}` });
  26 |     await expect(installation).toBeVisible();
  27 |     await installation.click();
  28 | 
  29 |     const secret = `e2e-private-${Date.now()}`;
  30 |     await frame.getByLabel("Secret name").fill("api-key");
  31 |     await frame.getByLabel("Secret value").fill(secret);
> 32 |     await frame.getByRole("button", { name: "Store secret" }).click();
     |                                                               ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  33 |     await expect(frame.getByLabel("Secret name")).toHaveValue("");
  34 |     await expect(frame.getByLabel("Secret value")).toHaveValue("");
  35 |     await expect(frame).not.toContainText(secret);
  36 |   });
  37 | 
  38 |   test("uses typed custom-media references with consent and safe rendering boundaries", async ({ mosh }) => {
  39 |     const frame = await openChannel(mosh.pages.admin);
  40 |     await frame.getByRole("button", { name: "Open custom media catalog" }).click();
  41 |     const catalog = frame.getByRole("region", { name: "Custom media catalog" });
  42 |     await expect(catalog).toBeVisible();
  43 |     await expect(catalog.getByRole("note")).toContainText("encrypted room reference");
  44 |     await expect(catalog).not.toContainText(/https?:\/\/|<\/?(?:script|html|img)\b|javascript:/i);
  45 |     await expect(catalog.locator('a[href^="http"], audio[src^="http"], video[src^="http"], img[src^="http"]')).toHaveCount(0);
  46 | 
  47 |     const useButtons = catalog.getByRole("button", { name: "Use in message" });
  48 |     for (let index = 0; index < await useButtons.count(); index += 1) {
  49 |       await expect(useButtons.nth(index)).toBeEnabled();
  50 |     }
  51 |     if (await useButtons.count()) {
  52 |       await useButtons.first().click();
  53 |       await expect(frame.getByText(/custom media item attached/)).toBeVisible();
  54 |     }
  55 | 
  56 |     await catalog.getByLabel("Custom media type").selectOption("voice");
  57 |     const recordButton = catalog.getByRole("button", { name: "Record voice message" });
  58 |     await expect(recordButton).toBeVisible();
  59 |     if (await recordButton.isDisabled()) {
  60 |       await expect(catalog).toContainText(/Encrypted Files v2 is unavailable|Google Drive/);
  61 |     }
  62 | 
  63 |     const providerQuery = catalog.getByLabel("Custom media provider query");
  64 |     if (await providerQuery.count()) {
  65 |       await providerQuery.fill("e2e-party");
  66 |       const consent = catalog.getByRole("checkbox", { name: /Allow this provider/ });
  67 |       await expect(consent).not.toBeChecked();
  68 |       await expect(catalog.getByRole("button", { name: "Search provider" })).toBeDisabled();
  69 |       await consent.check();
  70 |       const search = catalog.getByRole("button", { name: "Search provider" });
  71 |       if (await search.isEnabled()) await search.click();
  72 |     } else {
  73 |       await expect(catalog.getByRole("status").filter({ hasText: "No authorized media providers" })).toBeVisible();
  74 |     }
  75 |   });
  76 | });
  77 | 
```