const { test, expect, message, waitForMessage, openChannel, findFrame } = require("./fixtures/mosh.cjs");

function messageRow(frame, body) {
  return frame.getByText(body, { exact: false }).last().locator("xpath=ancestor::article");
}

test.describe("Mosh messages and direct messages", () => {
  test("covers message authoring, mentions, replies, reactions, edits, deletes, pins, and forwarding", async ({ mosh }) => {
    const token = Date.now();
    const body = `rich-message-${token}`;
    await message(mosh.pages.member, `${body} **bold** @Morgan https://youtu.be/dQw4w9WgXcQ`);
    const frame = await openChannel(mosh.pages.member);
    await expect(frame.getByText(body, { exact: false })).toBeVisible();
    await expect(frame.getByRole("button", { name: "View YouTube video fullscreen" })).toBeVisible();
    await frame.getByRole("button", { name: "View YouTube video fullscreen" }).click();
    await expect(frame.getByRole("dialog", { name: "YouTube video" })).toBeVisible();
    await frame.getByRole("button", { name: "Close YouTube video fullscreen" }).click();

    let row = messageRow(frame, body);
    await row.hover();
    await row.getByRole("button", { name: /React with/ }).first().click();
    await expect(row.getByRole("button", { name: /^👍 \d+/ })).toBeVisible();

    await row.hover();
    await row.getByRole("button", { name: /Reply to message/ }).click();
    const replyComposer = frame.getByRole("textbox", { name: "Message # general" });
    await replyComposer.fill(`reply-${token}`);
    await frame.getByRole("button", { name: "Send message" }).click();
    await expect(frame.getByText(`reply-${token}`, { exact: true })).toBeVisible();

    await row.hover();
    await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
    const menu = frame.getByRole("menu");
    const edit = menu.getByRole("menuitem", { name: "Edit" });
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      const editor = row.getByRole("textbox", { name: /Edit message from/ });
      await editor.fill(`edited-${token}`);
      await frame.getByRole("button", { name: "Save", exact: true }).click();
      await expect(frame.getByText(`edited-${token}`, { exact: true })).toBeVisible();
      row = messageRow(frame, `edited-${token}`);
    }

    await row.hover();
    await row.getByRole("button", { name: /Forward message from/ }).click({ force: true });
    await row.getByRole("button", { name: "Forward to # guest" }).click();
    const guestFeed = await openChannel(mosh.pages.admin, "guest");
    await expect(guestFeed.getByText(`edited-${token}`, { exact: false })).toBeVisible();

    const adminFeed = await openChannel(mosh.pages.admin);
    const adminRow = messageRow(adminFeed, `edited-${token}`);
    await adminRow.hover();
    await adminRow.getByRole("button", { name: /More actions for message/ }).click({ force: true });
    const pinItem = adminFeed.getByRole("menu").getByRole("menuitem", { name: "Pin Message" });
    if (await pinItem.count()) {
      await pinItem.click();
      await expect(adminRow.getByText("Pinned", { exact: true })).toBeVisible();
    } else {
      await expect.soft(pinItem).toHaveCount(1, { timeout: 5_000 });
      await adminFeed.locator("span.context-menu-shroud").click({ force: true });
    }

    // Trailing deleted messages are intentionally omitted from the feed. Keep
    // a later message in the channel so the target remains as a visible
    // tombstone and the delete assertion checks the actual UI contract.
    const deleteSentinel = `delete-sentinel-${token}`;
    await message(mosh.pages.moderator, deleteSentinel);
    await waitForMessage(mosh.pages.member, deleteSentinel);

    await row.hover();
    await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
    const deleteItem = frame.getByRole("menu").getByRole("menuitem", { name: "Delete Message" });
    if (await deleteItem.count()) {
      await deleteItem.click();
      await expect(frame.getByText("Message deleted", { exact: true })).toBeVisible();
    } else {
      await expect.soft(deleteItem).toHaveCount(1, { timeout: 5_000 });
      await frame.locator("span.context-menu-shroud").click({ force: true });
    }

    await message(mosh.pages.moderator, `forward-source-${token}`);
    await waitForMessage(mosh.pages.member, `forward-source-${token}`);
  });

  test("creates, receives, reads, closes, and restores a DM", async ({ mosh }) => {
    const sender = await findFrame(mosh.pages.member);
    const target = await findFrame(mosh.pages.moderator);
    const targetSelf = await target.getByRole("button", { name: /\(you\)$/ }).first().innerText();
    const targetName = targetSelf.match(/^(.+?) \(you\)$/m)?.[1] || targetSelf.split("\n")[1];
    const senderSelf = await sender.getByRole("button", { name: /\(you\)$/ }).first().innerText();
    const senderName = senderSelf.match(/^(.+?) \(you\)$/m)?.[1] || senderSelf.split("\n")[1];

    const targetMember = sender.locator('aside[aria-label="Room details"]').getByRole("button", { name: new RegExp(`^${targetName},`) }).first();
    await targetMember.click({ button: "right" });
    await sender.getByRole("menuitem", { name: "Send DM" }).click();
    const first = `dm-first-${Date.now()}`;
    await sender.getByRole("textbox", { name: `Message ${targetName}` }).fill(first);
    await sender.getByRole("button", { name: "Send DM" }).click();
    const targetDm = target.locator('aside[aria-label="Room navigation"]').getByRole("button", { name: new RegExp(senderName) }).first();
    await expect(targetDm).toBeVisible();
    await targetDm.click();
    await expect(target.locator("body")).toContainText(first);

    const reply = `dm-reply-${Date.now()}`;
    await target.getByRole("textbox", { name: `Message ${senderName}` }).fill(reply);
    await target.getByRole("button", { name: "Send DM" }).click();
    const dm = sender.locator('aside[aria-label="Room navigation"]').getByRole("button", { name: new RegExp(`${targetName}`) }).first();
    await dm.click();
    await expect(sender.locator("body")).toContainText(reply);
    await expect(dm).not.toContainText("unread");
    await expect(sender.locator("body")).toContainText(first);

    await sender.getByRole("button", { name: `Close ${targetName} DM` }).click();
    const navigation = sender.locator('aside[aria-label="Room navigation"]');
    await expect(navigation.getByRole("button", { name: new RegExp(`^${targetName}`) })).toHaveCount(0);
    await targetMember.click({ button: "right" });
    await sender.getByRole("menuitem", { name: "Send DM" }).click();
    await expect(sender.getByRole("textbox", { name: `Message ${targetName}` })).toBeVisible();
  });

  test("opens, accepts, and ends a direct call without ringing again", async ({ mosh }) => {
    const caller = await findFrame(mosh.pages.member);
    const callee = await findFrame(mosh.pages.admin);
    const calleeNameLabel = await callee.getByRole("button", { name: /\(you\)$/ }).first().innerText();
    const calleeName = calleeNameLabel.match(/^(.+?) \(you\)$/m)?.[1] || calleeNameLabel.split("\n")[1];

    const calleeRail = caller.locator('aside[aria-label="Room details"]').getByRole("button", { name: new RegExp(`^${calleeName},`) }).first();
    await calleeRail.click({ button: "right" });
    await caller.getByRole("menuitem", { name: "Start a Call" }).click();

    const callerThread = caller.locator('aside[aria-label="Room navigation"]').getByRole("button", { name: new RegExp(`^${calleeName}`) }).first();
    await expect(callerThread).toContainText("Calling");

    const callDock = callee.locator('aside[aria-label="Direct call"]');
    await expect(callDock).toContainText("Incoming call");
    await callDock.getByRole("button", { name: /^Accept/ }).first().click();
    await expect(callDock).toHaveCount(0);
    await expect(callerThread).toContainText("In call");

    await caller.getByRole("region", { name: "Voice room controls" }).getByRole("button", { name: "Leave voice room" }).click();
    await expect(caller.getByRole("region", { name: "Voice room controls" })).toHaveCount(0);
    await expect(callee.getByRole("region", { name: "Voice room controls" })).toHaveCount(0);
    await expect(callDock).toHaveCount(0);

    // Invite delivery retries previously survived the call and re-rang the
    // callee at the 2s/5s retry boundaries.
    await callee.waitForTimeout(6_000);
    await expect(callDock).toHaveCount(0);
  });
});
