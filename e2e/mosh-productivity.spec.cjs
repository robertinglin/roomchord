const { test, expect, message, openChannel, findFrame } = require("./fixtures/mosh.cjs");

function messageRow(frame, body) {
  return frame.getByText(body, { exact: true }).last().locator("xpath=ancestor::article");
}

async function selectMessageMenuItem(frame, row, name) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await row.hover();
    await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
    const item = frame.getByRole("menu").getByRole("menuitem", { name });
    if (await item.isVisible().catch(() => false)) {
      try {
        await item.dispatchEvent("click");
        return;
      } catch (cause) {
        lastError = cause;
      }
    }
  }
  throw new Error(`Message menu item did not remain available: ${name}`, { cause: lastError });
}

test.describe("Mosh direct threads and personal productivity", () => {
  test("adds, lists, reads, completes, and removes a bookmark and reminder", async ({ mosh }) => {
    const body = `productivity-${Date.now()}`;
    await message(mosh.pages.member, body);
    const frame = await openChannel(mosh.pages.member);
    const row = messageRow(frame, body);

    await selectMessageMenuItem(frame, row, "Bookmark Message");
    const panel = frame.locator("details").filter({ hasText: "Bookmarks & reminders" });
    await panel.getByText("Bookmarks & reminders").click();
    await expect(panel.getByRole("button", { name: "Remove bookmark" })).toBeVisible();
    await panel.getByText("Bookmarks & reminders").click();

    await selectMessageMenuItem(frame, row, "Set Reminder");
    await panel.getByText("Bookmarks & reminders").click();
    await expect(panel.getByRole("button", { name: "Mark read" })).toBeVisible();
    await panel.getByRole("button", { name: "Mark read" }).click();
    await panel.getByRole("button", { name: "Complete" }).click();
    await panel.getByRole("button", { name: "Remove bookmark" }).click();
    await panel.getByRole("button", { name: "Remove reminder" }).click();
    await expect(panel).toHaveCount(0);
  });

  test("creates, renames, adds, removes, and sends an attachment-only group DM", async ({ mosh }) => {
    const frame = await openChannel(mosh.pages.member);
    const start = frame.getByRole("button", { name: "Start group DM" });
    await expect(start).toBeVisible();
    await start.click();
    const form = frame.getByRole("form", { name: "Create group DM" });
    const choices = form.getByRole("checkbox");
    const choiceCount = await choices.count();
    expect(choiceCount).toBeGreaterThanOrEqual(2);
    const choiceNames = await choices.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
    await choices.nth(0).check();
    await choices.nth(1).check();
    const groupName = `E2E group ${Date.now()}`;
    await form.getByRole("textbox", { name: "New group name" }).fill(groupName);
    await form.getByRole("button", { name: "Create group DM" }).click();
    await expect(frame.getByRole("textbox", { name: `Message ${groupName}` })).toBeVisible();

    const manage = frame.getByRole("button", { name: new RegExp(`Manage ${groupName} DM`) });
    await expect(manage).toBeVisible();
    await manage.click();
    const region = frame.getByRole("region", { name: `Manage ${groupName} group DM` });
    const renamed = `${groupName} renamed`;
    await region.getByRole("textbox", { name: "Group name" }).fill(renamed);
    await region.getByRole("button", { name: "Rename group" }).click();
    await expect(frame.getByRole("button", { name: new RegExp(`Manage ${renamed} DM`) })).toBeVisible();

    const renamedRegion = frame.getByRole("region", { name: `Manage ${renamed} group DM` });
    const membershipName = choiceNames[1];
    const removeChoices = renamedRegion.getByRole("group", { name: "People to remove" });
    await removeChoices.getByRole("checkbox", { name: membershipName }).check();
    await renamedRegion.getByRole("button", { name: "Remove members" }).click();
    const addChoices = renamedRegion.getByRole("group", { name: "People to add" });
    await expect(addChoices.getByRole("checkbox", { name: membershipName })).toBeVisible();
    await addChoices.getByRole("checkbox", { name: membershipName }).check();
    await renamedRegion.getByRole("button", { name: "Add members" }).click();
    await expect(removeChoices.getByRole("checkbox", { name: membershipName })).toBeVisible();
    await renamedRegion.getByRole("button", { name: "Close management" }).click();

    const filesGap = frame.getByRole("status").filter({ hasText: "linked Files v2 transport fix" });
    if (await filesGap.isVisible().catch(() => false)) {
      await expect(filesGap).toBeVisible();
      await expect(frame.getByRole("button", { name: "Attach file" })).toBeDisabled();
      test.skip(true, "Linked Matterhorn Files v2 transport is not available in this runtime.");
    }
    const fileInput = frame.locator('input[type="file"]').first();
    await fileInput.setInputFiles({ name: "e2e-attachment.txt", mimeType: "text/plain", buffer: Buffer.from("real encrypted attachment") });
    const send = frame.getByRole("button", { name: "Send DM" });
    await expect(send).toBeEnabled({ timeout: 30_000 });
    await send.click();
    await expect(frame.getByText("Encrypted file", { exact: true })).toBeVisible({ timeout: 30_000 });
  });
});
