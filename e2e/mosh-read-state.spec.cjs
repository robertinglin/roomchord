const { test, expect, message, openChannel, findFrame } = require("./fixtures/mosh.cjs");

test.describe("Mosh channel read state", () => {
  test("viewing a channel clears its unread badge, also after a reload", async ({ mosh }) => {
    const reader = mosh.pages.admin;
    const readerFrame = await openChannel(reader, "guest");
    const general = () => readerFrame.getByRole("button", { name: "#general", exact: true });

    const body = `read-state-${Date.now()}`;
    await message(mosh.pages.moderator, body);
    await expect(general()).toContainText(/\d/, { timeout: 60_000 });

    await openChannel(reader, "general");
    await expect(readerFrame.getByText(body, { exact: true })).toBeVisible();
    await expect(general()).not.toContainText(/\d/, { timeout: 30_000 });

    await reader.reload();
    const reloaded = await findFrame(reader);
    await expect(reloaded.getByText(body, { exact: true })).toBeVisible({ timeout: 120_000 });
    await expect(reloaded.getByRole("button", { name: "#general", exact: true })).not.toContainText(/\d/, { timeout: 30_000 });
  });
});
