// matterhorn-mosh/src/sdk-app.cjs
//
// Chat primary backend authored through the declarative schema builder.
// This is the source of truth; running this file emits the full Matterhorn app
// bundle at the package root. Nothing here is a reducer function: fx/guard/ref
// produce the same declarative effect/guard
// descriptors that model/effects.cjs interprets, so no app code runs on a node.

const path = require("node:path");
const { p, action, query, defineModel, defineApp } = require("matterhorn-sdk");

const packageRoot = path.join(__dirname, ".");
const frontendCommand = path.join(packageRoot, "shared", "frontendCommand.cjs");

/* ----- model: roles seed roleDefinitions; state shape drives collections ----- */

const chat = defineModel({
  roles: {
    guest: {
      name: "Guest",
      description: "Can view public room activity",
      color: "#6b7280",
      rank: 0,
      system: true,
    },
    member: {
      name: "Member",
      description: "Can send messages and join voice channels",
      color: "#22c55e",
      rank: 1,
      system: true,
    },
    moderator: {
      name: "Moderator",
      description: "Can manage channels, messages, and voice channels",
      color: "#38bdf8",
      rank: 2,
      system: true,
    },
    admin: {
      name: "Admin",
      description: "Can create channels and manage roles",
      color: "#a78bfa",
      rank: 3,
      system: true,
    },
    owner: {
      name: "Owner",
      description: "Full room ownership",
      color: "#f59e0b",
      rank: 4,
      system: true,
    },
  },
  state: {
    initial: {
      channels: [
        {
          id: "general",
          name: "general",
          topic: "Room coordination",
          group: "General",
          createdAt: 0,
          createdBy: "system",
          archivedAt: null,
        },
      ],
      messages: {},
      guests: {},
      publicInvites: [],
      joinRequests: {},
      memberRoles: {},
      // activity: [] and roleDefinitions are seeded by the builder from `roles`.
    },
  },
  shapes: {
    // Ledger-pattern annotations for Milestone 2 per-stream indexing.
    // - window  = append-only event stream (efficient latest-X + chunk pagination).
    // - head    = single latest value per key (small, replaces in place).
    // - seq     = integrity enforced by monotonic sequence numbers per stream.
    // - signature = integrity enforced by writer signatures.
    //
    // NOTE: message.edit/react/pin/unpin/delete and channel/role updates still
    // use updateRecord/markRecord while CRDT effects are finalized. The
    // cross-partition validator is not yet wired into defineApp, so these
    // declarations describe intent without blocking the build.
    messages: { readClass: "window", integrityClass: "seq" },
    guests: { readClass: "head", integrityClass: "signature" },
    publicInvites: { readClass: "head", integrityClass: "signature" },
    joinRequests: { readClass: "head", integrityClass: "signature" },
    activity: { readClass: "window", integrityClass: "seq" },
    channels: { readClass: "head", integrityClass: "signature" },
    memberRoles: { readClass: "head", integrityClass: "signature" },
    roleDefinitions: { readClass: "head", integrityClass: "signature" },
  },
});

const {
  channels,
  messages,
  guests,
  publicInvites,
  joinRequests,
  roleDefinitions,
  memberRoles,
} = chat.collections;

/* ----- operations (faithful to the existing model.json) ----- */

const operations = {
  "channel.create": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        name: p.string({ max: 80 }),
        topic: p.string({ max: 240 }).nullable().optional(),
        group: p.string({ max: 80 }).nullable().optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.create(channels, {
          id: ref.newId("channel"),
          fields: {
            name: ref.payload("name"),
            topic: ref.payload("topic", null),
            group: ref.payload("group", null),
            createdAt: ref.now(),
            createdBy: ref.actor("memberId"),
            archivedAt: null,
          },
          activity: "created channel",
        }),
      ],
    }),
  ),

  "channel.rename": action(
    {
      authorize: { roles: ["moderator"] },
      payload: {
        channelId: p.string({ max: 200 }),
        name: p.string({ max: 80 }).nullable().optional(),
        topic: p.string({ max: 240 }).nullable().optional(),
        group: p.string({ max: 80 }).nullable().optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.update(channels, {
          id: ref.payload("channelId"),
          set: {
            name: ref.payload("name"),
            topic: ref.payload("topic"),
            group: ref.payload("group"),
            updatedAt: ref.now(),
          },
          activity: "updated record",
        }),
      ],
    }),
  ),

  "channel.archive": action(
    {
      authorize: { roles: ["moderator"] },
      payload: { channelId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.mark(channels, {
          id: ref.payload("channelId"),
          set: { archivedAt: ref.now() },
          activity: "marked record",
        }),
      ],
    }),
  ),

  "message.send": action(
    {
      authorize: { roles: ["member"] },
      payload: {
        channelId: p.string({ max: 200 }),
        body: p.string({ max: 4000 }),
        embeds: p.array().optional(),
        mentionIds: p.array(p.string({ max: 120 })).optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.create(messages, {
          id: ref.newId("message"),
          fields: {
            channelId: ref.payload("channelId"),
            body: ref.payload("body"),
            authorId: ref.actor("memberId"),
            createdAt: ref.now(),
            replyToId: null,
            editedAt: null,
            deletedAt: null,
            deletedBy: null,
            pinnedAt: null,
            pinnedBy: null,
            reactions: {},
            embeds: ref.payload("embeds", []),
          },
          activity: "created message",
        }),
      ],
    }),
  ),

  "message.reply": action(
    {
      authorize: { roles: ["member"] },
      payload: {
        channelId: p.string({ max: 200 }),
        replyToId: p.string({ max: 200 }),
        body: p.string({ max: 4000 }),
        mentionIds: p.array(p.string({ max: 120 })).optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.create(messages, {
          id: ref.newId("message"),
          fields: {
            channelId: ref.payload("channelId"),
            replyToId: ref.payload("replyToId"),
            body: ref.payload("body"),
            authorId: ref.actor("memberId"),
            createdAt: ref.now(),
            editedAt: null,
            deletedAt: null,
            deletedBy: null,
            pinnedAt: null,
            pinnedBy: null,
            reactions: {},
            embeds: [],
          },
          activity: "created message",
        }),
      ],
    }),
  ),

  "message.edit": action(
    {
      authorize: { roles: ["member"] },
      payload: {
        messageId: p.string({ max: 200 }),
        body: p.string({ max: 4000 }),
        embeds: p.array().optional(),
      },
    },
    ({ ref, fx, guard }) => ({
      guards: [
        guard.ownerOrRole(messages, {
          id: ref.payload("messageId"),
          ownerField: "authorId",
          roles: [],
          message: "Only message authors can edit messages.",
        }),
        guard.flagClear(messages, {
          id: ref.payload("messageId"),
          flag: "deletedAt",
          message: "Deleted messages cannot be edited.",
        }),
      ],
      effects: [
        fx.update(messages, {
          id: ref.payload("messageId"),
          set: {
            body: ref.payload("body"),
            editedAt: ref.now(),
            embeds: ref.payload("embeds"),
          },
          activity: "updated record",
        }),
      ],
    }),
  ),

  "message.react": action(
    {
      authorize: { roles: ["member"] },
      payload: {
        messageId: p.string({ max: 200 }),
        emoji: p.string({ max: 64 }),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.toggleReaction(messages, {
          id: ref.payload("messageId"),
          emoji: ref.payload("emoji"),
        }),
      ],
    }),
  ),

  "message.pin": action(
    {
      authorize: { roles: ["moderator"] },
      payload: { messageId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.mark(messages, {
          id: ref.payload("messageId"),
          set: { pinnedAt: ref.now(), pinnedBy: ref.actor("memberId") },
          activity: "marked record",
        }),
      ],
    }),
  ),

  "message.unpin": action(
    {
      authorize: { roles: ["moderator"] },
      payload: { messageId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.mark(messages, {
          id: ref.payload("messageId"),
          set: { pinnedAt: null, pinnedBy: null },
          activity: "marked record",
        }),
      ],
    }),
  ),

  "message.delete": action(
    {
      authorize: { roles: ["member"] },
      payload: { messageId: p.string({ max: 200 }) },
    },
    ({ ref, fx, guard }) => ({
      guards: [
        guard.ownerOrRole(messages, {
          id: ref.payload("messageId"),
          ownerField: "authorId",
          roles: ["moderator"],
          message: "Only message authors or moderators can delete messages.",
        }),
      ],
      effects: [
        fx.mark(messages, {
          id: ref.payload("messageId"),
          set: {
            body: "",
            embeds: [],
            reactions: {},
            pinnedAt: null,
            pinnedBy: null,
            deletedAt: ref.now(),
            deletedBy: ref.actor("memberId"),
          },
          activity: "marked record",
        }),
      ],
    }),
  ),

  "member.moderate": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        memberId: p.string({ max: 200 }),
        nameLocked: p.boolean().optional(),
        chatDisabled: p.boolean().optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.upsert(guests, {
          id: ref.payload("memberId"),
          set: {
            memberId: ref.payload("memberId"),
            nameLocked: ref.payload("nameLocked"),
            chatDisabled: ref.payload("chatDisabled"),
            moderatedAt: ref.now(),
            moderatedBy: ref.actor("memberId"),
          },
          activity: "moderated member",
        }),
      ],
    }),
  ),

  "member.ban": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        memberId: p.string({ max: 200 }),
        reason: p.string({ max: 300 }).nullable().optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.upsert(guests, {
          id: ref.payload("memberId"),
          set: {
            memberId: ref.payload("memberId"),
            bannedAt: ref.now(),
            banReason: ref.payload("reason", null),
            chatDisabled: true,
            bannedBy: ref.actor("memberId"),
          },
          activity: "banned member",
        }),
      ],
    }),
  ),

  "member.unban": action(
    {
      authorize: { roles: ["admin"] },
      payload: { memberId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.upsert(guests, {
          id: ref.payload("memberId"),
          set: {
            memberId: ref.payload("memberId"),
            bannedAt: null,
            banReason: null,
            chatDisabled: false,
            unbannedAt: ref.now(),
            unbannedBy: ref.actor("memberId"),
          },
          activity: "unbanned member",
        }),
      ],
    }),
  ),

  "invite.disable": action(
    {
      authorize: { roles: ["admin"] },
      payload: { inviteId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.update(publicInvites, {
          id: ref.payload("inviteId"),
          set: {
            status: "disabled",
            disabledAt: ref.now(),
            disabledBy: ref.actor("memberId"),
          },
          activity: "disabled invite",
        }),
      ],
    }),
  ),

  "invite.remove": action(
    {
      authorize: { roles: ["admin"] },
      payload: { inviteId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.update(publicInvites, {
          id: ref.payload("inviteId"),
          set: {
            status: "removed",
            removedAt: ref.now(),
            removedBy: ref.actor("memberId"),
          },
          activity: "removed invite",
        }),
      ],
    }),
  ),

  "join.approve": action(
    {
      authorize: { roles: ["admin"] },
      payload: { requestId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.update(joinRequests, {
          id: ref.payload("requestId"),
          set: {
            status: "approved",
            decidedAt: ref.now(),
            decidedBy: ref.actor("memberId"),
          },
          activity: "approved join request",
        }),
      ],
    }),
  ),

  "join.deny": action(
    {
      authorize: { roles: ["admin"] },
      payload: { requestId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.update(joinRequests, {
          id: ref.payload("requestId"),
          set: {
            status: "denied",
            decidedAt: ref.now(),
            decidedBy: ref.actor("memberId"),
          },
          activity: "denied join request",
        }),
      ],
    }),
  ),

  "role.create": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        roleId: p.string({ max: 80 }),
        name: p.string({ max: 80 }),
        description: p.string({ max: 240 }).nullable().optional(),
        color: p.string({ max: 40 }).nullable().optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.create(roleDefinitions, {
          id: ref.payload("roleId"),
          fields: {
            name: ref.payload("name"),
            description: ref.payload("description", null),
            color: ref.payload("color", null),
            rank: 1,
            systemRole: false,
            createdBy: ref.actor("memberId"),
            createdAt: ref.now(),
            archivedAt: null,
          },
          activity: "created role",
        }),
      ],
    }),
  ),

  "role.update": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        roleId: p.string({ max: 80 }),
        name: p.string({ max: 80 }).nullable().optional(),
        description: p.string({ max: 240 }).nullable().optional(),
        color: p.string({ max: 40 }).nullable().optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.update(roleDefinitions, {
          id: ref.payload("roleId"),
          recordLabel: "Role",
          set: {
            name: ref.payload("name"),
            description: ref.payload("description"),
            color: ref.payload("color"),
            updatedAt: ref.now(),
            updatedBy: ref.actor("memberId"),
          },
          activity: "updated role",
        }),
      ],
    }),
  ),

  "role.archive": action(
    {
      authorize: { roles: ["admin"] },
      payload: { roleId: p.string({ max: 80 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.mark(roleDefinitions, {
          id: ref.payload("roleId"),
          recordLabel: "Role",
          set: { archivedAt: ref.now(), archivedBy: ref.actor("memberId") },
          activity: "archived role",
        }),
      ],
    }),
  ),

  "member.role.assign": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        memberId: p.string({ max: 120 }),
        roleId: p.string({ max: 80 }).nullable().optional(),
        roleIds: p.array(p.string({ max: 80 })).optional(),
        displayName: p.string({ max: 120 }).nullable().optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.create(memberRoles, {
          id: ref.payload("memberId"),
          fields: {
            memberId: ref.payload("memberId"),
            roleId: ref.payload("roleId", null),
            roleIds: ref.payload("roleIds", []),
            displayName: ref.payload("displayName", null),
            assignedBy: ref.actor("memberId"),
            assignedAt: ref.now(),
          },
          activity: "assigned role",
        }),
      ],
    }),
  ),
};

/* ----- declarative notifications -----
 * The NotificationRuntime in the SDK matches each accepted operation against
 * `on.action` (the dispatched schemaAction), resolves the audience/scope/
 * presentation expressions, and asks the relay to push to the recipients'
 * subscribed devices. The relay stays zero-knowledge: payloads are encrypted
 * with the room secret and contain no message body. This replaces the old
 * imperative `sendPushNotification` calls in the frontend.
 *
 * Mentions are resolved on the client (member names are only known there) and
 * passed through as `payload.mentionIds`, which the audience expression reads.
 */
const notifications = {
  messageMention: {
    kind: "mosh.message.mention",
    on: { action: "messageSend" },
    audience: { userIds: "$payload.mentionIds", excludeActor: true },
    scope: { type: "channel", id: "$payload.channelId" },
    presentation: {
      title: { $expr: "$actor.displayName", fallback: "New mention" },
      body: "mentioned you in a message",
    },
    link: { route: "channel", params: { channelId: "$payload.channelId" } },
    read: {
      scopeKey: "channel:$payload.channelId",
      cursor: {
        createdAt: "$operation.createdAt",
        operationId: "$operation.id",
      },
      defaultPolicy: "route-visible",
    },
    delivery: { collapse: "scope" },
  },
  replyMention: {
    kind: "mosh.reply.mention",
    on: { action: "messageReply" },
    audience: { userIds: "$payload.mentionIds", excludeActor: true },
    scope: { type: "channel", id: "$payload.channelId" },
    presentation: {
      title: { $expr: "$actor.displayName", fallback: "New mention" },
      body: "mentioned you in a reply",
    },
    link: { route: "channel", params: { channelId: "$payload.channelId" } },
    read: {
      scopeKey: "channel:$payload.channelId",
      cursor: {
        createdAt: "$operation.createdAt",
        operationId: "$operation.id",
      },
      defaultPolicy: "route-visible",
    },
    delivery: { collapse: "scope" },
  },
  directMessage: {
    kind: "mosh.directMessage",
    on: { action: "directMessageSend" },
    audience: { userIds: "$payload.userIds", excludeActor: true },
    // No thread id is in the payload, so group per sender: every recipient
    // collapses notifications from the same person into one.
    scope: { type: "dm", id: "$actor.memberId" },
    presentation: {
      title: { $expr: "$actor.displayName", fallback: "New message" },
      // The body is static because the schema only accepts a string here.
      // If you want dynamic DM text, encrypt it client-side into the notification
      // transport; the relay and schema stay zero-knowledge.
      body: "sent you a direct message",
    },
    link: { route: "dm", params: { memberId: "$actor.memberId" } },
    read: {
      scopeKey: "dm:$actor.memberId",
      cursor: {
        createdAt: "$operation.createdAt",
        operationId: "$operation.id",
      },
      defaultPolicy: "route-visible",
    },
    delivery: { collapse: "scope" },
  },
};

/* ----- compose with shared plugins + views + routes ----- */

const app = defineApp({
  id: "gg.matterhorn.mosh",
  name: "Mosh",
  version: "1.0.0",
  pluginId: "gg.matterhorn.mosh.plugin",
  slug: "matterhorn-mosh",
  packageName: "matterhorn-mosh",
  packageRoot,
  exportPrefix: "mosh",
  constantPrefix: "MOSH",
  frontend: {
    backgroundColor: "oklch(0.205 0.008 260)",
    icon: "icon.svg",
    port: 42732,
    devEntry: "src/index.tsx",
    builtEntry: "matterhorn-mosh.js",
    dist: "dist",
    dev: {
      command: process.execPath,
      args: [
        frontendCommand,
        "dev",
        packageRoot,
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        "${bundlePort}",
        "--strictPort",
      ],
    },
    build: {
      command: process.execPath,
      args: [frontendCommand, "build", packageRoot],
    },
  },
  matterhorn: {
    frontendProjection: "chat",
  },
  example: {
    id: "matterhorn-mosh",
    title: "Mosh Matterhorn example",
  },
  model: chat.withOperations(operations),
  actions: {
    moderateMember: {
      plugin: "primary",
      type: "member.moderate",
      requiredRole: "admin",
    },
    banMember: { plugin: "primary", type: "member.ban", requiredRole: "admin" },
    unbanMember: {
      plugin: "primary",
      type: "member.unban",
      requiredRole: "admin",
    },
    disableInvite: {
      plugin: "primary",
      type: "invite.disable",
      requiredRole: "admin",
    },
    removeInvite: {
      plugin: "primary",
      type: "invite.remove",
      requiredRole: "admin",
    },
    approveJoinRequest: {
      plugin: "primary",
      type: "join.approve",
      requiredRole: "admin",
    },
    denyJoinRequest: {
      plugin: "primary",
      type: "join.deny",
      requiredRole: "admin",
    },
    directMessageSend: {
      plugin: "core",
      type: "dm.message",
      requiredRole: "member",
    },
  },
  notifications: { definitions: notifications },
  plugins: [
    "comments",
    "presence",
    {
      key: "mediaRooms",
      config: {
        defaultRooms: [
          {
            id: "general_voice",
            name: "General",
            group: "General",
            allowsVideo: true,
            scopeType: "channel",
            scopeId: "general",
          },
        ],
      },
    },
    "screenShare",
    "embeds",
    "reactions",
  ],
  views: {
    channelSummary: query.collection(channels),
    roomDirectory: { plugin: "mediaRooms", query: "roomDirectory" },
    onlineMembers: { plugin: "presence", query: "onlineMembers" },
  },
  routes: [
    {
      path: "/",
      component: "ChatRoomPage",
      requires: ["gg.matterhorn.mosh.plugin"],
    },
    {
      path: "/dms",
      component: "DirectMessagesPage",
      requires: ["gg.matterhorn.mosh.plugin"],
    },
    {
      path: "/rooms",
      component: "MediaRoomsPage",
      requires: [
        "gg.matterhorn.examples.plugins.media-rooms",
        "gg.matterhorn.examples.plugins.screen-share",
      ],
    },
  ],
});

module.exports = app;

if (require.main === module) {
  const out = app.emit({ outDir: packageRoot, typesFile: "types.d.ts" });
  console.log("emitted:", out.bundlePath);
}
