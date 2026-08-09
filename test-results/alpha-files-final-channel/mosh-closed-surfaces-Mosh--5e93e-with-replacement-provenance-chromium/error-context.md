# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:94:3

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  getByRole('button', { name: 'Send message' })
Expected: enabled
Received: disabled
Timeout:  30000ms

Call log:
  - Expect "toBeEnabled" with timeout 30000ms
  - waiting for getByRole('button', { name: 'Send message' })
    63 × locator resolved to <button disabled type="button" title="Send message" aria-label="Send message" class="x1ku5rj1 xjxlxqh xxmwmei x14atkfc x1csxjeb xif65rj x17d4w8g x3nfvp2 x10w6t97 xxdel4r xwqf6dr x1h6gzvc x8bdfax xzqxkid">…</button>
       - unexpected value "disabled"

```

```yaml
- button "Send message" [disabled]: Send
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
> 36  |   await expect(frame.getByRole("button", { name: "Send message" })).toBeEnabled();
      |                                                                     ^ Error: expect(locator).toBeEnabled() failed
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
  64  |     await expect(source.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();
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
```