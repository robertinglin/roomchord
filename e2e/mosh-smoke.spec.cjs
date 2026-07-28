const { test, expect, message, waitForMessage, openChannel, findFrame } = require("./fixtures/mosh.cjs");

test.describe("Mosh real four-user smoke", () => {
  test("synchronizes channels, guest isolation, presence, and reload", { tag: "@smoke" }, async ({ mosh }) => {
    const { pages } = mosh;
    const memberMessage = `member-smoke-${Date.now()}`;
    await message(pages.member, memberMessage);
    await waitForMessage(pages.admin, memberMessage);
    await waitForMessage(pages.moderator, memberMessage);

    const guestFrame = await openChannel(pages.guest, "guest");
    await expect(guestFrame.getByRole("textbox", { name: "Message # guest" })).toBeVisible();
    await expect(guestFrame.getByRole("button", { name: "#general", exact: true })).toHaveCount(0);
    await expect(guestFrame.getByRole("button", { name: "Manage", exact: true })).toHaveCount(0);

    const guestMessage = `guest-smoke-${Date.now()}`;
    await message(pages.guest, guestMessage, "guest");
    await waitForMessage(pages.admin, guestMessage, "guest");

    const adminFrame = await findFrame(pages.admin);
    const adminSelf = await adminFrame.getByRole("button", { name: /\(you\)$/ }).first().innerText();
    const adminName = adminSelf.match(/^(.+?) \(you\)$/m)?.[1] || adminSelf.split("\n")[1];
    await adminFrame.getByRole("button", { name: "Open status menu" }).click();
    await adminFrame.getByRole("menuitem", { name: "Set busy" }).click();
    const moderatorFrame = await findFrame(pages.moderator);
    await expect(moderatorFrame.getByRole("button", { name: new RegExp(`^${adminName}, busy$`) })).toBeVisible();

    await adminFrame.getByRole("button", { name: "Manage", exact: true }).click();
    await expect(adminFrame.getByRole("dialog", { name: "Manage" })).toBeVisible();
    await adminFrame.getByRole("button", { name: "Close management" }).click();

    await pages.member.reload({ waitUntil: "domcontentloaded" });
    const reloadedFrame = await openChannel(pages.member, "general");
    await expect(reloadedFrame.getByText(memberMessage, { exact: true })).toBeVisible();
  });
});
