# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-integrations-media.spec.cjs >> Mosh integrations and catalog-only custom media >> keeps integration secrets private through the real management surface
- Location: e2e/mosh-integrations-media.spec.cjs:12:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /^E2E encrypted integration ·/ })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('button', { name: /^E2E encrypted integration ·/ })

```

```yaml
- main:
  - complementary "Room navigation":
    - heading "Mosh" [level=1]
    - paragraph: on local-0ac68512f2987760b3d7230bdbed7d24
    - text: Live
    - group "Display settings":
      - button "Toggle compact mode": Compact
      - button "Manage"
    - textbox "Find or start a conversation"
    - group: Bookmarks & reminders
    - region "Channels":
      - button "General" [expanded]
      - button "Create channel"
      - button "#general": general Room coordination
      - button "Guest" [expanded]
      - button "Create channel"
      - button "#guest": guest Guest lobby
      - button "Voice Rooms" [expanded]
      - button "Create channel"
    - text: Direct Messages
    - button "Start group DM"
    - button "Open status menu":
      - img "Guest 532 avatar": 🔥
      - text: Guest 532 owner
    - button "Mute mic"
    - button "Deafen"
    - button "Open voice settings"
  - heading "general" [level=2]
  - text: │Room coordination
  - group "Message history controls":
    - button "Load older messages"
    - textbox "History cursor"
    - button "Jump to cursor"
  - log "# general messages":
    - 'heading "Welcome to # general" [level=3]'
    - paragraph: "This is the start of # general. Send the first message to break the ice."
  - button "Insert link"
  - 'textbox "Message # general"'
  - button "Attach file": Attach
  - button "Share to Google Drive": Drive
  - button "Advanced file picker": Advanced
  - button "Add emoji"
  - button "Open custom media catalog": Custom media
  - text: 0 / 2000
  - button "Send message" [disabled]: Send
  - complementary "Room details":
    - text: Online — 4
    - button "Guest 532 (you)":
      - img "Guest 532 (you) avatar": 🔥
      - text: Guest 532 (you) Owner
    - button "Guest 686, online":
      - img "Guest 686 avatar": 🧃
      - text: Guest 686 Member
    - button "Guest 717, online":
      - img "Guest 717 avatar": 💅
      - text: Guest 717 Member
    - button "Guest 811, online":
      - img "Guest 811 avatar": 🎈
      - text: Guest 811 Guest
    - text: Live now — 0
    - paragraph: Nothing live
  - dialog "Manage":
    - complementary "Room settings sections":
      - strong: local-0ac68512f2987760b3d7230bdbed7d24
      - text: Room settings Room
      - button "Overview"
      - button "Channels 2"
      - button "Voice channels 0"
      - button "Roles 5"
      - button "Members 4"
      - button "Admin"
      - button "Community"
      - button "Integrations"
    - heading "Integrations" [level=2]
    - text: Install and manage encrypted room integrations.
    - button "Close management"
    - region "Install integration":
      - heading "Install integration" [level=3]
      - text: Signed identity Integration ID
      - textbox "Integration ID": e2e-integration-1786207797872
      - text: Display name
      - textbox "Integration display name": E2E encrypted integration
      - text: Capabilities
      - textbox "Integration capabilities": events.ingress, events.egress, commands.register, commands.invoke, commands.result, webhooks.receive, webhooks.manage
      - button "Create identity and install"
    - region "Installed integrations":
      - heading "Installed integrations" [level=3]
      - text: 1 records
      - article:
        - button "Select E2E encrypted integration": E2E encrypted integration · enabled
        - button "Disable"
        - button "Uninstall"
    - region "Integration identity":
      - heading "E2E encrypted integration" [level=3]
      - text: enabled
      - paragraph:
        - text: "Identity:"
        - code: e2e-integration-1786207797872
      - paragraph:
        - text: "Public key:"
        - code: MCowBQYDK2VwAyEA9wXpb5-VFSd3fMiX5GlmYxEhUiM9ldokwWimuun7HFY
      - paragraph: "Capabilities: events.ingress, events.egress, commands.register, commands.invoke, commands.result, webhooks.receive, webhooks.manage"
    - region "Integration secrets":
      - heading "Encrypted secret storage" [level=3]
      - text: Never shown after submit Secret name
      - textbox "Secret name"
      - text: Secret value
      - textbox "Secret value"
      - button "Store secret" [disabled]
      - button "Rotate secret" [disabled]
    - region "Encrypted integration events":
      - heading "Encrypted ingress / egress" [level=3]
      - text: Payloads are encrypted by Matterhorn JSON payload
      - textbox "Integration event payload": "{\"type\":\"event\"}"
      - button "Send ingress"
      - button "Send egress"
    - region "Integration commands":
      - heading "Commands" [level=3]
      - text: Register, invoke, and publish results Command ID
      - textbox "Command ID"
      - text: Command name
      - textbox "Command name"
      - text: Description
      - textbox "Command description"
      - text: Required capabilities
      - textbox "Command capabilities": commands.register
      - button "Register command" [disabled]
      - button "Unregister command" [disabled]
      - text: Invocation args (JSON)
      - textbox "Command arguments": "{}"
      - button "Invoke command" [disabled]
      - text: Invocation ID
      - textbox "Invocation ID"
      - text: Result (JSON)
      - textbox "Command result": "{}"
      - text: Error (optional)
      - textbox "Command error"
      - button "Publish command result" [disabled]
    - region "Integration webhooks":
      - heading "Webhook policy and rate limits" [level=3]
      - text: Moderator-controlled Webhook ID
      - textbox "Webhook ID"
      - text: Max requests
      - spinbutton "Webhook max requests": "60"
      - text: Window (ms)
      - spinbutton "Webhook window": "60000"
      - text: Burst
      - spinbutton "Webhook burst": "10"
      - checkbox "Require moderator approval"
      - text: Require moderator approval
      - button "Register webhook" [disabled]
      - button "Remove webhook" [disabled]
      - button "Update rate limit" [disabled]
      - button "Update policy" [disabled]
    - status: Integration installed.
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
  25 |     const installation = frame.getByRole("button", { name: new RegExp(`^${displayName} ·`) });
> 26 |     await expect(installation).toBeVisible();
     |                                ^ Error: expect(locator).toBeVisible() failed
  27 |     await installation.click();
  28 | 
  29 |     const secret = `e2e-private-${Date.now()}`;
  30 |     await frame.getByLabel("Secret name").fill("api-key");
  31 |     await frame.getByLabel("Secret value").fill(secret);
  32 |     await frame.getByRole("button", { name: "Store secret" }).click();
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