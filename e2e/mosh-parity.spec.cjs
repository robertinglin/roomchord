const { test, expect, message, openChannel, findFrame } = require("./fixtures/mosh.cjs");

function messageRow(frame, body) {
  return frame.getByText(body, { exact: true }).last().locator("xpath=ancestor::article");
}

async function createVoiceRoom(page) {
  const frame = await findFrame(page);
  await frame.getByRole("button", { name: "Manage", exact: true }).click();
  await expect(frame.getByRole("dialog", { name: "Manage" })).toBeVisible();
  await frame.getByRole("button", { name: /^Voice channels/ }).click();
  const roomName = `e2e-parity-voice-${Date.now()}`;
  await frame.getByRole("button", { name: "New voice channel" }).click();
  const dialog = frame.getByRole("dialog", { name: "Create voice channel" });
  await dialog.getByRole("textbox", { name: "Voice channel name" }).fill(roomName);
  await dialog.getByRole("button", { name: "Create voice channel" }).click();
  await expect(frame.getByRole("button", { name: new RegExp(`^Join ${roomName}$`) })).toBeVisible();
  await frame.getByRole("button", { name: "Close management" }).click();
  return roomName;
}

test.describe("Mosh parity availability", () => {
  test("shows the encrypted search results surface", async ({ mosh }) => {
    const frame = await openChannel(mosh.pages.member);
    const search = frame.getByPlaceholder("Find or start a conversation");
    await search.fill(`e2e-search-${Date.now()}`);

    const results = frame.getByRole("region", { name: "Search results" });
    await expect(results).toBeVisible();
    await expect(results.getByRole("button", { name: "All", exact: true })).not.toBeDisabled();
    await expect(results.getByRole("button", { name: "Messages", exact: true })).not.toBeDisabled();
    await results.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(results.getByLabel("Search author")).toBeVisible();
    await expect(results.getByLabel("Search after")).toBeVisible();
    await expect(results.getByLabel("Search before")).toBeVisible();
    await results.getByRole("button", { name: "Files", exact: true }).click();
    await expect(results.getByRole("button", { name: "Files", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("exposes the public personal unread action", async ({ mosh }) => {
    const body = `e2e-unread-${Date.now()}`;
    await message(mosh.pages.member, body);
    const frame = await openChannel(mosh.pages.member);
    const row = messageRow(frame, body);
    await row.hover();
    await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
    const markUnread = frame.getByRole("menu").getByRole("menuitem", { name: /Mark Unread/ });
    await expect(markUnread).toBeVisible();
    await expect(markUnread).not.toBeDisabled();
  });

  test("composes the browser SFU moderation controller in a joined voice room", async ({ mosh }) => {
    const roomName = await createVoiceRoom(mosh.pages.admin);
    const frame = await findFrame(mosh.pages.member);
    await frame.getByRole("button", { name: new RegExp(`^Join ${roomName}$`) }).first().click();

    const room = frame.getByRole("region", { name: new RegExp(roomName) });
    await expect(room).not.toContainText("Voice moderation is unavailable");
    await expect(room.getByRole("button", { name: "Request to speak" })).toHaveCount(0);
  });
});
