# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> projects cross-channel forwards to a connected client and after reload
- Location: e2e/mosh-closed-surfaces.spec.cjs:40:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Message forwarded with encrypted file provenance.', { exact: true })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText('Message forwarded with encrypted file provenance.', { exact: true })

```

```yaml
- main:
  - complementary "Room navigation":
    - heading "Mosh" [level=1]
    - paragraph: on local-e6775e4f854f8b0396a7ce58c0bf6a2a
    - text: Live
    - group "Display settings":
      - button "Toggle compact mode": Compact
    - textbox "Find or start a conversation"
    - group: Bookmarks & reminders
    - region "Channels":
      - button "General" [expanded]
      - button "#general": general Room coordination
      - button "Guest" [expanded]
      - button "#guest": guest Guest lobby
    - text: Direct Messages
    - button "Start group DM"
    - button "Open status menu":
      - img "Guest 446 avatar": 💅
      - text: Guest 446 member
    - button "Mute mic"
    - button "Deafen"
    - button "Open voice settings"
  - heading "general" [level=2]
  - text: │Room coordination
  - group "Message history controls":
    - button "Load older messages"
    - textbox "History cursor"
    - button "Jump to cursor"
    - alert: Message forwarding requires an accessible resolved source message.
  - log "# general messages":
    - article:
      - img "Guest 446 avatar": 💅
      - text: Guest 446 You
      - time: 3:19 PM
      - link "Link to message from Guest 446":
        - /url: "#message-message_sha256-ec1d9269d2930a3b0a5f8e119273a4517421d53c367362a61d73f24c03a4d7d2"
        - text: "#"
      - paragraph: channel-forward-1786216778840
      - button "React with 👍": 👍
      - button "React with 😂": 😂
      - button "React with ❤️": ❤️
      - button "Choose reaction for message from Guest 446"
      - button "Reply to message from Guest 446"
      - button "Forward message from Guest 446"
      - button "More actions for message from Guest 446"
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
    - button "Guest 446 (you)" [disabled]:
      - img "Guest 446 (you) avatar": 💅
      - text: Guest 446 (you) Member
    - button "Guest 741, online":
      - img "Guest 741 avatar": 🧃
      - text: Guest 741 Owner
    - button "Guest 784, online":
      - img "Guest 784 avatar": 🌈
      - text: Guest 784 Guest
    - button "Guest 886, online":
      - img "Guest 886 avatar": 🧃
      - text: Guest 886 Member
    - text: Live now — 0
    - paragraph: Nothing live
```

# Test source

```ts
  1   | const { test, expect, findFrame, openChannel } = require("./fixtures/mosh.cjs");
  2   | 
  3   | function escapeRegExp(value) {
  4   |   return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  5   | }
  6   | 
  7   | function messageRow(frame, body) {
  8   |   return frame.getByText(body, { exact: true }).last().locator("xpath=ancestor::article");
  9   | }
  10  | 
  11  | async function memberDisplayName(frame) {
  12  |   const label = await frame.getByRole("button", { name: /\(you\)$/ }).first().innerText();
  13  |   return label.match(/^(.+?) \(you\)$/m)?.[1] || label.split("\n")[1];
  14  | }
  15  | 
  16  | async function openDirectMessage(page, targetPage, body) {
  17  |   const sender = await findFrame(page);
  18  |   const target = await findFrame(targetPage);
  19  |   const targetName = await memberDisplayName(target);
  20  |   const senderName = await memberDisplayName(sender);
  21  |   const targetMember = sender.locator('aside[aria-label="Room details"]').getByRole("button", { name: new RegExp(`^${escapeRegExp(targetName)},`) }).first();
  22  |   await targetMember.click({ button: "right" });
  23  |   await sender.getByRole("menuitem", { name: "Send DM" }).click();
  24  |   await sender.getByRole("textbox", { name: `Message ${targetName}` }).fill(body);
  25  |   await sender.getByRole("button", { name: "Send DM" }).click();
  26  |   const targetThread = target.locator('aside[aria-label="Room navigation"]').getByRole("button", { name: new RegExp(escapeRegExp(senderName)) }).first();
  27  |   await expect(targetThread).toBeVisible();
  28  |   await targetThread.click();
  29  |   await expect(target.locator("body")).toContainText(body);
  30  |   return { sender, target, targetName, senderName };
  31  | }
  32  | 
  33  | async function uploadEncryptedFile(frame, name) {
  34  |   const fileInput = frame.locator('input[type="file"]').first();
  35  |   await fileInput.setInputFiles({ name, mimeType: "text/plain", buffer: Buffer.from(`encrypted e2e fixture ${name}`) });
  36  |   await expect(frame.getByRole("button", { name: "Send message" })).toBeEnabled();
  37  | }
  38  | 
  39  | test.describe("Mosh closed public surfaces", () => {
  40  |   test("projects cross-channel forwards to a connected client and after reload", async ({ mosh }) => {
  41  |     const body = `channel-forward-${Date.now()}`;
  42  |     const source = await openChannel(mosh.pages.member);
  43  |     const adminGeneral = await openChannel(mosh.pages.admin);
  44  |     await source.getByRole("textbox", { name: "Message # general" }).fill(body);
  45  |     await source.getByRole("button", { name: "Send message" }).click();
  46  |     await expect(messageRow(adminGeneral, body)).toBeVisible();
  47  | 
  48  |     const sourceRow = messageRow(source, body);
  49  |     const sourceMessageId = await sourceRow.getAttribute("id");
  50  |     if (!sourceMessageId) throw new Error(`Message row for ${body} did not expose a stable id.`);
  51  |     await sourceRow.hover();
  52  |     await sourceRow.getByRole("button", { name: /Forward message from/ }).click({ force: true });
  53  |     const stableSourceRow = source.locator(`article#${sourceMessageId}`);
  54  |     const channelForwardTarget = stableSourceRow.getByRole("button", { name: "Forward to # guest" });
  55  |     if (await channelForwardTarget.count() === 0) {
  56  |       // Matterhorn's authoritative cross-channel forwarding projection is
  57  |       // still gated. The positive path remains exercised as soon as the
  58  |       // linked runtime exposes the target.
  59  |       await expect(channelForwardTarget).toHaveCount(0);
  60  |       await source.locator("span.context-menu-shroud").click({ force: true });
  61  |       test.skip(true, "Linked Matterhorn channel-forward projection is not available in this runtime.");
  62  |     }
  63  |     await channelForwardTarget.click();
> 64  |     await expect(source.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();
      |                                                                                                          ^ Error: expect(locator).toBeVisible() failed
  65  | 
  66  |     let target = await openChannel(mosh.pages.admin, "guest");
  67  |     await expect(messageRow(target, body)).toBeVisible({ timeout: 30_000 });
  68  | 
  69  |     await mosh.pages.admin.reload({ waitUntil: "domcontentloaded" });
  70  |     target = await openChannel(mosh.pages.admin, "guest");
  71  |     await expect(messageRow(target, body)).toBeVisible({ timeout: 30_000 });
  72  |   });
  73  | 
  74  |   test("applies participant-private DM reactions and pin controls through the public room path", async ({ mosh }) => {
  75  |     const body = `private-controls-${Date.now()}`;
  76  |     const { target } = await openDirectMessage(mosh.pages.member, mosh.pages.moderator, body);
  77  |     const row = messageRow(target, body);
  78  | 
  79  |     await row.hover();
  80  |     await row.getByRole("button", { name: /React with/ }).first().click();
  81  |     await expect(row.getByRole("button", { name: /^👍 \d+/ })).toBeVisible();
  82  | 
  83  |     await row.hover();
  84  |     await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
  85  |     await target.getByRole("menu").getByRole("menuitem", { name: "Pin Message" }).click();
  86  |     await expect(row.getByText("Pinned", { exact: true })).toBeVisible();
  87  | 
  88  |     await row.hover();
  89  |     await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
  90  |     await target.getByRole("menu").getByRole("menuitem", { name: "Unpin Message" }).click();
  91  |     await expect(row.getByText("Pinned", { exact: true })).toHaveCount(0);
  92  |   });
  93  | 
  94  |   test("forwards a Files v2 attachment across scopes with replacement provenance", async ({ mosh }) => {
  95  |     const token = Date.now();
  96  |     const body = `files-v2-forward-${token}`;
  97  |     const fileName = `forward-${token}.txt`;
  98  |     const source = await openChannel(mosh.pages.member);
  99  |     const filesGap = source.getByRole("status").filter({ hasText: "linked Files v2 transport fix" });
  100 |     if (await filesGap.isVisible().catch(() => false)) {
  101 |       await expect(filesGap).toBeVisible();
  102 |       await expect(source.getByRole("button", { name: "Attach file" })).toBeDisabled();
  103 |       test.skip(true, "Linked Matterhorn Files v2 transport is not available in this runtime.");
  104 |     }
  105 |     await uploadEncryptedFile(source, fileName);
  106 |     await source.getByRole("textbox", { name: "Message # general" }).fill(body);
  107 |     await source.getByRole("button", { name: "Send message" }).click();
  108 |     const sourceRow = messageRow(source, body);
  109 |     await expect(sourceRow.getByRole("complementary", { name: "Shared files" })).toBeVisible();
  110 |     const sourceId = (await sourceRow.getAttribute("id")).replace(/^message-/, "");
  111 | 
  112 |     const { target, targetName } = await openDirectMessage(mosh.pages.member, mosh.pages.moderator, `forward-target-${token}`);
  113 |     const channel = await openChannel(mosh.pages.member);
  114 |     const sourceMessage = messageRow(channel, body);
  115 |     await sourceMessage.hover();
  116 |     await sourceMessage.getByRole("button", { name: /Forward message from/ }).click({ force: true });
  117 |     const forwardTarget = sourceMessage.getByRole("button", { name: new RegExp(`^Forward to .*${escapeRegExp(targetName)}`) });
  118 |     await expect(forwardTarget).toBeVisible();
  119 |     await forwardTarget.click();
  120 | 
  121 |     await expect(channel.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();
  122 |     const forwarded = messageRow(target, body);
  123 |     await expect(forwarded.getByRole("complementary", { name: "Shared files" })).toBeVisible();
  124 |     const provenance = forwarded.locator('[data-forwarded-kind="channel"]');
  125 |     await expect(provenance).toHaveAttribute("data-forwarded-scope-id", "general");
  126 |     await expect(provenance).toHaveAttribute("data-forwarded-message-id", sourceId);
  127 |   });
  128 | 
  129 |   test("fails closed when provider-only Drive sharing is denied or has no eligible account", async ({ mosh }) => {
  130 |     const frame = await openChannel(mosh.pages.member);
  131 |     const driveInput = frame.locator('input[type="file"]').nth(1);
  132 |     await expect(driveInput).toHaveCount(1);
  133 |     await driveInput.setInputFiles({ name: "provider-only.txt", mimeType: "text/plain", buffer: Buffer.from("provider-only") });
  134 |     await expect(frame.getByRole("alert")).toContainText(/The user denied this third-party file request|No eligible Google Drive account|Google Drive room sharing is unavailable/);
  135 |     await expect(frame.getByRole("button", { name: "Send message" })).toBeDisabled();
  136 |   });
  137 | 
  138 |   test("uses typed custom-media references and honest recorder/provider boundaries", async ({ mosh }) => {
  139 |     const frame = await openChannel(mosh.pages.member);
  140 |     await frame.getByRole("button", { name: "Open custom media catalog" }).click();
  141 |     const catalog = frame.getByRole("region", { name: "Custom media catalog" });
  142 |     await expect(catalog.getByRole("note")).toContainText("encrypted room reference");
  143 |     await expect(catalog).not.toContainText(/<\/?(?:script|html|img)\b|javascript:/i);
  144 |     await expect(catalog.locator('a[href^="http"], audio[src^="http"], video[src^="http"], img[src^="http"]')).toHaveCount(0);
  145 | 
  146 |     const useButtons = catalog.getByRole("button", { name: "Use in message" });
  147 |     const referenceGate = frame.getByRole("status").filter({ hasText: "accepted-operation reference validator" });
  148 |     if (await referenceGate.isVisible().catch(() => false)) {
  149 |       await expect(referenceGate).toBeVisible();
  150 |       for (let index = 0; index < await useButtons.count(); index += 1) {
  151 |         await expect(useButtons.nth(index)).toBeDisabled();
  152 |       }
  153 |     } else {
  154 |       expect(await useButtons.count()).toBeGreaterThan(0);
  155 |       for (let index = 0; index < await useButtons.count(); index += 1) {
  156 |         await expect(useButtons.nth(index)).toBeEnabled();
  157 |       }
  158 |       await useButtons.first().click();
  159 |       await expect(frame.getByText(/custom media item attached/)).toBeVisible();
  160 |     }
  161 | 
  162 |     await catalog.getByLabel("Custom media type").selectOption("voice");
  163 |     const recordButton = catalog.getByRole("button", { name: "Record voice message" });
  164 |     await expect(recordButton).toBeVisible();
```