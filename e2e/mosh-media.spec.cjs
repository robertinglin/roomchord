const { test, expect, findFrame, openChannel } = require("./fixtures/mosh.cjs");

async function createVoiceRoom(page) {
  const frame = await findFrame(page);
  await frame.getByRole("button", { name: "Manage", exact: true }).click();
  await expect(frame.getByRole("dialog", { name: "Manage" })).toBeVisible();
  await frame.getByRole("button", { name: /^Voice channels/ }).click();
  const roomName = `e2e-media-${Date.now()}`;
  await frame.getByRole("button", { name: "New voice channel" }).click();
  const dialog = frame.getByRole("dialog", { name: "Create voice channel" });
  await dialog.getByRole("textbox", { name: "Voice channel name" }).fill(roomName);
  await dialog.getByRole("button", { name: "Create voice channel" }).click();
  await expect(frame.getByRole("button", { name: new RegExp(`^Join ${roomName}$`) })).toBeVisible();
  await frame.getByRole("button", { name: "Close management" }).click();
  return roomName;
}

async function currentMemberName(frame) {
  const label = await frame.getByRole("button", { name: /\(you\)$/ }).first().innerText();
  return label.match(/^(.+?) \(you\)$/m)?.[1] || label.split("\n")[1];
}

test.describe("Mosh voice, camera, screen share, and calls", () => {
  test("joins a voice room, synchronizes participants, and toggles media", async ({ mosh }) => {
    const roomName = await createVoiceRoom(mosh.pages.admin);
    const admin = await findFrame(mosh.pages.admin);
    const moderator = await findFrame(mosh.pages.moderator);
    const member = await findFrame(mosh.pages.member);
    const moderatorName = await currentMemberName(moderator);
    const memberName = await currentMemberName(member);
    const room = admin.getByRole("button", { name: new RegExp(`^Join ${roomName}$`) }).first();
    await room.click();
    await expect(admin.getByRole("region", { name: "Voice controls" })).toBeVisible();

    await moderator.getByRole("button", { name: new RegExp(`^Join ${roomName}$`) }).first().click();
    await member.getByRole("button", { name: new RegExp(`^Join ${roomName}$`) }).first().click();
    await expect(admin.getByRole("article", { name: new RegExp(`${moderatorName} participant`) })).toBeVisible();
    await expect(admin.getByRole("article", { name: new RegExp(`${memberName} participant`) })).toBeVisible();

    const adminRoom = admin.getByRole("region", { name: new RegExp(roomName) });
    const moderatorRoom = moderator.getByRole("region", { name: new RegExp(roomName) });
    await adminRoom.getByRole("button", { name: "Turn camera on" }).click();
    await expect(adminRoom.getByRole("button", { name: "Turn camera off" })).toBeVisible();
    await expect(adminRoom.getByRole("button", { name: "Share screen" })).toBeVisible();
    await adminRoom.getByRole("button", { name: "Share screen" }).click();
    await expect(adminRoom.getByRole("button", { name: "Stop screen share" })).toBeVisible();
    await moderatorRoom.getByRole("button", { name: "Turn camera on" }).click();
    await expect(admin.getByRole("article", { name: new RegExp(`${moderatorName} participant`) })).toContainText(moderatorName);
  });

  test("persists voice preferences and keeps voice active across text navigation", async ({ mosh }) => {
    const roomName = await createVoiceRoom(mosh.pages.admin);
    const frame = await findFrame(mosh.pages.member);
    const room = frame.getByRole("button", { name: new RegExp(`^Join ${roomName}$`) }).first();
    await room.click();
    let reconnectKey;
    await expect.poll(async () => {
      reconnectKey = await frame.evaluate(() =>
        Object.keys(window.localStorage).find((key) => key.startsWith("matterhorn:mosh:voice-reconnect:"))
      );
      return Boolean(reconnectKey);
    }).toBe(true);
    const reconnectRecord = await frame.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), reconnectKey);
    expect(reconnectRecord.roomId).toBeTruthy();
    expect(Date.now() - reconnectRecord.joinedAt).toBeLessThan(30_000);
    await frame.getByRole("button", { name: "Mute mic" }).click();
    await frame.getByRole("button", { name: "Open voice settings" }).click();
    const audioSettings = frame.getByRole("dialog", { name: "Manage" });
    await expect(audioSettings).toBeVisible();
    await expect(audioSettings.getByRole("heading", { name: "Voice & audio" })).toBeVisible();
    const dynamicGain = audioSettings.getByRole("checkbox", { name: "Dynamic gain control" });
    await dynamicGain.evaluate((element) => element.click());
    await expect(dynamicGain).toBeChecked();
    await frame.getByRole("button", { name: "Close management" }).click();
    await frame.getByRole("button", { name: "#general", exact: true }).click();
    await expect(frame.locator('footer[aria-label="User controls"]')).toBeVisible();
    await mosh.pages.member.reload({ waitUntil: "domcontentloaded" });
    const reloaded = await openChannel(mosh.pages.member);
    await expect.poll(() => reloaded.evaluate(() => Object.keys(window.localStorage))).toContain(reconnectKey);
    await expect(reloaded.getByRole("button", { name: "#general", exact: true })).toBeVisible();
    await expect(reloaded.locator('footer[aria-label="User controls"]')).toBeVisible();
    const reconnect = reloaded.getByRole("region", { name: "Voice reconnect prompt" });
    await expect(reconnect).toBeVisible();
    await reconnect.getByRole("button", { name: "Reconnect" }).click();
    await expect(reloaded.getByRole("button", { name: "Unmute mic" })).toBeVisible();
  });
});
