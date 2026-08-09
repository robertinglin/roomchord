# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-productivity.spec.cjs >> Mosh direct threads and personal productivity >> creates, renames, adds, removes, and sends an attachment-only group DM
- Location: e2e/mosh-productivity.spec.cjs:49:3

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('button', { name: 'Send message' })
Expected: enabled
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" with timeout 30000ms
  - waiting for getByRole('button', { name: 'Send message' })

```

```yaml
- main:
  - complementary "Room navigation":
    - heading "Mosh" [level=1]
    - paragraph: on local-5f2825281b0bca6990d502a7b91fbd1c
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
    - button "E2E group 1786207787456 renamed":
      - img "E2E group 1786207787456 renamed avatar": 🌙
      - text: E2E group 1786207787456 renamed
    - button "Close E2E group 1786207787456 renamed DM"
    - button "Manage E2E group 1786207787456 renamed DM"
    - region "Manage E2E group 1786207787456 renamed group DM":
      - text: Group name
      - textbox "Group name"
      - button "Rename group"
      - group "Group members":
        - text: Group members
        - checkbox "Guest 189"
        - text: Guest 189
        - checkbox "Guest 629"
        - text: Guest 629
        - checkbox "Guest 316" [checked]
        - text: Guest 316
      - button "Add members"
      - button "Remove members"
      - button "Leave group DM"
      - button "Close management"
    - button "Start group DM"
    - alert: Core operation dm.thread.member.remove is invalid or unauthorized.
    - button "Open status menu":
      - img "Guest 475 avatar": 🔥
      - text: Guest 475 member
    - button "Mute mic"
    - button "Deafen"
    - button "Open voice settings"
  - heading "E2E group 1786207787456 renamed" [level=2]
  - text: │Direct message
  - group "Message history controls":
    - button "Load older messages"
    - textbox "History cursor"
    - button "Jump to cursor"
  - log "E2E group 1786207787456 renamed messages":
    - heading "Welcome to E2E group 1786207787456 renamed" [level=3]
    - paragraph: This is the start of E2E group 1786207787456 renamed. Send the first message to break the ice.
  - button "Insert link"
  - textbox "Message E2E group 1786207787456 renamed"
  - button "Attach file": Attach
  - button "Share to Google Drive": Drive
  - button "Advanced file picker": Advanced
  - text: Uploading e2e-attachment.txt 0%
  - button "Add emoji"
  - button "Open custom media catalog": Custom media
  - text: 0 / 2000
  - button "Send DM" [disabled]: Send
  - complementary "Room details":
    - text: Online — 4
    - button "Guest 475 (you)" [disabled]:
      - img "Guest 475 (you) avatar": 🔥
      - text: Guest 475 (you) Member
    - button "Guest 189, online":
      - img "Guest 189 avatar": 🌙
      - text: Guest 189 Owner
    - button "Guest 316, online":
      - img "Guest 316 avatar": 🌙
      - text: Guest 316 Guest
    - button "Guest 629, online":
      - img "Guest 629 avatar": 🍓
      - text: Guest 629 Member
    - text: Live now — 0
    - paragraph: Nothing live
```

# Test source

```ts
  1  | const { test, expect, message, openChannel, findFrame } = require("./fixtures/mosh.cjs");
  2  | 
  3  | function messageRow(frame, body) {
  4  |   return frame.getByText(body, { exact: true }).last().locator("xpath=ancestor::article");
  5  | }
  6  | 
  7  | async function selectMessageMenuItem(frame, row, name) {
  8  |   let lastError;
  9  |   for (let attempt = 0; attempt < 3; attempt += 1) {
  10 |     await row.hover();
  11 |     await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
  12 |     const item = frame.getByRole("menu").getByRole("menuitem", { name });
  13 |     if (await item.isVisible().catch(() => false)) {
  14 |       try {
  15 |         await item.dispatchEvent("click");
  16 |         return;
  17 |       } catch (cause) {
  18 |         lastError = cause;
  19 |       }
  20 |     }
  21 |   }
  22 |   throw new Error(`Message menu item did not remain available: ${name}`, { cause: lastError });
  23 | }
  24 | 
  25 | test.describe("Mosh direct threads and personal productivity", () => {
  26 |   test("adds, lists, reads, completes, and removes a bookmark and reminder", async ({ mosh }) => {
  27 |     const body = `productivity-${Date.now()}`;
  28 |     await message(mosh.pages.member, body);
  29 |     const frame = await openChannel(mosh.pages.member);
  30 |     const row = messageRow(frame, body);
  31 | 
  32 |     await selectMessageMenuItem(frame, row, "Bookmark Message");
  33 |     const panel = frame.locator("details").filter({ hasText: "Bookmarks & reminders" });
  34 |     await panel.getByText("Bookmarks & reminders").click();
  35 |     await expect(panel.getByRole("button", { name: "Remove bookmark" })).toBeVisible();
  36 |     await panel.getByText("Bookmarks & reminders").click();
  37 | 
  38 |     await selectMessageMenuItem(frame, row, "Set Reminder");
  39 |     await panel.getByText("Bookmarks & reminders").click();
  40 |     await expect(panel.getByRole("button", { name: "Mark read" })).toBeVisible();
  41 |     await panel.getByRole("button", { name: "Mark read" }).click();
  42 |     await panel.getByRole("button", { name: "Complete" }).click();
  43 |     await panel.getByRole("button", { name: "Remove bookmark" }).click();
  44 |     await panel.getByRole("button", { name: "Remove reminder" }).click();
  45 |     await expect(panel).toContainText("No bookmarks yet.");
  46 |     await expect(panel).toContainText("No reminders yet.");
  47 |   });
  48 | 
  49 |   test("creates, renames, adds, removes, and sends an attachment-only group DM", async ({ mosh }) => {
  50 |     const frame = await openChannel(mosh.pages.member);
  51 |     const start = frame.getByRole("button", { name: "Start group DM" });
  52 |     await expect(start).toBeVisible();
  53 |     await start.click();
  54 |     const form = frame.getByRole("form", { name: "Create group DM" });
  55 |     const choices = form.getByRole("checkbox");
  56 |     const choiceCount = await choices.count();
  57 |     test.skip(choiceCount < 3, "The real room fixture did not expose three selectable members for group management.");
  58 |     const choiceNames = await choices.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
  59 |     await choices.nth(0).check();
  60 |     await choices.nth(1).check();
  61 |     const groupName = `E2E group ${Date.now()}`;
  62 |     await form.getByRole("textbox", { name: "New group name" }).fill(groupName);
  63 |     await form.getByRole("button", { name: "Create group DM" }).click();
  64 |     await expect(frame.getByRole("textbox", { name: `Message ${groupName}` })).toBeVisible();
  65 | 
  66 |     const manage = frame.getByRole("button", { name: new RegExp(`Manage ${groupName} DM`) });
  67 |     await expect(manage).toBeVisible();
  68 |     await manage.click();
  69 |     const region = frame.getByRole("region", { name: `Manage ${groupName} group DM` });
  70 |     const renamed = `${groupName} renamed`;
  71 |     await region.getByRole("textbox", { name: "Group name" }).fill(renamed);
  72 |     await region.getByRole("button", { name: "Rename group" }).click();
  73 |     await expect(frame.getByRole("button", { name: new RegExp(`Manage ${renamed} DM`) })).toBeVisible();
  74 | 
  75 |     const renamedRegion = frame.getByRole("region", { name: `Manage ${renamed} group DM` });
  76 |     const addName = choiceNames[2];
  77 |     await renamedRegion.getByRole("checkbox", { name: addName }).check();
  78 |     await renamedRegion.getByRole("button", { name: "Add members" }).click();
  79 |     await renamedRegion.getByRole("checkbox", { name: addName }).check();
  80 |     await renamedRegion.getByRole("button", { name: "Remove members" }).click();
  81 | 
  82 |     const filesGap = frame.getByRole("status").filter({ hasText: "packed Files v2 runtime fix" });
  83 |     if (await filesGap.isVisible().catch(() => false)) {
  84 |       await expect(filesGap).toBeVisible();
  85 |       await expect(frame.getByRole("button", { name: "Attach file" })).toBeDisabled();
  86 |       return;
  87 |     }
  88 |     const fileInput = frame.locator('input[type="file"]').first();
  89 |     await fileInput.setInputFiles({ name: "e2e-attachment.txt", mimeType: "text/plain", buffer: Buffer.from("real encrypted attachment") });
  90 |     const send = frame.getByRole("button", { name: "Send message" });
> 91 |     await expect(send).toBeEnabled({ timeout: 30_000 });
     |                        ^ Error: expect(locator).toBeEnabled() failed
  92 |     await send.click();
  93 |     await expect(frame.getByText("Encrypted file", { exact: true })).toBeVisible({ timeout: 30_000 });
  94 |   });
  95 | });
  96 | 
```