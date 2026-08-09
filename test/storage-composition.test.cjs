const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Mosh declares optional Google Drive host capabilities and channel attachment linkage", () => {
  const artifact = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "gg.matterhorn.mosh.json"), "utf8"));
  const optional = artifact.appPack.capabilities.optional;
  for (const capability of [
    "driveManagement.providers.read",
    "driveManagement.connections.read",
    "driveManagement.connect",
    "driveManagement.upload",
    "driveManagement.accountLabel.read",
    "driveManagement.googleDrive.files.create",
    "driveManagement.googleDrive.files.content.read",
    "driveManagement.googleDrive.files.metadata.read",
    "driveManagement.googleDrive.files.delete",
    "driveManagement.googleDrive.permissions.write"
  ]) assert.ok(optional.includes(capability), `missing ${capability}`);
  const operation = artifact.appPack.composition.primaryPlugin.model.operations["message.send"];
  assert.ok(operation.payload.optional.attachmentIds);
  assert.equal(operation.effects[0].fields.attachmentIds, "$payload.attachmentIds");
  const reply = artifact.appPack.composition.primaryPlugin.model.operations["message.reply"];
  assert.ok(reply.payload.optional.attachmentIds);
  assert.equal(reply.effects[0].fields.attachmentIds, "$payload.attachmentIds");
  const fileActions = artifact.appPack.composition.actions
    .filter((action) => action.plugin === "files")
    .map((action) => [action.name, action.type]);
  for (const expected of [
    ["filePublishV3", "file.publish.v3"],
    ["fileRevisionPublishV3", "file.revision.publish.v3"]
  ]) assert.ok(fileActions.some((action) => action[0] === expected[0] && action[1] === expected[1]), `missing ${expected[0]}`);
  const dmActions = artifact.appPack.composition.actions
    .filter((action) => action.name.startsWith("directMessage"));
  assert.deepEqual(
    dmActions.map((action) => [action.name, action.type]),
    [
      ["directMessageSend", "dm.message"],
      ["directMessageReply", "dm.message.reply"],
      ["directMessageEdit", "dm.message.edit"],
      ["directMessageDelete", "dm.message.delete"],
      ["directMessageReact", "dm.message.react"],
      ["directMessagePin", "dm.message.pin"],
      ["directMessageUnpin", "dm.message.unpin"],
      ["directMessageForward", "dm.message.forward"]
    ]
  );
  const notifications = artifact.appPack.composition.notifications.definitions;
  for (const [name, action] of [
    ["directMessage", "directMessageSend"],
    ["directMessageReply", "directMessageReply"],
    ["directMessageForward", "directMessageForward"]
  ]) {
    assert.equal(notifications[name].on.action, action);
    assert.equal(notifications[name].scope.type, "direct.thread");
    assert.equal(notifications[name].scope.id, "$direct.threadId");
    assert.equal(notifications[name].read.scopeKey, "direct.thread:$direct.threadId");
  }
});
