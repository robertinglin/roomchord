const { test, expect, openChannel, findFrame } = require("./fixtures/mosh.cjs");

async function manage(page, tab) {
  const frame = await findFrame(page);
  await frame.getByRole("button", { name: "Manage", exact: true }).click();
  await expect(frame.getByRole("dialog", { name: "Manage" })).toBeVisible();
  if (tab) await frame.getByRole("button", { name: new RegExp(`^${tab}`) }).click();
  return frame;
}

async function currentMemberName(frame) {
  const label = await frame.getByRole("button", { name: /\(you\)$/ }).first().innerText();
  return label.match(/^(.+?) \(you\)$/m)?.[1] || label.split("\n")[1];
}

test.describe("Mosh management and authorization", () => {
  test("admin creates text channels", async ({ mosh }) => {
    const frame = await manage(mosh.pages.admin, "Channels");
    const channelName = `e2e-channel-${Date.now()}`;
    await frame.getByRole("button", { name: "New channel", exact: true }).click();
    const dialog = frame.getByRole("dialog", { name: "Create channel" });
    await dialog.getByRole("textbox", { name: "Channel name" }).fill(channelName);
    await dialog.getByRole("textbox", { name: "Channel topic" }).fill("Playwright coverage");
    await dialog.getByRole("button", { name: "Create channel", exact: true }).click();
    await expect(frame.getByText(`#${channelName}`, { exact: true })).toBeVisible();
  });

  test("admin creates voice rooms and custom roles", async ({ mosh }) => {
    const frame = await manage(mosh.pages.admin, "Voice channels");
    const voiceName = `e2e-voice-${Date.now()}`;
    await frame.getByRole("button", { name: "New voice channel" }).click();
    const voiceDialog = frame.getByRole("dialog", { name: "Create voice channel" });
    await voiceDialog.getByRole("textbox", { name: "Voice channel name" }).fill(voiceName);
    await voiceDialog.getByRole("button", { name: "Create voice channel" }).click();
    await expect(frame.getByRole("button", { name: new RegExp(`^Join ${voiceName}$`) })).toBeVisible();

    await frame.getByRole("button", { name: "Close management" }).click();
    const roles = await manage(mosh.pages.admin, "Roles");
    const roleName = `E2E Role ${Date.now()}`;
    await roles.getByRole("textbox", { name: "Role name" }).fill(roleName);
    await roles.getByRole("textbox", { name: "Role description" }).fill("Playwright role");
    await roles.getByRole("button", { name: "Create role" }).click();
    await expect(roles.getByText(roleName, { exact: true })).toBeVisible();
  });

  test("admin reviews members, moderation, and invite records", async ({ mosh }) => {
    const members = await manage(mosh.pages.admin, "Members");
    await expect(members.getByTestId("manage-member-row")).toHaveCount(4);

    await members.getByRole("button", { name: "Close management" }).click();
    const admin = await manage(mosh.pages.admin, "Admin");
    const adminRows = admin.getByTestId("admin-member-row");
    await expect(adminRows).toHaveCount(4);
    const adminName = await currentMemberName(admin);
    const currentAdmin = adminRows.filter({ hasText: adminName }).first();
    await expect(currentAdmin.getByTestId("member-toggle-chat")).toBeDisabled();
    await expect(currentAdmin.getByTestId("member-ban")).toBeDisabled();
    let moderatedMember;
    for (let index = 0; index < await adminRows.count(); index += 1) {
      const candidate = adminRows.nth(index);
      const muteChat = candidate.getByTestId("member-toggle-chat");
      if (await muteChat.isEnabled().catch(() => false)) {
        moderatedMember = candidate;
        await muteChat.click();
        await expect(candidate.getByTestId("member-toggle-chat")).toHaveText("Unmute chat");
        await candidate.getByTestId("member-toggle-chat").click();
        break;
      }
    }
    if (moderatedMember) {
      const profileLock = moderatedMember.getByTestId("member-toggle-profile-lock");
      await profileLock.click();
      await expect(profileLock).toHaveText("Unlock profile");
      await profileLock.click();
      await expect(profileLock).toHaveText("Lock profile");

      const ban = moderatedMember.getByTestId("member-ban");
      await ban.click();
      await expect(moderatedMember.getByTestId("member-unban")).toBeVisible();
      await moderatedMember.getByTestId("member-unban").click();
      await expect(moderatedMember.getByTestId("member-ban")).toBeVisible();
    }
    const invites = admin.getByTestId("admin-invite-row");
    await expect(invites).toHaveCount(3);
    const invite = invites.first();
    await invite.getByTestId("invite-disable").click();
    await expect(invite.getByText("disabled", { exact: true })).toBeVisible();
    await invite.getByTestId("invite-remove").click();
  });

  test("admin promotion is visible and lower roles stay restricted", async ({ mosh }) => {
    const moderatorFrame = await findFrame(mosh.pages.moderator);
    const moderatorName = await currentMemberName(moderatorFrame);
    const admin = await manage(mosh.pages.admin, "Members");
    const memberRows = admin.getByTestId("manage-member-row");
    await expect(memberRows).toHaveCount(4);
    await memberRows.filter({ hasText: moderatorName }).first().click();

    await admin.getByPlaceholder(moderatorName).fill("Playwright nickname");
    await admin.locator("textarea").fill("Playwright member note");
    await admin.getByRole("button", { name: "Save profile" }).click();
    const ignore = admin.getByRole("checkbox", { name: /^Ignore / }).first();
    const block = admin.getByRole("checkbox", { name: /^Block / }).first();
    await ignore.evaluate((element) => element.click());
    await block.evaluate((element) => element.click());
    await expect(ignore).toBeChecked();
    await expect(block).toBeChecked();

    const moderatorRole = admin.getByRole("checkbox", { name: "Moderator role tag" }).first();
    await moderatorRole.click();
    const saveRoles = admin.getByRole("button", { name: "Save roles" });
    await saveRoles.click();
    await expect(saveRoles).toBeEnabled();
    const roleError = admin.getByRole("alert");
    if (await roleError.count()) throw new Error(`Role assignment failed: ${await roleError.first().innerText()}`);
    await expect(moderatorRole).toBeChecked();
    await admin.getByRole("button", { name: "Close management" }).click();

    expect(mosh.pages.moderator.url()).not.toContain("inviteKey=");
    const moderatorStorageKeys = await mosh.pages.moderator.evaluate(() => Object.keys(window.localStorage));
    expect(moderatorStorageKeys).toContain("matterhorn:profile");
    expect(moderatorStorageKeys).toContain("matterhorn:saved-invites");
    expect(moderatorStorageKeys.some((key) => key.startsWith("matterhorn:mls-group-state:"))).toBe(true);

    await mosh.pages.moderator.reload({ waitUntil: "domcontentloaded" });
    await openChannel(mosh.pages.moderator);
    const moderator = await findFrame(mosh.pages.moderator);
    await expect(moderator.getByRole("button", { name: /\(you\)$/ }).first()).toContainText("Moderator");
    await expect(moderator.getByRole("button", { name: "Manage", exact: true })).toHaveCount(1);

    const member = await findFrame(mosh.pages.member);
    await expect(member.getByRole("button", { name: "Manage", exact: true })).toHaveCount(0);
    const guest = await openChannel(mosh.pages.guest, "guest");
    await expect(guest.getByRole("button", { name: "Manage", exact: true })).toHaveCount(0);
  });
});
