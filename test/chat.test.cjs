const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  createLiveExampleBackend,
  currentAppPackHash,
  operationFromDraft
} = require("../shared/liveBackend.cjs");
const sdkApp = require("../mosh.cjs");
const app = sdkApp.toMatterhornExports();

function primaryAction(type) {
  return app.appPack.composition.actions.find((action) => (action.plugin === "primary" || action.plugin === "$primary") && (!type || action.type === type));
}

function primaryOperation(type) {
  return app.compositionSchema.primaryPlugin.model.operations[type];
}

async function testingApi() {
  return import("matterhorn-sdk/testing");
}

function assertCleanChordTypes(types) {
  assert.equal(types.includes("PluginState"), false);
  assert.match(types, /export type ScopedRole = "none" \| "viewer" \| "editor" \| "moderator" \| "admin" \| "owner";/);
  assert.match(types, /export interface CoreAccessState/);
  assert.doesNotMatch(types, /ActionHelpers|ConnectionStatus|export interface Client|Chord\.DispatchResult/);
  assert.doesNotMatch(types, /dispatch<K extends ActionName>|subscribeDMs/);
  assert.match(types, /export type ChannelId = string & \{ readonly __brand: "ChannelId" \};/);
  assert.match(types, /export type MessageId = string & \{ readonly __brand: "MessageId" \};/);
  assert.match(types, /export type ScopeType = "channel" \| \(string & \{\}\);/);
  assert.match(types, /commentThreads: Record<ThreadId, CommentThread>;/);
  assert.match(types, /comments: Record<CommentId, Comment>;/);
  assert.match(types, /Requires `member` role\./);
  assert.match(types, /body: string, <= 4000/);
  assert.match(types, /omit to leave unchanged; null to clear/);
}

test("Chat exports schema-only Matterhorn app metadata", () => {
  assert.equal(app.appPack.kind, "matterhorn.app-pack");
  assert.equal(app.appPack.id, app.MOSH_APP_ID);
  assert.equal(app.hostPack.appPackId, app.appPack.id);
  assert.equal(app.playerPack.supports[0].appPackId, app.appPack.id);
  assert.equal(app.hostPlugin.id, app.MOSH_PLUGIN_ID);
  assert.equal(app.hostPlugin.schemaDefined, true);
  assert.equal(app.hostPlugin.schemaSource, "schema:matterhorn.primary-model");
  assert.equal(app.appPack.composition.primaryPlugin.source, undefined);
  assert.equal(typeof app.appPack.composition.primaryPlugin.model, "object");
  assert.equal(app.matterhornApp.matterhorn.frontendProjection, "chat");
  assert.equal(app.matterhornApp.frontend.backgroundColor, "oklch(0.205 0.008 260)");
  assert.deepEqual(app.matterhornApp.frontend.icon, { path: "icon.svg" });
});

test("Chat generated TypeScript contract stays flattened across SDK export helpers", () => {
  const checkedInTypes = fs.readFileSync(path.join(__dirname, "../types.d.ts"), "utf8");
  const exports = sdkApp.toMatterhornExports();
  const bundle = sdkApp.toMatterhornBundle();

  for (const types of [
    checkedInTypes,
    app.generatedTypes,
    app.schemaArtifacts.types,
    app.matterhornApp.types.declaration,
    app.matterhornApp.artifacts.types,
    sdkApp.toTypes(),
    exports.generatedTypes,
    exports.matterhornApp.types.declaration,
    exports.matterhornApp.artifacts.types
  ]) {
    assertCleanChordTypes(types);
  }

  assert.equal("types" in bundle, false);
  assert.equal("types" in bundle.artifacts, false);
  assert.equal(sdkApp.toJSON().kind, "matterhorn.app-composition.schema");
  assert.deepEqual(Object.keys(sdkApp.toJSONFragments()).sort(), ["actions", "composition", "model"]);
});

test("Chat emit writes flattened TypeScript contract artifacts", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "matterhorn-mosh-emit-"));
  const bundleOut = sdkApp.emit({ outDir });
  const emittedBundle = JSON.parse(fs.readFileSync(bundleOut.bundlePath, "utf8"));

  assert.equal("types" in bundleOut.bundle, false);
  assert.equal("types" in bundleOut.bundle.artifacts, false);
  assert.equal("types" in emittedBundle, false);
  assert.equal("types" in emittedBundle.artifacts, false);

  const emitOut = sdkApp.emit({ outDir: path.join(outDir, "chat"), typesFile: "./types.d.ts" });
  assertCleanChordTypes(fs.readFileSync(emitOut.typesPath, "utf8"));
});

test("Chat app behavior runs through Matterhorn testing helpers", async () => {
  const { createTestRoom, expectOperation, replayOperations, testActor } = await testingApi();
  let time = 1000;
  const room = createTestRoom({ toJSON: () => app.compositionSchema }, {
    now: () => time += 1,
    operationId: (operation) => `op_${operation.seq}_${operation.action}`
  });
  const admin = room.as(testActor("admin", { role: "admin", displayName: "Admin" }));
  const member = room.as(testActor("mina", { role: "member", displayName: "Mina" }));

  await admin.actions.channelCreate({ name: "launch", topic: "Planning", group: "Team" });
  await member.actions.messageSend({ channelId: "general", body: "Ready", embeds: [] });

  const channel = room.state.channels.find((item) => item.id === "channel_op_1_channelCreate");
  assert.equal(channel.name, "launch");
  assert.equal(channel.createdBy, "admin");
  assert.equal(room.state.messages.message_op_2_messageSend.body, "Ready");
  assert.equal(room.state.messages.message_op_2_messageSend.authorId, "mina");
  assert.equal(expectOperation(room.operations, "messageSend").actor.memberId, "mina");

  const replay = createTestRoom({ toJSON: () => app.compositionSchema }, {
    operationId: (operation) => `op_${operation.seq}_${operation.action}`
  });
  await replayOperations(replay, room.operations);
  assert.equal(replay.state.messages.message_op_2_messageSend.body, "Ready");
  await assert.rejects(() => room.dispatch("messageSend", { channelId: "general" }), /body is required/);
});

test("Chat schema declares moderation, author-only edits, and moderator deletes", () => {
  for (const type of ["member.moderate", "member.ban", "member.unban", "invite.disable", "invite.remove", "join.approve", "join.deny"]) {
    assert.ok(primaryAction(type), `${type} action required`);
    assert.deepEqual(primaryOperation(type).authorize.roles, ["admin"]);
  }

  assert.deepEqual(
    ["roleCreate", "memberRoleAssign", "memberRoleUnassign", "scopeRoleSet"].map((name) => app.appPack.composition.actions.find((action) => action.name === name)?.type),
    ["access.role.define", "access.role.assign", "access.role.unassign", "scope.role.set"]
  );

  assert.deepEqual(primaryOperation("message.edit").guards, [
    {
      kind: "recordOwnerOrRole",
      collection: "messages",
      storage: "map",
      partition: "messages",
      idField: "messageId",
      ownerField: "authorId",
      roles: [],
      message: "Only message authors can edit messages."
    },
    {
      kind: "recordFlagClear",
      collection: "messages",
      storage: "map",
      partition: "messages",
      idField: "messageId",
      flag: "deletedAt",
      message: "Deleted messages cannot be edited."
    }
  ]);
  assert.deepEqual(primaryOperation("message.delete").guards[0].roles, ["moderator"]);
  assert.deepEqual(primaryOperation("message.pin").authorize.roles, ["moderator"]);
  assert.deepEqual(primaryOperation("message.unpin").authorize.roles, ["moderator"]);
});

test("Chat schema starts with default text channel and configured voice room", () => {
  assert.deepEqual(app.compositionSchema.primaryPlugin.model.state.initial.channels[0], {
    id: "general",
    name: "general",
    topic: "Room coordination",
    group: "General",
    createdAt: 0,
    createdBy: "system",
    archivedAt: null
  });

  const mediaRooms = app.compositionSchema.plugins.find((plugin) => plugin.key === "mediaRooms");
  assert.deepEqual(mediaRooms.config.defaultRooms[0], {
    id: "general_voice",
    name: "General",
    group: "General",
    allowsVideo: true,
    scopeType: "channel",
    scopeId: "general"
  });
});

test("Chat live backend replays persisted operations and refreshes stale app hashes", async () => {
  const roomId = "room_schema_upgrade";
  const operation = operationFromDraft(app, roomId, {
    id: "persisted_upgrade_message",
    type: "message.send",
    payload: { channelId: "general", body: "Persisted message", embeds: [] }
  }, 1, 1000);
  operation.appPackHash = "sha256-old-chat-schema";
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "matterhorn-mosh-schema-"));
  const dataFile = path.join(dataDir, "chat.json");
  fs.writeFileSync(dataFile, JSON.stringify({ version: 1, operations: [operation] }, null, 2));

  const backend = await createLiveExampleBackend({
    appRoot: path.join(__dirname, "."),
    roomId,
    dataFile,
    seedDemo: false
  });
  const state = await backend.getState();
  const saved = JSON.parse(fs.readFileSync(dataFile, "utf8"));

  assert.equal(state.messages.message_persisted_upgrade_message.body, "Persisted message");
  assert.equal(saved.operations.every((item) => item.appPackHash === currentAppPackHash(app)), true);
});

test("Chat generated player actions dispatch composition descriptors", async () => {
  const action = primaryAction("channel.create");
  assert.ok(action, "channel.create action required");
  const calls = [];
  await app.playerPlugin.actions[action.name]({ dispatch: (draft) => calls.push(draft) }, { name: "ops" });
  assert.deepEqual(calls[0], { schemaAction: action.name, pluginId: app.hostPlugin.id, type: action.type, payload: { name: "ops" } });
});

test("Chat SDK client uses app scope for role gates and dispatch errors", async () => {
  const { Matterhorn, MatterhornValidationError, installMatterhornAppScope, resetMatterhornForTests } = await import("matterhorn-sdk/client");
  const state = {
    channels: [],
    messages: {
      late: { id: "late", channelId: "general", body: "Later", authorId: "ada", createdAt: 2, deletedAt: null, editedAt: null, embeds: [], pinnedAt: null, pinnedBy: null, reactions: {}, replyToId: null },
      early: { id: "early", channelId: "general", body: "Earlier", authorId: "ada", createdAt: 1, deletedAt: null, editedAt: null, embeds: [], pinnedAt: null, pinnedBy: null, reactions: {}, replyToId: null }
    },
    embeds: {
      embed_1: { id: "embed_1", scopeType: "channel", scopeId: "general", url: "https://example.test", note: null, addedAt: 3, removedAt: null }
    }
  };
  resetMatterhornForTests();
  installMatterhornAppScope({
    appId: "gg.matterhorn.mosh",
    appName: "Mosh",
    metadata: { composition: app.compositionSchema },
    host: {
      mode: "injected",
      appMetadata: { composition: app.compositionSchema },
      getState: async () => state,
      sendOperation: () => ({ ok: true, state })
    },
    initialState: state,
    actor: { memberId: "ada", deviceId: "dev_ada", role: "member", displayName: "Ada" },
    envelope: { room: { id: "chat" }, actor: { memberId: "ada", deviceId: "dev_ada", role: "member", displayName: "Ada" } }
  });
  const room = Matterhorn();

  assert.equal(room.can.messageSend().status, "allowed");
  assert.equal(room.can.channelCreate().status, "denied");
  await assert.rejects(
    () => room.dispatch("messageSend", { channelId: "general", body: "x".repeat(4001) }),
    (error) => error instanceof MatterhornValidationError && /body/.test(error.message)
  );
  resetMatterhornForTests();
});

test("Chat defineApp export does not depend on a demo sidecar", async () => {
  assert.equal(app.demoDefinition, undefined);
  assert.deepEqual(app.createDemoOperations("schema_demo_chat"), []);
  await assert.rejects(() => app.createDemo({ roomId: "schema_demo_chat" }), /does not define a demo/);
});

test("Chat schema routes direct messages through a core host action", () => {
  assert.equal(primaryAction("dm.open"), undefined);
  assert.equal(primaryAction("dm.message"), undefined);
  assert.equal(primaryAction("dm.react"), undefined);
  assert.deepEqual(
    app.appPack.composition.actions.find((action) => action.name === "directMessageSend"),
    { name: "directMessageSend", plugin: "core", type: "dm.message", requiredRole: "member" }
  );

  const model = app.appPack.composition.primaryPlugin.model;
  assert.equal(model.state.initial.directThreads, undefined);
  assert.equal(model.state.initial.directMessages, undefined);
  assert.equal(model.operations["dm.open"], undefined);
  assert.equal(model.operations["dm.message"], undefined);
  assert.equal(model.operations["dm.react"], undefined);
});
