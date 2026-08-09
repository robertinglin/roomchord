# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-productivity.spec.cjs >> Mosh direct threads and personal productivity >> creates, renames, adds, removes, and sends an attachment-only group DM
- Location: e2e/mosh-productivity.spec.cjs:49:3

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 3
Received:    2
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
            - generic [ref=f1e14]: local-74826671ce934e3fc16465e735a8dbb5
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
            - img "Guest 655 avatar" [ref=f1e51]:
              - generic [ref=f1e52]: 🎈
            - generic [ref=f1e54]:
              - generic [ref=f1e55]: Guest 655
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
              - status [ref=f1e105]: Encrypted attachments are waiting for Matterhorn's linked Files v2 transport fix.
            - button "Add emoji" [ref=f1e106] [cursor=pointer]:
              - img [ref=f1e107]
            - button "Open custom media catalog" [ref=f1e111] [cursor=pointer]: Custom media
          - generic [ref=f1e112]: 0 / 2000
          - button "Send message" [disabled] [ref=f1e113]:
            - img [ref=f1e114]
            - text: Send
    - complementary "Room details" [ref=f1e116]:
      - generic [ref=f1e117]:
        - generic [ref=f1e118]: Online — 1
        - button "Guest 655 (you)" [disabled] [ref=f1e121]:
          - generic [ref=f1e122]:
            - img "Guest 655 (you) avatar" [ref=f1e123]:
              - generic [ref=f1e124]: 🎈
            - generic [ref=f1e126]:
              - generic [ref=f1e127]: Guest 655 (you)
              - generic [ref=f1e128]: Member
      - generic [ref=f1e129]:
        - generic [ref=f1e130]: Live now — 0
        - paragraph [ref=f1e132]: Nothing live
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
> 57  |     expect(choiceCount).toBeGreaterThanOrEqual(3);
      |                         ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
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
  76  |     const addName = choiceNames[2];
  77  |     await renamedRegion.getByRole("checkbox", { name: addName }).check();
  78  |     await renamedRegion.getByRole("button", { name: "Add members" }).click();
  79  |     const removalGap = renamedRegion.getByRole("status").filter({ hasText: "linked group-membership fix" });
  80  |     if (await removalGap.isVisible().catch(() => false)) {
  81  |       await expect(renamedRegion.getByRole("button", { name: "Remove members" })).toHaveCount(0);
  82  |     } else {
  83  |       await renamedRegion.getByRole("checkbox", { name: addName }).check();
  84  |       await renamedRegion.getByRole("button", { name: "Remove members" }).click();
  85  |     }
  86  |     await renamedRegion.getByRole("button", { name: "Close management" }).click();
  87  | 
  88  |     const filesGap = frame.getByRole("status").filter({ hasText: "linked Files v2 transport fix" });
  89  |     if (await filesGap.isVisible().catch(() => false)) {
  90  |       await expect(filesGap).toBeVisible();
  91  |       await expect(frame.getByRole("button", { name: "Attach file" })).toBeDisabled();
  92  |       test.skip(true, "Linked Matterhorn Files v2 transport is not available in this runtime.");
  93  |     }
  94  |     const fileInput = frame.locator('input[type="file"]').first();
  95  |     await fileInput.setInputFiles({ name: "e2e-attachment.txt", mimeType: "text/plain", buffer: Buffer.from("real encrypted attachment") });
  96  |     const send = frame.getByRole("button", { name: "Send message" });
  97  |     await expect(send).toBeEnabled({ timeout: 30_000 });
  98  |     await send.click();
  99  |     await expect(frame.getByText("Encrypted file", { exact: true })).toBeVisible({ timeout: 30_000 });
  100 |   });
  101 | });
  102 | 
```