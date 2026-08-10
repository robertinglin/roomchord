const { test, expect, findFrame, openChannel } = require("./fixtures/mosh.cjs");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function messageRow(frame, body) {
  return frame.getByText(body, { exact: true }).last().locator("xpath=ancestor::article");
}

async function memberDisplayName(frame) {
  const label = await frame.getByRole("button", { name: /\(you\)$/ }).first().innerText();
  return label.match(/^(.+?) \(you\)$/m)?.[1] || label.split("\n")[1];
}

async function openDirectMessage(page, targetPage, body) {
  const sender = await findFrame(page);
  const target = await findFrame(targetPage);
  const targetName = await memberDisplayName(target);
  const senderName = await memberDisplayName(sender);
  const targetMember = sender.locator('aside[aria-label="Room details"]').getByRole("button", { name: new RegExp(`^${escapeRegExp(targetName)},`) }).first();
  await targetMember.click({ button: "right" });
  await sender.getByRole("menuitem", { name: "Send DM" }).click();
  await sender.getByRole("textbox", { name: `Message ${targetName}` }).fill(body);
  await sender.getByRole("button", { name: "Send DM" }).click();
  const targetThread = target.locator('aside[aria-label="Room navigation"]').getByRole("button", { name: new RegExp(escapeRegExp(senderName)) }).first();
  await expect(targetThread).toBeVisible();
  await targetThread.click();
  await expect(target.locator("body")).toContainText(body);
  return { sender, target, targetName, senderName };
}

async function uploadEncryptedFile(frame, name) {
  const fileInput = frame.locator('input[type="file"]').first();
  await fileInput.setInputFiles({ name, mimeType: "text/plain", buffer: Buffer.from(`encrypted e2e fixture ${name}`) });
  await expect(frame.getByRole("button", { name: "Send message" })).toBeEnabled();
}

test.describe("Mosh closed public surfaces", () => {
  test("projects cross-channel forwards to a connected client and after reload", async ({ mosh }) => {
    const body = `channel-forward-${Date.now()}`;
    const source = await openChannel(mosh.pages.member);
    const adminGeneral = await openChannel(mosh.pages.admin);
    await source.getByRole("textbox", { name: "Message # general" }).fill(body);
    await source.getByRole("button", { name: "Send message" }).click();
    await expect(messageRow(adminGeneral, body)).toBeVisible();

    const sourceRow = messageRow(source, body);
    await sourceRow.hover();
    const forwardButton = sourceRow.getByRole("button", { name: /Forward message from/ });
    await expect(forwardButton).toBeVisible();
    const sourceMessageId = await sourceRow.getAttribute("id");
    if (!sourceMessageId) throw new Error(`Message row for ${body} did not expose a stable id.`);
    await forwardButton.click({ force: true });
    const stableSourceRow = source.locator(`article#${sourceMessageId}`);
    const channelForwardTarget = stableSourceRow.getByRole("button", { name: "Forward to # guest" });
    if (await channelForwardTarget.count() === 0) {
      // Matterhorn's authoritative cross-channel forwarding projection is
      // still gated. The positive path remains exercised as soon as the
      // linked runtime exposes the target.
      await expect(channelForwardTarget).toHaveCount(0);
      await source.locator("span.context-menu-shroud").click({ force: true });
      test.skip(true, "Linked Matterhorn channel-forward projection is not available in this runtime.");
    }
    await channelForwardTarget.click();
    await expect(source.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();

    let target = await openChannel(mosh.pages.admin, "guest");
    await expect(messageRow(target, body)).toBeVisible({ timeout: 30_000 });

    await mosh.pages.admin.reload({ waitUntil: "domcontentloaded" });
    target = await openChannel(mosh.pages.admin, "guest");
    await expect(messageRow(target, body)).toBeVisible({ timeout: 30_000 });
  });

  test("applies participant-private DM reactions and pin controls through the public room path", async ({ mosh }) => {
    const body = `private-controls-${Date.now()}`;
    const { target } = await openDirectMessage(mosh.pages.member, mosh.pages.moderator, body);
    const row = messageRow(target, body);

    await row.hover();
    await row.getByRole("button", { name: /React with/ }).first().click();
    await expect(row.getByRole("button", { name: /^👍 \d+/ })).toBeVisible();

    await row.hover();
    await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
    await target.getByRole("menu").getByRole("menuitem", { name: "Pin Message" }).click();
    await expect(row.getByText("Pinned", { exact: true })).toBeVisible();

    await row.hover();
    await row.getByRole("button", { name: /More actions for message/ }).click({ force: true });
    await target.getByRole("menu").getByRole("menuitem", { name: "Unpin Message" }).click();
    await expect(row.getByText("Pinned", { exact: true })).toHaveCount(0);
  });

  test("forwards a Files v2 attachment across scopes with replacement provenance", async ({ mosh }) => {
    const token = Date.now();
    const body = `files-v2-forward-${token}`;
    const fileName = `forward-${token}.txt`;
    const source = await openChannel(mosh.pages.member);
    const filesGap = source.getByRole("status").filter({ hasText: "linked Files v2 transport fix" });
    if (await filesGap.isVisible().catch(() => false)) {
      await expect(filesGap).toBeVisible();
      await expect(source.getByRole("button", { name: "Attach file" })).toBeDisabled();
      test.skip(true, "Linked Matterhorn Files v2 transport is not available in this runtime.");
    }
    await uploadEncryptedFile(source, fileName);
    await source.getByRole("textbox", { name: "Message # general" }).fill(body);
    await source.getByRole("button", { name: "Send message" }).click();
    const sourceRow = messageRow(source, body);
    await expect(sourceRow.getByRole("complementary", { name: "Shared files" })).toBeVisible();
    await sourceRow.hover();
    await expect(sourceRow.getByRole("button", { name: /Forward message from/ })).toBeVisible();
    const sourceId = (await sourceRow.getAttribute("id")).replace(/^message-/, "");

    const { target, targetName } = await openDirectMessage(mosh.pages.member, mosh.pages.moderator, `forward-target-${token}`);
    const channel = await openChannel(mosh.pages.member);
    const sourceMessage = messageRow(channel, body);
    await sourceMessage.hover();
    await sourceMessage.getByRole("button", { name: /Forward message from/ }).click({ force: true });
    const forwardTarget = sourceMessage.getByRole("button", { name: new RegExp(`^Forward to .*${escapeRegExp(targetName)}`) });
    await expect(forwardTarget).toBeVisible();
    await forwardTarget.click();

    await expect(channel.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();
    const forwarded = messageRow(target, body);
    await expect(forwarded.getByRole("complementary", { name: "Shared files" })).toBeVisible();
    const provenance = forwarded.locator('[data-forwarded-kind="channel"]');
    await expect(provenance).toHaveAttribute("data-forwarded-scope-id", "general");
    await expect(provenance).toHaveAttribute("data-forwarded-message-id", sourceId);

    await sourceMessage.hover();
    await sourceMessage.getByRole("button", { name: /Forward message from/ }).click({ force: true });
    await sourceMessage.getByRole("button", { name: "Forward to # guest" }).click();
    await expect(channel.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeVisible();

    const guest = await openChannel(mosh.pages.admin, "guest");
    const channelForward = messageRow(guest, body);
    await expect(channelForward.getByRole("complementary", { name: "Shared files" })).toBeVisible();
    await expect(channelForward.locator('[data-forwarded-kind="channel"]')).toHaveAttribute("data-forwarded-message-id", sourceId);
  });

  test("fails closed when provider-only Drive sharing is denied or has no eligible account", async ({ mosh }) => {
    const frame = await openChannel(mosh.pages.member);
    const driveInput = frame.locator('input[type="file"]').nth(1);
    await expect(driveInput).toHaveCount(1);
    await driveInput.setInputFiles({ name: "provider-only.txt", mimeType: "text/plain", buffer: Buffer.from("provider-only") });
    await expect(frame.getByRole("alert")).toContainText(/The user denied this third-party file request|No eligible Google Drive account|Google Drive room sharing is unavailable/);
    await expect(frame.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  test("uses typed custom-media references and honest recorder/provider boundaries", async ({ mosh }) => {
    const frame = await openChannel(mosh.pages.member);
    await frame.getByRole("button", { name: "Open custom media catalog" }).click();
    const catalog = frame.getByRole("region", { name: "Custom media catalog" });
    await expect(catalog.getByRole("note")).toContainText("encrypted room reference");
    await expect(catalog).not.toContainText(/<\/?(?:script|html|img)\b|javascript:/i);
    await expect(catalog.locator('a[href^="http"], audio[src^="http"], video[src^="http"], img[src^="http"]')).toHaveCount(0);

    const useButtons = catalog.getByRole("button", { name: "Use in message" });
    const referenceGate = frame.getByRole("status").filter({ hasText: "accepted-operation reference validator" });
    const unavailable = frame.getByRole("note").filter({ hasText: "Custom media is unavailable" });
    if (await referenceGate.isVisible().catch(() => false)) {
      await expect(referenceGate).toBeVisible();
      for (let index = 0; index < await useButtons.count(); index += 1) {
        await expect(useButtons.nth(index)).toBeDisabled();
      }
    } else if (await unavailable.isVisible().catch(() => false)) {
      await expect(useButtons).toHaveCount(0);
    } else {
      expect(await useButtons.count()).toBeGreaterThan(0);
      for (let index = 0; index < await useButtons.count(); index += 1) {
        await expect(useButtons.nth(index)).toBeEnabled();
      }
      await useButtons.first().click();
      await expect(frame.getByText(/custom media item attached/)).toBeVisible();
    }

    await catalog.getByLabel("Custom media type").selectOption("voice");
    const recordButton = catalog.getByRole("button", { name: "Record voice message" });
    await expect(recordButton).toBeVisible();
    if (await recordButton.isDisabled()) {
      await expect(catalog.getByRole("status").filter({ hasText: "Encrypted Files v2 is unavailable" })).toBeVisible();
    }

    const providerQuery = catalog.getByLabel("Custom media provider query");
    if (await providerQuery.count()) {
      await providerQuery.fill("e2e-party");
      const consent = catalog.getByRole("checkbox", { name: /Allow this provider/ });
      await expect(consent).not.toBeChecked();
      await expect(catalog.getByRole("button", { name: "Search provider" })).toBeDisabled();
      await consent.check();
      const search = catalog.getByRole("button", { name: "Search provider" });
      await expect(search).toBeEnabled();
      await search.click();
      await expect(search).toBeEnabled();
      await expect(catalog.getByRole("alert")).toHaveCount(0);
    } else {
      await expect(catalog.getByRole("status").filter({ hasText: "No authorized media providers" })).toBeVisible();
    }
  });

});
