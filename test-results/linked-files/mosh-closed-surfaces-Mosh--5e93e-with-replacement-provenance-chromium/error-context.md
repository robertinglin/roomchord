# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:91:3

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
  51  |     const channelForwardTarget = sourceRow.getByRole("button", { name: "Forward to # guest" });
  52  |     if (await channelForwardTarget.count() === 0) {
  53  |       // Matterhorn's authoritative cross-channel forwarding projection is
  54  |       // still gated. The positive path remains exercised as soon as the
  55  |       // target is exposed by the packed runtime.
  56  |       await expect(channelForwardTarget).toHaveCount(0);
  57  |       await source.locator("span.context-menu-shroud").click({ force: true });
  58  |       test.skip(true, "Packed Matterhorn channel-forward projection is not available in this runtime.");
  59  |     }
  60  |     await channelForwardTarget.click();
  61  |     await expect(source.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();
  62  | 
  63  |     let target = await openChannel(mosh.pages.admin, "guest");
  64  |     await expect(messageRow(target, body)).toBeVisible({ timeout: 30_000 });
  65  | 
  66  |     await mosh.pages.admin.reload({ waitUntil: "domcontentloaded" });
  67  |     target = await openChannel(mosh.pages.admin, "guest");
  68  |     await expect(messageRow(target, body)).toBeVisible({ timeout: 30_000 });
  69  |   });
  70  | 
  71  |   test("applies participant-private DM reactions and pin controls through the public room path", async ({ mosh }) => {
  72  |     const body = `private-controls-${Date.now()}`;
  73  |     const { target } = await openDirectMessage(mosh.pages.member, mosh.pages.moderator, body);
  74  |     const row = messageRow(target, body);
  75  | 
  76  |     await row.hover();
  77  |     await row.getByRole("button", { name: /React with/ }).first().click();
  78  |     await expect(row.getByRole("button", { name: /^👍 \d+/ })).toBeVisible();
  79  | 
  80  |     await row.hover();
  81  |     await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
  82  |     await target.getByRole("menu").getByRole("menuitem", { name: "Pin Message" }).click();
  83  |     await expect(row.getByText("Pinned", { exact: true })).toBeVisible();
  84  | 
  85  |     await row.hover();
  86  |     await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
  87  |     await target.getByRole("menu").getByRole("menuitem", { name: "Unpin Message" }).click();
  88  |     await expect(row.getByText("Pinned", { exact: true })).toHaveCount(0);
  89  |   });
  90  | 
  91  |   test("forwards a Files v2 attachment across scopes with replacement provenance", async ({ mosh }) => {
  92  |     const token = Date.now();
  93  |     const body = `files-v2-forward-${token}`;
  94  |     const fileName = `forward-${token}.txt`;
  95  |     const source = await openChannel(mosh.pages.member);
  96  |     const filesGap = source.getByRole("status").filter({ hasText: "packed Files v2 runtime fix" });
  97  |     if (await filesGap.isVisible().catch(() => false)) {
  98  |       await expect(filesGap).toBeVisible();
  99  |       await expect(source.getByRole("button", { name: "Attach file" })).toBeDisabled();
  100 |       test.skip(true, "Packed Matterhorn Files v2 runtime is not available in this runtime.");
  101 |     }
  102 |     await uploadEncryptedFile(source, fileName);
  103 |     await source.getByRole("textbox", { name: "Message # general" }).fill(body);
  104 |     await source.getByRole("button", { name: "Send message" }).click();
  105 |     const sourceRow = messageRow(source, body);
  106 |     await expect(sourceRow.getByRole("complementary", { name: "Shared files" })).toBeVisible();
  107 |     const sourceId = (await sourceRow.getAttribute("id")).replace(/^message-/, "");
  108 | 
  109 |     const { target, targetName } = await openDirectMessage(mosh.pages.member, mosh.pages.moderator, `forward-target-${token}`);
  110 |     const channel = await openChannel(mosh.pages.member);
  111 |     const sourceMessage = messageRow(channel, body);
  112 |     await sourceMessage.hover();
  113 |     await sourceMessage.getByRole("button", { name: /Forward message from/ }).click({ force: true });
  114 |     const forwardTarget = sourceMessage.getByRole("button", { name: new RegExp(`^Forward to .*${escapeRegExp(targetName)}`) });
  115 |     await expect(forwardTarget).toBeVisible();
  116 |     await forwardTarget.click();
  117 | 
  118 |     await expect(channel.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();
  119 |     const forwarded = messageRow(target, body);
  120 |     await expect(forwarded.getByRole("complementary", { name: "Shared files" })).toBeVisible();
  121 |     const provenance = forwarded.locator('[data-forwarded-kind="channel"]');
  122 |     await expect(provenance).toHaveAttribute("data-forwarded-scope-id", "general");
  123 |     await expect(provenance).toHaveAttribute("data-forwarded-message-id", sourceId);
  124 |   });
  125 | 
  126 |   test("fails closed when provider-only Drive sharing is denied or has no eligible account", async ({ mosh }) => {
  127 |     const frame = await openChannel(mosh.pages.member);
  128 |     const driveInput = frame.locator('input[type="file"]').nth(1);
  129 |     await expect(driveInput).toHaveCount(1);
  130 |     await driveInput.setInputFiles({ name: "provider-only.txt", mimeType: "text/plain", buffer: Buffer.from("provider-only") });
  131 |     await expect(frame.getByRole("alert")).toContainText(/The user denied this third-party file request|No eligible Google Drive account|Google Drive room sharing is unavailable/);
  132 |     await expect(frame.getByRole("button", { name: "Send message" })).toBeDisabled();
  133 |   });
  134 | 
  135 |   test("uses typed custom-media references and honest recorder/provider boundaries", async ({ mosh }) => {
  136 |     const frame = await openChannel(mosh.pages.member);
```