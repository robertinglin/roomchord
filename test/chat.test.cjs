const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  manifestHash,
  playerSupportsApp,
  validateAppPackManifest,
  validateHostPackManifest,
  validatePlayerPackManifest,
  HostPluginRuntime,
  createMemoryOperationLog,
  createMemoryRoomStore,
  ensureOperationIdentity
} = require("roomkit-sdk");
const { createLiveExampleBackend } = require("../shared/liveBackend.cjs");
const sdkApp = require("../src/sdk-app.cjs");
const app = require("../src/index.cjs");

function primaryAction(type) {
  return app.appPack.composition.actions.find((action) => (action.plugin === "primary" || action.plugin === "$primary") && (!type || action.type === type));
}

function operation(action, overrides = {}) {
  const op = {
    clientOperationId: overrides.id || "op_1",
    roomId: overrides.roomId || "room_schema_only",
    appPackId: app.appPack.id,
    appPackHash: manifestHash(app.appPack),
    pluginId: overrides.pluginId || action.pluginId || app.hostPlugin.id,
    type: action.type,
    actor: overrides.actor || { memberId: "admin", deviceId: "dev_admin", role: "admin", displayName: "Admin" },
    seq: overrides.seq || 1,
    createdAt: overrides.createdAt || 1000,
    payload: overrides.payload || samplePayload(action.type),
    auth: { credentialId: "cred", signature: "sig" }
  };
  return ensureOperationIdentity(op, { now: op.createdAt, nodeId: op.actor?.deviceId || "dev_admin" });
}

function samplePayload(type) {
  const samples = {
    "event.update": { title: "Launch Night" },
    "guest.update": { name: "Alice", rsvp: "yes" },
    "list.create": { title: "Backlog" },
    "channel.create": { name: "general" },
    "page.create": { title: "Home", body: "Welcome" },
    "poll.create": { title: "Choose", options: ["A", "B"] },
    "category.create": { name: "Venue", limit: 1000 },
    "stage.create": { name: "Qualified" }
  };
  return samples[type] || { title: "Example", name: "Example", body: "Example", options: ["A"] };
}

async function runtime() {
  const rt = new HostPluginRuntime({
    room: { id: "room_schema_only", appPack: { id: app.appPack.id, version: app.appPack.version, hash: manifestHash(app.appPack), protocolHash: app.appPack.compatibility.appProtocolHash } },
    plugins: app.hostPlugins,
    store: createMemoryRoomStore(),
    operationLog: createMemoryOperationLog(),
    authenticateActor: async (auth, actor) => { assert.equal(auth.signature, "sig"); return actor; }
  });
  await rt.start();
  return rt;
}

function assertCleanChordTypes(types) {
  assert.equal(types.includes("ScopedRole"), false);
  assert.equal(types.includes("PluginState"), false);
  assert.match(types, /commentThreads: Record<ThreadId, CommentThread>;/);
  assert.match(types, /comments: Record<CommentId, Comment>;/);
}

test("Chat exports schema-only RoomKit manifests", () => {
  assert.equal(validateAppPackManifest(app.appPack).id, app.CHORD_APP_ID);
  assert.equal(validateHostPackManifest(app.hostPack).appPackId, app.appPack.id);
  assert.equal(validatePlayerPackManifest(app.playerPack).supports[0].appPackId, app.appPack.id);
  assert.equal(playerSupportsApp(app.playerPack, app.appPack), true);
  assert.equal(app.appPack.hostPack.integrity, manifestHash(app.hostPack));
  assert.equal(app.hostPlugin.id, app.CHORD_PLUGIN_ID);
  assert.equal(app.hostPlugin.schemaDefined, true);
  assert.equal(app.hostPlugin.schemaSource, "schema:roomkit.primary-model");
  assert.equal(app.appPack.composition.primaryPlugin.source, undefined);
  assert.equal(typeof app.appPack.composition.primaryPlugin.model, "object");
  assert.equal(app.roomkitApp.roomkit.bridgeGlobalName, "ROOMKIT_CHORD_HOST");
  assert.equal(app.roomkitApp.roomkit.frontendProjection, "chat");
  assert.equal(app.roomkitApp.frontend.backgroundColor, "oklch(0.205 0.008 260)");
  assert.deepEqual(app.roomkitApp.frontend.icon, { path: "src/chord-icon.svg" });
});

test("Chat generated TypeScript contract stays flattened across SDK export helpers", () => {
  const checkedInTypes = fs.readFileSync(path.join(__dirname, "..", "src", "types.d.ts"), "utf8");
  const exports = sdkApp.toRoomKitExports();
  const bundle = sdkApp.toRoomKitBundle();

  for (const types of [
    checkedInTypes,
    app.generatedTypes,
    app.schemaArtifacts.types,
    app.roomkitApp.types.declaration,
    app.roomkitApp.artifacts.types,
    sdkApp.toTypes(),
    exports.generatedTypes,
    exports.roomkitApp.types.declaration,
    exports.roomkitApp.artifacts.types
  ]) {
    assertCleanChordTypes(types);
  }

  assert.equal("types" in bundle, false);
  assert.equal("types" in bundle.artifacts, false);
  assert.equal(sdkApp.toJSON().kind, "roomkit.app-composition.schema");
  assert.deepEqual(Object.keys(sdkApp.toJSONFragments()).sort(), ["actions", "composition", "model"]);
});

test("Chat emit writes flattened TypeScript contract artifacts", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "roomkit-chord-emit-"));
  const bundleOut = sdkApp.emitRoomKitBundle({ outDir });
  const emittedBundle = JSON.parse(fs.readFileSync(bundleOut.bundlePath, "utf8"));

  assert.equal("types" in bundleOut.bundle, false);
  assert.equal("types" in bundleOut.bundle.artifacts, false);
  assert.equal("types" in emittedBundle, false);
  assert.equal("types" in emittedBundle.artifacts, false);

  const emitOut = sdkApp.emit({ outDir: path.join(outDir, "chat"), typesFile: "../types.d.ts" });
  assertCleanChordTypes(fs.readFileSync(emitOut.typesPath, "utf8"));
});

test("Chat primary plugin runs through trusted schema interpreter", async () => {
  const action = primaryAction("channel.create");
  assert.ok(action, "channel.create action required");
  const rt = await runtime();
  const result = await rt.handleOperation(operation(action));
  assert.equal(result.ok, true, result.reason);
  const state = await rt.getState();
  assert.equal(state.version, 1);
  assert.ok(state.plugins[app.hostPlugin.id]);
});

test("Chat schema starts with default text and voice channels", async () => {
  const rt = await runtime();
  const state = await rt.getState();
  const primary = state.plugins[app.hostPlugin.id];
  const defaultChannel = primary.channels.find((channel) => channel.id === "general");
  assert.deepEqual(defaultChannel, {
    id: "general",
    name: "general",
    topic: "Room coordination",
    group: "General",
    createdAt: 0,
    createdBy: "system",
    archivedAt: null
  });

  const defaultRoom = state.plugins["com.roomkit.examples.plugins.media-rooms"].rooms.general_voice;
  assert.equal(defaultRoom.id, "general_voice");
  assert.equal(defaultRoom.name, "General");
  assert.equal(defaultRoom.group, "General");
  assert.equal(defaultRoom.allowsVideo, true);
  assert.equal(defaultRoom.scopeType, "channel");
  assert.equal(defaultRoom.scopeId, "general");
  assert.deepEqual(defaultRoom.roleAccess, {});
  assert.deepEqual(defaultRoom.participants, {});
  assert.equal(defaultRoom.createdBy, "system");
});

test("Chat message authors can edit and delete their own messages while admins can only delete others", async () => {
  const rt = await runtime();
  const mina = { memberId: "mina", deviceId: "dev_mina", role: "member", displayName: "Mina" };
  const lee = { memberId: "lee", deviceId: "dev_lee", role: "member", displayName: "Lee" };
  const admin = { memberId: "admin", deviceId: "dev_admin", role: "admin", displayName: "Admin" };

  const send = await rt.handleOperation(operation({ type: "message.send" }, {
    id: "send_mina_message",
    seq: 1,
    createdAt: 1000,
    payload: { channelId: "general", body: "Original message" },
    actor: mina
  }));
  assert.equal(send.ok, true, send.reason);
  const messageId = "message_send_mina_message";

  const memberEdit = await rt.handleOperation(operation({ type: "message.edit" }, {
    id: "lee_edits_mina_message",
    seq: 2,
    createdAt: 1100,
    payload: { messageId, body: "Hijacked" },
    actor: lee
  }));
  assert.equal(memberEdit.ok, false);
  assert.match(memberEdit.reason, /Only message authors can edit/);

  const adminEdit = await rt.handleOperation(operation({ type: "message.edit" }, {
    id: "admin_edits_mina_message",
    seq: 3,
    createdAt: 1200,
    payload: { messageId, body: "Admin rewrite" },
    actor: admin
  }));
  assert.equal(adminEdit.ok, false);
  assert.match(adminEdit.reason, /Only message authors can edit/);

  const authorEdit = await rt.handleOperation(operation({ type: "message.edit" }, {
    id: "mina_edits_own_message",
    seq: 4,
    createdAt: 1300,
    payload: { messageId, body: "Author edit" },
    actor: mina
  }));
  assert.equal(authorEdit.ok, true, authorEdit.reason);

  const memberDelete = await rt.handleOperation(operation({ type: "message.delete" }, {
    id: "lee_deletes_mina_message",
    seq: 5,
    createdAt: 1400,
    payload: { messageId },
    actor: lee
  }));
  assert.equal(memberDelete.ok, false);
  assert.match(memberDelete.reason, /Only message authors or moderators can delete/);

  const authorDelete = await rt.handleOperation(operation({ type: "message.delete" }, {
    id: "mina_deletes_own_message",
    seq: 6,
    createdAt: 1500,
    payload: { messageId },
    actor: mina
  }));
  assert.equal(authorDelete.ok, true, authorDelete.reason);

  const sendSecond = await rt.handleOperation(operation({ type: "message.send" }, {
    id: "send_lee_message",
    seq: 7,
    createdAt: 1600,
    payload: { channelId: "general", body: "Admin removable" },
    actor: lee
  }));
  assert.equal(sendSecond.ok, true, sendSecond.reason);

  const adminDelete = await rt.handleOperation(operation({ type: "message.delete" }, {
    id: "admin_deletes_lee_message",
    seq: 8,
    createdAt: 1700,
    payload: { messageId: "message_send_lee_message" },
    actor: admin
  }));
  assert.equal(adminDelete.ok, true, adminDelete.reason);

  const state = await rt.getState();
  const messages = state.plugins[app.hostPlugin.id].messages;
  assert.equal(messages[messageId].body, "");
  assert.deepEqual(messages[messageId].embeds, []);
  assert.deepEqual(messages[messageId].reactions, {});
  assert.equal(messages[messageId].deletedBy, "mina");
  assert.equal(messages.message_send_lee_message.deletedBy, "admin");
});

test("Chat moderators can pin and unpin messages", async () => {
  const rt = await runtime();
  const mina = { memberId: "mina", deviceId: "dev_mina", role: "member", displayName: "Mina" };
  const mod = { memberId: "mod", deviceId: "dev_mod", role: "moderator", displayName: "Mod" };

  const send = await rt.handleOperation(operation({ type: "message.send" }, {
    id: "send_mina_pinnable",
    seq: 1,
    createdAt: 1000,
    payload: { channelId: "general", body: "Pin this" },
    actor: mina
  }));
  assert.equal(send.ok, true, send.reason);
  const messageId = "message_send_mina_pinnable";

  const pin = await rt.handleOperation(operation({ type: "message.pin" }, {
    id: "mod_pins_mina_message",
    seq: 2,
    createdAt: 1100,
    payload: { messageId },
    actor: mod
  }));
  assert.equal(pin.ok, true, pin.reason);

  let messages = (await rt.getState()).plugins[app.hostPlugin.id].messages;
  assert.equal(messages[messageId].pinnedAt, 1100);
  assert.equal(messages[messageId].pinnedBy, "mod");

  const unpin = await rt.handleOperation(operation({ type: "message.unpin" }, {
    id: "mod_unpins_mina_message",
    seq: 3,
    createdAt: 1200,
    payload: { messageId },
    actor: mod
  }));
  assert.equal(unpin.ok, true, unpin.reason);

  messages = (await rt.getState()).plugins[app.hostPlugin.id].messages;
  assert.equal(messages[messageId].pinnedAt, null);
  assert.equal(messages[messageId].pinnedBy, null);
});

test("Chat live backend upgrades same-app persisted operations after schema hash changes", async () => {
  const roomId = "room_schema_upgrade";
  const oldHash = "sha256-old-chat-schema";
  const action = primaryAction("message.send");
  assert.ok(action, "message.send action required");
  const operations = [operation(action, {
    id: "persisted_upgrade_message",
    roomId,
    payload: { channelId: "general", body: "Persisted message" }
  })].map((operation) => ensureOperationIdentity({
    ...operation,
    appPackHash: oldHash
  }, { now: operation.createdAt, nodeId: operation.actor?.deviceId || "dev" }));
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "roomkit-chord-schema-"));
  const dataFile = path.join(dataDir, "chat.json");
  fs.writeFileSync(dataFile, JSON.stringify({ version: 1, operations }, null, 2));

  const backend = await createLiveExampleBackend({
    appRoot: path.join(__dirname, ".."),
    roomId,
    dataFile,
    seedDemo: false
  });
  const state = await backend.getState();
  const saved = JSON.parse(fs.readFileSync(dataFile, "utf8"));

  assert.equal(Object.keys(state.messages).length > 0, true);
  assert.equal(saved.operations.every((operation) => operation.appPackHash === manifestHash(app.appPack)), true);
});

test("Chat generated player actions dispatch composition descriptors", async () => {
  const action = primaryAction("channel.create");
  assert.ok(action, "channel.create action required");
  const calls = [];
  await app.playerPlugin.actions[action.name]({ dispatch: (draft) => calls.push(draft) }, samplePayload(action.type));
  assert.deepEqual(calls[0], { schemaAction: action.name, pluginId: app.hostPlugin.id, type: action.type, payload: samplePayload(action.type) });
});

test("Chat defineApp export does not depend on a demo sidecar", async () => {
  assert.equal(app.demoDefinition, undefined);
  assert.deepEqual(app.createDemoOperations("schema_demo_chat"), []);
  await assert.rejects(() => app.createDemo({ roomId: "schema_demo_chat" }), /does not define a demo/);
});

test("Chat schema routes direct messages through a core host action", async () => {
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

  const rt = await runtime();
  const state = await rt.getState();
  assert.equal(state.plugins[app.hostPlugin.id].directThreads, undefined);
  assert.equal(state.plugins[app.hostPlugin.id].directMessages, undefined);
});

test("Chat media rooms enforce composite role tags for hidden and read-only room access", async () => {
  const rt = await runtime();
  const admin = { memberId: "admin", deviceId: "dev_admin", role: "admin", displayName: "Admin" };
  const lee = { memberId: "lee", deviceId: "dev_lee", role: "member", displayName: "Lee" };
  const sam = { memberId: "sam", deviceId: "dev_sam", role: "member", displayName: "Sam" };
  const mod = { memberId: "mod", deviceId: "dev_mod", role: "moderator", displayName: "Mod" };

  const assign = await rt.handleOperation(operation({ type: "member.role.assign" }, {
    id: "assign_lee_launch",
    payload: { memberId: "lee", roleIds: ["member", "launch"], displayName: "Lee" },
    actor: admin
  }));
  assert.equal(assign.ok, true, assign.reason);

  const create = await rt.handleOperation(operation({ type: "media.room.create" }, {
    id: "create_launch_room",
    pluginId: "com.roomkit.examples.plugins.media-rooms",
    payload: { name: "Launch Leads", group: "Launch", allowsVideo: true, roleAccess: { launch: "readonly", moderator: "editor" } },
    actor: admin
  }));
  assert.equal(create.ok, true, create.reason);
  const roomId = "media_room_create_launch_room";
  let mediaRooms = (await rt.getState()).plugins["com.roomkit.examples.plugins.media-rooms"].rooms;
  assert.equal(mediaRooms[roomId].group, "Launch");

  const leeView = await rt.publicView(lee);
  assert.equal(leeView.plugins["com.roomkit.examples.plugins.media-rooms"].rooms.some((room) => room.id === roomId), true);
  const samView = await rt.publicView(sam);
  assert.equal(samView.plugins["com.roomkit.examples.plugins.media-rooms"].rooms.some((room) => room.id === roomId), false);

  const leeJoinReadonly = await rt.handleOperation(operation({ type: "media.room.join" }, {
    id: "lee_join_readonly_launch_room",
    pluginId: "com.roomkit.examples.plugins.media-rooms",
    payload: { roomId, media: { audio: true, video: false } },
    actor: lee
  }));
  assert.equal(leeJoinReadonly.ok, false);
  assert.match(leeJoinReadonly.reason, /read-only/);

  const modJoin = await rt.handleOperation(operation({ type: "media.room.join" }, {
    id: "mod_join_launch_room",
    pluginId: "com.roomkit.examples.plugins.media-rooms",
    payload: { roomId, media: { audio: true, video: false } },
    actor: mod
  }));
  assert.equal(modJoin.ok, true, modJoin.reason);

  const update = await rt.handleOperation(operation({ type: "media.room.update" }, {
    id: "make_launch_room_editable",
    pluginId: "com.roomkit.examples.plugins.media-rooms",
    payload: { roomId, group: null, roleAccess: { launch: "editor" } },
    actor: admin
  }));
  assert.equal(update.ok, true, update.reason);
  mediaRooms = (await rt.getState()).plugins["com.roomkit.examples.plugins.media-rooms"].rooms;
  assert.equal(mediaRooms[roomId].group, null);

  const leeJoin = await rt.handleOperation(operation({ type: "media.room.join" }, {
    id: "lee_join_editable_launch_room",
    pluginId: "com.roomkit.examples.plugins.media-rooms",
    payload: { roomId, media: { audio: true, video: false } },
    actor: lee
  }));
  assert.equal(leeJoin.ok, true, leeJoin.reason);
});
