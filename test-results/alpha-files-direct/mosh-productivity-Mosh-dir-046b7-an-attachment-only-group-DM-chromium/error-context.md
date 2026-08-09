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
    - paragraph: on local-68fa58de995fe4de0b074cc1037c6d8b
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
    - button "E2E group 1786216637898 renamed":
      - img "E2E group 1786216637898 renamed avatar": 🦄
      - text: E2E group 1786216637898 renamed
    - button "Close E2E group 1786216637898 renamed DM"
    - button "Manage E2E group 1786216637898 renamed DM"
    - button "Start group DM"
    - button "Open status menu":
      - img "Guest 179 avatar": 💅
      - text: Guest 179 member
    - button "Mute mic"
    - button "Deafen"
    - button "Open voice settings"
  - heading "E2E group 1786216637898 renamed" [level=2]
  - text: │Direct message
  - group "Message history controls":
    - button "Load older messages"
    - textbox "History cursor"
    - button "Jump to cursor"
  - log "E2E group 1786216637898 renamed messages":
    - heading "Welcome to E2E group 1786216637898 renamed" [level=3]
    - paragraph: This is the start of E2E group 1786216637898 renamed. Send the first message to break the ice.
  - button "Insert link"
  - textbox "Message E2E group 1786216637898 renamed"
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
    - button "Guest 179 (you)" [disabled]:
      - img "Guest 179 (you) avatar": 💅
      - text: Guest 179 (you) Member
    - button "Guest 420, online":
      - img "Guest 420 avatar": 🪩
      - text: Guest 420 Guest
    - button "Guest 574, online":
      - img "Guest 574 avatar": 💅
      - text: Guest 574 Owner
    - button "Guest 798, online":
      - img "Guest 798 avatar": 🦄
      - text: Guest 798 Member
    - text: Live now — 0
    - paragraph: Nothing live
```

# Test source

```ts
  1   | const { test, expect, message, openChannel, findFrame } = require("./fixtures/mosh.cjs");
  2   | 
  3   | function messageRow(frame, body) {
  4   |   return frame.getByText(body, { exact: true }).last().locator("xpath=ancestor::article");
  5   | }
  6   | 
  7   | async function selectMessageMenuItem(frame, row, name) {
  8   |   let lastError;
  9   |   for (let attempt = 0; attempt < 3; attempt += 1) {
  10  |     await row.hover();
  11  |     await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
  12  |     const item = frame.getByRole("menu").getByRole("menuitem", { name });
  13  |     if (await item.isVisible().catch(() => false)) {
  14  |       try {
  15  |         await item.dispatchEvent("click");
  16  |         return;
  17  |       } catch (cause) {
  18  |         lastError = cause;
  19  |       }
  20  |     }
  21  |   }
  22  |   throw new Error(`Message menu item did not remain available: ${name}`, { cause: lastError });
  23  | }
  24  | 
  25  | test.describe("Mosh direct threads and personal productivity", () => {
  26  |   test("adds, lists, reads, completes, and removes a bookmark and reminder", async ({ mosh }) => {
  27  |     const body = `productivity-${Date.now()}`;
  28  |     await message(mosh.pages.member, body);
  29  |     const frame = await openChannel(mosh.pages.member);
  30  |     const row = messageRow(frame, body);
  31  | 
  32  |     await selectMessageMenuItem(frame, row, "Bookmark Message");
  33  |     const panel = frame.locator("details").filter({ hasText: "Bookmarks & reminders" });
  34  |     await panel.getByText("Bookmarks & reminders").click();
  35  |     await expect(panel.getByRole("button", { name: "Remove bookmark" })).toBeVisible();
  36  |     await panel.getByText("Bookmarks & reminders").click();
  37  | 
  38  |     await selectMessageMenuItem(frame, row, "Set Reminder");
  39  |     await panel.getByText("Bookmarks & reminders").click();
  40  |     await expect(panel.getByRole("button", { name: "Mark read" })).toBeVisible();
  41  |     await panel.getByRole("button", { name: "Mark read" }).click();
  42  |     await panel.getByRole("button", { name: "Complete" }).click();
  43  |     await panel.getByRole("button", { name: "Remove bookmark" }).click();
  44  |     await panel.getByRole("button", { name: "Remove reminder" }).click();
  45  |     await expect(panel).toContainText("No bookmarks yet.");
  46  |     await expect(panel).toContainText("No reminders yet.");
  47  |   });
  48  | 
  49  |   test("creates, renames, adds, removes, and sends an attachment-only group DM", async ({ mosh }) => {
  50  |     const frame = await openChannel(mosh.pages.member);
  51  |     const start = frame.getByRole("button", { name: "Start group DM" });
  52  |     await expect(start).toBeVisible();
  53  |     await start.click();
  54  |     const form = frame.getByRole("form", { name: "Create group DM" });
  55  |     const choices = form.getByRole("checkbox");
  56  |     const choiceCount = await choices.count();
  57  |     expect(choiceCount).toBeGreaterThanOrEqual(2);
  58  |     const choiceNames = await choices.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
  59  |     await choices.nth(0).check();
  60  |     await choices.nth(1).check();
  61  |     const groupName = `E2E group ${Date.now()}`;
  62  |     await form.getByRole("textbox", { name: "New group name" }).fill(groupName);
  63  |     await form.getByRole("button", { name: "Create group DM" }).click();
  64  |     await expect(frame.getByRole("textbox", { name: `Message ${groupName}` })).toBeVisible();
  65  | 
  66  |     const manage = frame.getByRole("button", { name: new RegExp(`Manage ${groupName} DM`) });
  67  |     await expect(manage).toBeVisible();
  68  |     await manage.click();
  69  |     const region = frame.getByRole("region", { name: `Manage ${groupName} group DM` });
  70  |     const renamed = `${groupName} renamed`;
  71  |     await region.getByRole("textbox", { name: "Group name" }).fill(renamed);
  72  |     await region.getByRole("button", { name: "Rename group" }).click();
  73  |     await expect(frame.getByRole("button", { name: new RegExp(`Manage ${renamed} DM`) })).toBeVisible();
  74  | 
  75  |     const renamedRegion = frame.getByRole("region", { name: `Manage ${renamed} group DM` });
  76  |     const membershipName = choiceNames[1];
  77  |     const removeChoices = renamedRegion.getByRole("group", { name: "People to remove" });
  78  |     await removeChoices.getByRole("checkbox", { name: membershipName }).check();
  79  |     await renamedRegion.getByRole("button", { name: "Remove members" }).click();
  80  |     const addChoices = renamedRegion.getByRole("group", { name: "People to add" });
  81  |     await expect(addChoices.getByRole("checkbox", { name: membershipName })).toBeVisible();
  82  |     await addChoices.getByRole("checkbox", { name: membershipName }).check();
  83  |     await renamedRegion.getByRole("button", { name: "Add members" }).click();
  84  |     await expect(removeChoices.getByRole("checkbox", { name: membershipName })).toBeVisible();
  85  |     await renamedRegion.getByRole("button", { name: "Close management" }).click();
  86  | 
  87  |     const filesGap = frame.getByRole("status").filter({ hasText: "linked Files v2 transport fix" });
  88  |     if (await filesGap.isVisible().catch(() => false)) {
  89  |       await expect(filesGap).toBeVisible();
  90  |       await expect(frame.getByRole("button", { name: "Attach file" })).toBeDisabled();
  91  |       test.skip(true, "Linked Matterhorn Files v2 transport is not available in this runtime.");
  92  |     }
  93  |     const fileInput = frame.locator('input[type="file"]').first();
  94  |     await fileInput.setInputFiles({ name: "e2e-attachment.txt", mimeType: "text/plain", buffer: Buffer.from("real encrypted attachment") });
  95  |     const send = frame.getByRole("button", { name: "Send message" });
> 96  |     await expect(send).toBeEnabled({ timeout: 30_000 });
      |                        ^ Error: expect(locator).toBeEnabled() failed
  97  |     await send.click();
  98  |     await expect(frame.getByText("Encrypted file", { exact: true })).toBeVisible({ timeout: 30_000 });
  99  |   });
  100 | });
  101 | 
```