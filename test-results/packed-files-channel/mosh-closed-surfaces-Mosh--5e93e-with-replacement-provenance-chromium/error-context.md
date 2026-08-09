# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:82:3

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
  49  |     await sourceRow.hover();
  50  |     await sourceRow.getByRole("button", { name: /Forward message from/ }).click({ force: true });
  51  |     await sourceRow.getByRole("button", { name: "Forward to # guest" }).click();
  52  |     await expect(source.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();
  53  | 
  54  |     let target = await openChannel(mosh.pages.admin, "guest");
  55  |     await expect(messageRow(target, body)).toBeVisible({ timeout: 30_000 });
  56  | 
  57  |     await mosh.pages.admin.reload({ waitUntil: "domcontentloaded" });
  58  |     target = await openChannel(mosh.pages.admin, "guest");
  59  |     await expect(messageRow(target, body)).toBeVisible({ timeout: 30_000 });
  60  |   });
  61  | 
  62  |   test("applies participant-private DM reactions and pin controls through the public room path", async ({ mosh }) => {
  63  |     const body = `private-controls-${Date.now()}`;
  64  |     const { target } = await openDirectMessage(mosh.pages.member, mosh.pages.moderator, body);
  65  |     const row = messageRow(target, body);
  66  | 
  67  |     await row.hover();
  68  |     await row.getByRole("button", { name: /React with/ }).first().click();
  69  |     await expect(row.getByRole("button", { name: /^👍 \d+/ })).toBeVisible();
  70  | 
  71  |     await row.hover();
  72  |     await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
  73  |     await target.getByRole("menu").getByRole("menuitem", { name: "Pin Message" }).click();
  74  |     await expect(row.getByText("Pinned", { exact: true })).toBeVisible();
  75  | 
  76  |     await row.hover();
  77  |     await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
  78  |     await target.getByRole("menu").getByRole("menuitem", { name: "Unpin Message" }).click();
  79  |     await expect(row.getByText("Pinned", { exact: true })).toHaveCount(0);
  80  |   });
  81  | 
  82  |   test("forwards a Files v2 attachment across scopes with replacement provenance", async ({ mosh }) => {
  83  |     const token = Date.now();
  84  |     const body = `files-v2-forward-${token}`;
  85  |     const fileName = `forward-${token}.txt`;
  86  |     const source = await openChannel(mosh.pages.member);
  87  |     const filesGap = source.getByRole("status").filter({ hasText: "packed Files v2 runtime fix" });
  88  |     if (await filesGap.isVisible().catch(() => false)) {
  89  |       await expect(filesGap).toBeVisible();
  90  |       await expect(source.getByRole("button", { name: "Attach file" })).toBeDisabled();
  91  |       return;
  92  |     }
  93  |     await uploadEncryptedFile(source, fileName);
  94  |     await source.getByRole("textbox", { name: "Message # general" }).fill(body);
  95  |     await source.getByRole("button", { name: "Send message" }).click();
  96  |     const sourceRow = messageRow(source, body);
  97  |     await expect(sourceRow.getByRole("complementary", { name: "Shared files" })).toBeVisible();
  98  |     const sourceId = (await sourceRow.getAttribute("id")).replace(/^message-/, "");
  99  | 
  100 |     const { target, targetName } = await openDirectMessage(mosh.pages.member, mosh.pages.moderator, `forward-target-${token}`);
  101 |     const channel = await openChannel(mosh.pages.member);
  102 |     const sourceMessage = messageRow(channel, body);
  103 |     await sourceMessage.hover();
  104 |     await sourceMessage.getByRole("button", { name: /Forward message from/ }).click({ force: true });
  105 |     const forwardTarget = sourceMessage.getByRole("button", { name: new RegExp(`^Forward to .*${escapeRegExp(targetName)}`) });
  106 |     await expect(forwardTarget).toBeVisible();
  107 |     await forwardTarget.click();
  108 | 
  109 |     await expect(channel.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();
  110 |     const forwarded = messageRow(target, body);
  111 |     await expect(forwarded.getByRole("complementary", { name: "Shared files" })).toBeVisible();
  112 |     const provenance = forwarded.locator('[data-forwarded-kind="channel"]');
  113 |     await expect(provenance).toHaveAttribute("data-forwarded-scope-id", "general");
  114 |     await expect(provenance).toHaveAttribute("data-forwarded-message-id", sourceId);
  115 |   });
  116 | 
  117 |   test("fails closed when provider-only Drive sharing is denied or has no eligible account", async ({ mosh }) => {
  118 |     const frame = await openChannel(mosh.pages.member);
  119 |     const driveInput = frame.locator('input[type="file"]').nth(1);
  120 |     if (await driveInput.count() === 0) {
  121 |       await expect(frame.getByRole("status").filter({ hasText: "packed Files v2 runtime fix" })).toBeVisible();
  122 |       return;
  123 |     }
  124 |     await driveInput.setInputFiles({ name: "provider-only.txt", mimeType: "text/plain", buffer: Buffer.from("provider-only") });
  125 |     await expect(frame.getByRole("alert")).toContainText(/The user denied this third-party file request|No eligible Google Drive account|Google Drive room sharing is unavailable/);
  126 |     await expect(frame.getByRole("button", { name: "Send message" })).toBeDisabled();
  127 |   });
  128 | 
  129 |   test("uses typed custom-media references and honest recorder/provider boundaries", async ({ mosh }) => {
  130 |     const frame = await openChannel(mosh.pages.member);
  131 |     await frame.getByRole("button", { name: "Open custom media catalog" }).click();
  132 |     const catalog = frame.getByRole("region", { name: "Custom media catalog" });
  133 |     await expect(catalog.getByRole("note")).toContainText("encrypted room reference");
  134 |     await expect(catalog).not.toContainText(/<\/?(?:script|html|img)\b|javascript:/i);
  135 |     await expect(catalog.locator('a[href^="http"], audio[src^="http"], video[src^="http"], img[src^="http"]')).toHaveCount(0);
  136 | 
```