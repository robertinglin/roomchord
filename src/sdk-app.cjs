// roomkit-chord/src/sdk-app.cjs
//
// Chat primary backend authored through the declarative schema builder.
// This is the source of truth; running this file emits the full RoomKit app
// bundle at the package root. Nothing here is a reducer function: fx/guard/ref
// produce the same declarative effect/guard
// descriptors that model/effects.cjs interprets, so no app code runs on a node.

const fs = require("node:fs");
const path = require("node:path");
const {
  p, op, q, defineModel, defineApp
} = require("roomkit-sdk");

const packageRoot = path.join(__dirname, "..");
const frontendCommand = path.join(packageRoot, "shared", "frontendCommand.cjs");

/* ----- model: roles seed roleDefinitions; state shape drives collections ----- */

const chat = defineModel({
  roles: {
    guest: { name: "Guest", description: "Can view public room activity", color: "#6b7280", rank: 0, system: true },
    member: { name: "Member", description: "Can send messages and join voice channels", color: "#22c55e", rank: 1, system: true },
    moderator: { name: "Moderator", description: "Can manage channels, messages, and voice channels", color: "#38bdf8", rank: 2, system: true },
    admin: { name: "Admin", description: "Can create channels and manage roles", color: "#a78bfa", rank: 3, system: true },
    owner: { name: "Owner", description: "Full room ownership", color: "#f59e0b", rank: 4, system: true }
  },
  state: {
    initial: {
      channels: [{
        id: "general",
        name: "general",
        topic: "Room coordination",
        group: "General",
        createdAt: 0,
        createdBy: "system",
        archivedAt: null
      }],
      messages: {},
      memberRoles: {}
      // activity: [] and roleDefinitions are seeded by the builder from `roles`.
    }
  }
});

const { channels, messages, roleDefinitions, memberRoles } = chat.collections;

/* ----- operations (faithful to the existing model.json) ----- */

const operations = {
  "channel.create": op(
    { authorize: { roles: ["admin"] }, payload: { name: p.string({ max: 80 }), topic: p.string({ max: 240 }).nullable().optional(), group: p.string({ max: 80 }).nullable().optional() } },
    ({ ref, fx }) => ({
      effects: [fx.create(channels, {
        id: ref.newId("channel"),
        fields: { name: ref.payload("name"), topic: ref.payload("topic"), group: ref.payload("group"), createdAt: ref.now(), createdBy: ref.actor("memberId"), archivedAt: null },
        activity: "created channel"
      })]
    })
  ),

  "channel.rename": op(
    { authorize: { roles: ["moderator"] }, payload: { channelId: p.string({ max: 200 }), name: p.string({ max: 80 }).nullable().optional(), topic: p.string({ max: 240 }).nullable().optional(), group: p.string({ max: 80 }).nullable().optional() } },
    ({ ref, fx }) => ({
      effects: [fx.update(channels, { id: ref.payload("channelId"), set: { name: ref.payload("name"), topic: ref.payload("topic"), group: ref.payload("group"), updatedAt: ref.now() }, activity: "updated record" })]
    })
  ),

  "channel.archive": op(
    { authorize: { roles: ["moderator"] }, payload: { channelId: p.string({ max: 200 }) } },
    ({ ref, fx }) => ({
      effects: [fx.mark(channels, { id: ref.payload("channelId"), set: { archivedAt: ref.now() }, activity: "marked record" })]
    })
  ),

  "message.send": op(
    { authorize: { roles: ["member"] }, payload: { channelId: p.string({ max: 200 }), body: p.string({ max: 4000 }), embeds: p.array().optional() } },
    ({ ref, fx }) => ({
      effects: [fx.create(messages, {
        id: ref.newId("message"),
        fields: { channelId: ref.payload("channelId"), body: ref.payload("body"), authorId: ref.actor("memberId"), createdAt: ref.now(), editedAt: null, deletedAt: null, pinnedAt: null, reactions: {}, embeds: ref.payload("embeds") },
        activity: "created message"
      })]
    })
  ),

  "message.reply": op(
    { authorize: { roles: ["member"] }, payload: { channelId: p.string({ max: 200 }), replyToId: p.string({ max: 200 }), body: p.string({ max: 4000 }) } },
    ({ ref, fx }) => ({
      effects: [fx.create(messages, {
        id: ref.newId("message"),
        fields: { channelId: ref.payload("channelId"), replyToId: ref.payload("replyToId"), body: ref.payload("body"), authorId: ref.actor("memberId"), createdAt: ref.now(), reactions: {} },
        activity: "created message"
      })]
    })
  ),

  "message.edit": op(
    { authorize: { roles: ["member"] }, payload: { messageId: p.string({ max: 200 }), body: p.string({ max: 4000 }), embeds: p.array().optional() } },
    ({ ref, fx, guard }) => ({
      guards: [
        guard.ownerOrRole(messages, { id: ref.payload("messageId"), ownerField: "authorId", roles: [], message: "Only message authors can edit messages." }),
        guard.flagClear(messages, { id: ref.payload("messageId"), flag: "deletedAt", message: "Deleted messages cannot be edited." })
      ],
      effects: [fx.update(messages, { id: ref.payload("messageId"), set: { body: ref.payload("body"), editedAt: ref.now(), embeds: ref.payload("embeds") }, activity: "updated record" })]
    })
  ),

  "message.react": op(
    { authorize: { roles: ["member"] }, payload: { messageId: p.string({ max: 200 }), emoji: p.string({ max: 64 }) } },
    ({ ref, fx }) => ({ effects: [fx.toggleReaction(messages, { id: ref.payload("messageId"), emoji: ref.payload("emoji") })] })
  ),

  "message.pin": op(
    { authorize: { roles: ["moderator"] }, payload: { messageId: p.string({ max: 200 }) } },
    ({ ref, fx }) => ({ effects: [fx.mark(messages, { id: ref.payload("messageId"), set: { pinnedAt: ref.now(), pinnedBy: ref.actor("memberId") }, activity: "marked record" })] })
  ),

  "message.unpin": op(
    { authorize: { roles: ["moderator"] }, payload: { messageId: p.string({ max: 200 }) } },
    ({ ref, fx }) => ({ effects: [fx.mark(messages, { id: ref.payload("messageId"), set: { pinnedAt: null, pinnedBy: null }, activity: "marked record" })] })
  ),

  "message.delete": op(
    { authorize: { roles: ["member"] }, payload: { messageId: p.string({ max: 200 }) } },
    ({ ref, fx, guard }) => ({
      guards: [guard.ownerOrRole(messages, { id: ref.payload("messageId"), ownerField: "authorId", roles: ["moderator"], message: "Only message authors or moderators can delete messages." })],
      effects: [fx.mark(messages, { id: ref.payload("messageId"), set: { body: "", embeds: [], reactions: {}, pinnedAt: null, pinnedBy: null, deletedAt: ref.now(), deletedBy: ref.actor("memberId") }, activity: "marked record" })]
    })
  ),

  "role.create": op(
    { authorize: { roles: ["admin"] }, payload: { roleId: p.string({ max: 80 }), name: p.string({ max: 80 }), description: p.string({ max: 240 }).nullable().optional(), color: p.string({ max: 40 }).nullable().optional() } },
    ({ ref, fx }) => ({
      effects: [fx.create(roleDefinitions, {
        id: ref.payload("roleId"),
        fields: { name: ref.payload("name"), description: ref.payload("description"), color: ref.payload("color"), rank: 1, systemRole: false, createdBy: ref.actor("memberId"), createdAt: ref.now(), archivedAt: null },
        activity: "created role"
      })]
    })
  ),

  "role.update": op(
    { authorize: { roles: ["admin"] }, payload: { roleId: p.string({ max: 80 }), name: p.string({ max: 80 }).nullable().optional(), description: p.string({ max: 240 }).nullable().optional(), color: p.string({ max: 40 }).nullable().optional() } },
    ({ ref, fx }) => ({
      effects: [fx.update(roleDefinitions, { id: ref.payload("roleId"), recordLabel: "Role", set: { name: ref.payload("name"), description: ref.payload("description"), color: ref.payload("color"), updatedAt: ref.now(), updatedBy: ref.actor("memberId") }, activity: "updated role" })]
    })
  ),

  "role.archive": op(
    { authorize: { roles: ["admin"] }, payload: { roleId: p.string({ max: 80 }) } },
    ({ ref, fx }) => ({ effects: [fx.mark(roleDefinitions, { id: ref.payload("roleId"), recordLabel: "Role", set: { archivedAt: ref.now(), archivedBy: ref.actor("memberId") }, activity: "archived role" })] })
  ),

  "member.role.assign": op(
    { authorize: { roles: ["admin"] }, payload: { memberId: p.string({ max: 120 }), roleId: p.string({ max: 80 }).nullable().optional(), roleIds: p.array(p.string({ max: 80 })).optional(), displayName: p.string({ max: 120 }).nullable().optional() } },
    ({ ref, fx }) => ({
      effects: [fx.create(memberRoles, {
        id: ref.payload("memberId"),
        fields: { memberId: ref.payload("memberId"), roleId: ref.payload("roleId"), roleIds: ref.payload("roleIds"), displayName: ref.payload("displayName"), assignedBy: ref.actor("memberId"), assignedAt: ref.now() },
        activity: "assigned role"
      })]
    })
  )
};

/* ----- compose with shared plugins + views + routes ----- */

const app = defineApp({
  id: "com.roomkit.chord",
  name: "Chord",
  version: "1.0.0",
  pluginId: "com.roomkit.chord.plugin",
  slug: "roomkit-chord",
  packageName: "roomkit-chord",
  packageRoot,
  exportPrefix: "chord",
  constantPrefix: "CHORD",
  frontend: {
    port: 42732,
    devEntry: "src/index.tsx",
    builtEntry: "roomkit-chord.js",
    dev: {
      command: process.execPath,
      args: [frontendCommand, "dev", packageRoot, "--", "--host", "127.0.0.1", "--port", "${bundlePort}", "--strictPort"]
    },
    build: { command: process.execPath, args: [frontendCommand, "build", packageRoot] }
  },
  roomkit: {
    bridgeGlobalName: "ROOMKIT_CHORD_HOST",
    frontendProjection: "chat"
  },
  example: {
    id: "roomkit-chord",
    title: "Chord RoomKit example"
  },
  model: chat.withOperations(operations),
  actions: {
    directMessageSend: { plugin: "core", type: "dm.message", requiredRole: "member" }
  },
  plugins: [
    "comments",
    "presence",
    {
      key: "mediaRooms",
      config: {
        defaultRooms: [{
          id: "general_voice",
          name: "General",
          group: "General",
          allowsVideo: true,
          scopeType: "channel",
          scopeId: "general"
        }]
      }
    },
    "screenShare",
    "embeds",
    "reactions"
  ],
  views: {
    channelSummary: q.collection(channels),
    roomDirectory: { plugin: "mediaRooms", query: "roomDirectory" },
    onlineMembers: { plugin: "presence", query: "onlineMembers" }
  },
  routes: [
    { path: "/", component: "ChatRoomPage", requires: ["com.roomkit.chord.plugin"] },
    { path: "/dms", component: "DirectMessagesPage", requires: ["com.roomkit.chord.plugin"] },
    { path: "/rooms", component: "MediaRoomsPage", requires: ["com.roomkit.examples.plugins.media-rooms", "com.roomkit.examples.plugins.screen-share"] }
  ]
});

module.exports = app;

if (require.main === module) {
  const out = app.emitRoomKitBundle({ outDir: packageRoot });
  const artifacts = app.emit({ outDir: path.join(packageRoot, "src", "chat") });
  fs.copyFileSync(artifacts.typesPath, path.join(packageRoot, "src", "types.d.ts"));
  fs.rmSync(artifacts.typesPath, { force: true });
  console.log("emitted:", out.bundlePath);
}
