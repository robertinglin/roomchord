const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const permissionsApi = require("matterhorn-sdk/permissions");
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

async function runtimeTestingApi() {
  return import("matterhorn-sdk/testing/runtime");
}

function assertCleanMoshTypes(types) {
  assert.equal(types.includes("PluginState"), false);
  assert.match(types, /export type ScopedRole = "none" \| "viewer" \| "editor" \| "moderator" \| "admin" \| "owner";/);
  assert.match(types, /export interface CoreAccessState/);
  assert.doesNotMatch(types, /ActionHelpers|ConnectionStatus|export interface Client|Mosh.DispatchResult/);
  assert.doesNotMatch(types, /dispatch<K extends ActionName>|subscribeDMs/);
  assert.match(types, /export type ChannelId = string & \{ readonly __brand: "ChannelId" \};/);
  assert.match(types, /export type MessageId = string & \{ readonly __brand: "MessageId" \};/);
  assert.match(types, /export type ScopeType = "channel" \| \(string & \{\}\);/);
  assert.match(types, /commentThreads: Record<ThreadId, CommentThread>;/);
  assert.match(types, /comments: Record<CommentId, Comment>;/);
  assert.match(types, /callRoutes: Record<string, CallRoute>;/);
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
    assertCleanMoshTypes(types);
  }

  assert.equal("types" in bundle, false);
  assert.equal("types" in bundle.artifacts, false);
  assert.equal(sdkApp.toJSON().kind, "matterhorn.app-composition.schema");
  assert.deepEqual(Object.keys(sdkApp.toJSONFragments()).sort(), ["actions", "composition", "model"]);
});

test("Chat emit writes flattened TypeScript contract artifacts", (t) => {
  const outDir = path.join(__dirname, "..");
  const suffix = `${process.pid}-${Date.now()}`;
  const bundleFile = `.matterhorn-mosh-emit-${suffix}.json`;
  const typesFile = `.matterhorn-mosh-emit-${suffix}.d.ts`;
  t.after(() => {
    fs.rmSync(path.join(outDir, bundleFile), { force: true });
    fs.rmSync(path.join(outDir, typesFile), { force: true });
  });
  const bundleOut = sdkApp.emit({ outDir, fileName: bundleFile });
  const emittedBundle = JSON.parse(fs.readFileSync(bundleOut.bundlePath, "utf8"));

  assert.equal("types" in bundleOut.bundle, false);
  assert.equal("types" in bundleOut.bundle.artifacts, false);
  assert.equal("types" in emittedBundle, false);
  assert.equal("types" in emittedBundle.artifacts, false);

  const emitOut = sdkApp.emit({ outDir, fileName: bundleFile, typesFile });
  assertCleanMoshTypes(fs.readFileSync(emitOut.typesPath, "utf8"));
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
  assert.equal(channel.requiredRole, "member");
  assert.equal(channel.scopeType, "channel");
  // The lightweight schema test room preserves `$id` expressions; the host
  // interpreter resolves this to the created channel id at runtime.
  assert.equal(channel.scopeId, "$id:channel");
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
  for (const type of ["member.note.set", "member.nickname.set", "member.ignore.set", "member.block.set"]) {
    assert.equal(primaryAction(type), undefined, `${type} should stay personal UI state`);
  }
  assert.ok(primaryAction("member.call.update"), "member.call.update action required");
  assert.deepEqual(primaryOperation("member.call.update").authorize.roles, ["member"]);
  assert.equal(app.compositionSchema.primaryPlugin.model.shapes.callRoutes.readClass, "head");
  assert.equal(app.compositionSchema.primaryPlugin.model.shapes.callRoutes.integrityClass, "signature");
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

test("Chat schema starts with role-scoped member and guest channels and voice rooms", () => {
  assert.deepEqual(app.compositionSchema.primaryPlugin.model.state.initial.channels, [
    {
      id: "general",
      name: "general",
      topic: "Room coordination",
      group: "General",
      requiredRole: "member",
      scopeType: "channel",
      scopeId: "general",
      createdAt: 0,
      createdBy: "system",
      archivedAt: null
    },
    {
      id: "guest",
      name: "guest",
      topic: "Guest lobby",
      group: "Guest",
      requiredRole: "guest",
      scopeType: "channel",
      scopeId: "guest",
      createdAt: 0,
      createdBy: "system",
      archivedAt: null
    }
  ]);

  const createFields = primaryOperation("channel.create").effects[0].fields;
  assert.equal(createFields.requiredRole, "member");
  assert.equal(createFields.scopeType, "channel");
  assert.equal(createFields.scopeId, "$id:channel");

  const mediaRooms = app.compositionSchema.plugins.find((plugin) => plugin.key === "mediaRooms");
  assert.deepEqual(mediaRooms.config.defaultRooms, [
    {
      id: "general_voice",
      name: "General",
      group: "General",
      allowsVideo: true,
      scopeType: "channel",
      scopeId: "general",
      roleAccess: { member: "editor", moderator: "editor", admin: "editor", owner: "editor" }
    },
    {
      id: "voice",
      name: "Voice",
      group: "General",
      allowsVideo: false,
      scopeType: "channel",
      scopeId: "general",
      roleAccess: { member: "editor", moderator: "editor", admin: "editor", owner: "editor" }
    },
    {
      id: "guest_voice",
      name: "Guest",
      group: "Guest",
      allowsVideo: false,
      scopeType: "channel",
      scopeId: "guest",
      roleAccess: { guest: "readonly", member: "editor", moderator: "editor", admin: "editor", owner: "editor" }
    }
  ]);
});

test("Chat guest projection exposes only the guest channel and guest-scoped room", () => {
  const channels = app.compositionSchema.primaryPlugin.model.state.initial.channels;
  const mediaRooms = app.compositionSchema.plugins.find((plugin) => plugin.key === "mediaRooms");
  const state = {
    channels,
    messages: {
      general: { id: "general", channelId: "general", body: "member message" },
      guest: { id: "guest", channelId: "guest", body: "guest message" }
    },
    directThreads: {
      dm_guest: { id: "dm_guest", userIds: ["guest-user", "member-user"], archivedAt: null }
    },
    directMessages: {
      dm_message: { id: "dm_message", threadId: "dm_guest", userIds: ["guest-user", "member-user"], body: "private message" }
    },
    rooms: Object.fromEntries(mediaRooms.config.defaultRooms.map((room) => [room.id, room]))
  };

  const guest = permissionsApi.filterStateForActor(state, { memberId: "guest-user", role: "guest" });
  assert.deepEqual(guest.channels.map((channel) => channel.id), ["guest"]);
  assert.deepEqual(Object.keys(guest.messages), ["guest"]);
  assert.deepEqual(Object.keys(guest.rooms), ["guest_voice"]);
  assert.deepEqual(Object.keys(guest.directThreads), ["dm_guest"]);
  assert.deepEqual(Object.keys(guest.directMessages), ["dm_message"]);

  const member = permissionsApi.filterStateForActor(state, { memberId: "member-user", role: "member" });
  assert.deepEqual(member.channels.map((channel) => channel.id), ["general", "guest"]);
  assert.deepEqual(Object.keys(member.rooms), ["general_voice", "voice", "guest_voice"]);
});

test("Chat runtime room applies primary message operations through Matterhorn", async () => {
  const { createRuntimeTestRoom, testActor } = await runtimeTestingApi();
  let time = 2000;
  const room = await createRuntimeTestRoom(sdkApp, {
    roomId: "mosh_runtime_messages",
    now: () => time += 1
  });
  const admin = room.as(testActor("admin", { role: "admin", displayName: "Admin" }));
  const member = room.as(testActor("mina", { role: "member", displayName: "Mina" }));

  await admin.actions.channelCreate({ name: "launch", topic: "Planning", group: "Team" });
  await member.actions.messageSend({ channelId: "general", body: "Ready", embeds: [] });
  const state = await room.state();
  const operations = room.operations;
  const channel = state.channels.find((item) => item.name === "launch");
  const message = Object.values(state.messages).find((item) => item.body === "Ready");

  assert.equal(channel.topic, "Planning");
  assert.equal(channel.createdBy, "admin");
  assert.equal(channel.requiredRole, "member");
  assert.equal(channel.scopeType, "channel");
  assert.equal(channel.scopeId, channel.id);
  assert.equal(message.authorId, "mina");
  assert.equal(operations.length, 2);
  assert.equal(operations[1].schemaAction, "messageSend");
  assert.equal(operations[1].pluginId, app.hostPlugin.id);
  assert.equal(message.createdAt, operations[1].createdAt);
});

test("Chat runtime room applies shared media-room plugin operations", async () => {
  const { createRuntimeTestRoom, testActor } = await runtimeTestingApi();
  let time = 3000;
  const room = await createRuntimeTestRoom(sdkApp, {
    roomId: "mosh_runtime_media",
    now: () => time += 1
  });
  const admin = room.as(testActor("admin", { role: "admin", displayName: "Admin" }));
  const member = room.as(testActor("mina", { role: "member", displayName: "Mina" }));

  await admin.actions.mediaRoomCreate({
    name: "Standup",
    group: "Ops",
    allowsVideo: true,
    scopeType: "channel",
    scopeId: "general"
  });
  const roomState = await room.roomState();
  const mediaState = roomState.plugins["gg.matterhorn.examples.plugins.media-rooms"];
  const created = Object.values(mediaState.rooms).find((item) => item.name === "Standup");

  assert.ok(mediaState.rooms.general_voice, "default configured voice room should be installed by the real plugin");
  assert.equal(created.group, "Ops");
  assert.equal(created.createdBy, "admin");
  assert.equal(created.allowsVideo, true);
  assert.equal(created.participants && Object.keys(created.participants).length, 0);

  await member.actions.mediaRoomJoin({ roomId: created.id, media: { audio: true, video: false, screen: false } });
  const joinedState = await room.roomState();
  const joinedRoom = joinedState.plugins["gg.matterhorn.examples.plugins.media-rooms"].rooms[created.id];

  assert.equal(joinedRoom.participants.mina.memberId, "mina");
  assert.equal(joinedRoom.participants.mina.media.audio, true);
  assert.equal(joinedRoom.participants.mina.media.video, false);
});

test("Chat runtime room rejects actions using Matterhorn role checks", async () => {
  const { createRuntimeTestRoom, testActor } = await runtimeTestingApi();
  const room = await createRuntimeTestRoom(sdkApp, {
    roomId: "mosh_runtime_roles",
    now: () => 4000,
    initialRoomState: {
      access: {
        scopes: {
          "channel:guest": {
            scopeType: "channel",
            scopeId: "guest",
            role: "editor",
            canView: true,
            canEdit: true
          }
        }
      }
    }
  });
  const guest = room.as(testActor("guest", { role: "guest", displayName: "Guest" }));

  await guest.actions.messageSend({ channelId: "guest", body: "Welcome", embeds: [] });
  await assert.rejects(
    () => guest.actions.messageSend({ channelId: "general", body: "Nope", embeds: [] }),
    /Schema guard rejected|requires scoped (?:edit|editor) access|not authorized|unauthorized/i
  );
  await assert.rejects(
    () => guest.actions.directMessageSend({ userIds: ["member"], body: "Nope" }),
    /requires member|not authorized|unauthorized/i
  );
  await assert.rejects(
    () => guest.actions.mediaRoomCreate({
      name: "Private",
      allowsVideo: true,
      scopeType: "channel",
      scopeId: "guest"
    }),
    /requires moderator|not authorized|unauthorized/i
  );
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

  assert.equal(room.can("messageSend"), true);
  assert.equal(room.can("channelCreate"), false);
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

test("Chat UI removes direct-message controls and writing for actors below member", () => {
  const view = fs.readFileSync(path.join(__dirname, "../src/entities/chat/model/useChatViewData.ts"), "utf8");
  const content = fs.readFileSync(path.join(__dirname, "../src/widgets/chat-shell/ui/ChatContent.tsx"), "utf8");
  const sidebar = fs.readFileSync(path.join(__dirname, "../src/widgets/chat-shell/ui/ChatSidebar.tsx"), "utf8");

  assert.match(view, /const actorCanDirectMessage = live\.can\("directMessageSend"\)/);
  assert.match(view, /const actorCanReceiveDirectMessages = true/);
  assert.match(view, /const actorCanSendMessages = live\.can\("messageSend"\)/);
  assert.match(view, /channels\.find\(\(channel\) => channel\.id === input\.activeChannelId\)\?\.id \|\| channels\[0\]\?\.id/);
  assert.match(content, /!view\.actorCanDirectMessage \|\| !view\.currentThreadId/);
  assert.match(content, /!view\.actorCanSendMessages \|\| !view\.currentChannelId/);
  assert.match(content, /view\.actorCanDirectMessage \? actions\.openDirectThreadForMember : undefined/);
  assert.match(sidebar, /view\.actorCanReceiveDirectMessages \? \(/);
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
