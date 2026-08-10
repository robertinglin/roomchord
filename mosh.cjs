// matterhorn-mosh/src/sdk-app.cjs
//
// Chat primary backend authored through the declarative schema builder.
// This is the source of truth; running this file emits the full Matterhorn app
// bundle at the package root. Nothing here is a reducer function: fx/guard/ref
// produce the same declarative effect/guard
// descriptors that model/effects.cjs interprets, so no app code runs on a node.

const path = require("node:path");
const { p, action, query, defineModel, defineApp, permissions } = require("matterhorn-sdk");

const packageRoot = path.join(__dirname, ".");
const frontendCommand = path.join(packageRoot, "shared", "frontendCommand.cjs");

/* ----- model: roles seed roleDefinitions; state shape drives collections ----- */

const chat = defineModel({
  roles: permissions.DEFAULT_ROOM_ROLES,
  state: {
    initial: {
      channels: [
        {
          id: "general",
          name: "general",
          topic: "Room coordination",
          group: "General",
          categoryId: "general",
          position: 0,
          requiredRole: "member",
          scopeType: "channel",
          scopeId: "general",
          createdAt: 0,
          createdBy: "system",
          archivedAt: null,
        },
        {
          id: "guest",
          name: "guest",
          topic: "Guest lobby",
          group: "Guest",
          categoryId: "guest",
          position: 0,
          requiredRole: "guest",
          scopeType: "channel",
          scopeId: "guest",
          createdAt: 0,
          createdBy: "system",
          archivedAt: null,
        },
      ],
      categories: [
        { id: "general", name: "General", position: 0, scopeType: "category", scopeId: "general", createdAt: 0, createdBy: "system", archivedAt: null },
        { id: "guest", name: "Guest", position: 1, scopeType: "category", scopeId: "guest", createdAt: 0, createdBy: "system", archivedAt: null },
      ],
      messages: {},
      guests: {},
      callRoutes: {},
      publicInvites: [
        { id: "admin", role: "admin", status: "active", createdAt: 0 },
        { id: "member", role: "member", status: "active", createdAt: 0 },
        { id: "guest", role: "guest", status: "active", createdAt: 0 },
      ],
      joinRequests: {},
      access: {
        version: 1,
        scopes: {
          "channel:general": { scopeType: "channel", scopeId: "general", role: "editor", canView: true, canEdit: true },
          "channel:guest": { scopeType: "channel", scopeId: "guest", role: "editor", canView: true, canEdit: true },
        },
      },
      // activity: [] and roleDefinitions are seeded by Matterhorn from `roles`.
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
    // File bytes and provider credentials stay in Matterhorn's Files v2 and
    // Drive hosts. Only immutable, encrypted file/attachment metadata is
    // projected into room state.
    files: { readClass: "head", integrityClass: "signature" },
    attachments: { readClass: "head", integrityClass: "signature" },
    callRoutes: { readClass: "head", integrityClass: "signature" },
    guests: { readClass: "head", integrityClass: "signature" },
    publicInvites: { readClass: "head", integrityClass: "signature" },
    joinRequests: { readClass: "head", integrityClass: "signature" },
    activity: { readClass: "window", integrityClass: "seq" },
    channels: { readClass: "head", integrityClass: "signature" },
    categories: { readClass: "head", integrityClass: "signature" },
    roleDefinitions: { readClass: "head", integrityClass: "signature" },
  },
});

const {
  channels,
  categories,
  callRoutes,
  messages,
  guests,
  publicInvites,
  joinRequests,
} = chat.collections;

/* ----- operations (faithful to the existing model.json) ----- */

const customMediaRefsPayload = p.array(p.object({
  mediaId: p.string({ max: 320 }),
  scopeType: p.string({ max: 120 }),
  scopeId: p.string({ max: 320 }),
  mediaType: p.enum(["emoji", "sticker", "gif", "voice"]),
}), { max: 64 }).optional();

const operations = {
  "category.create": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        categoryId: p.string({ max: 200 }),
        name: p.string({ max: 80 }),
        position: p.number({ min: 0 }).optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.create(categories, {
          id: ref.payload("categoryId"),
          fields: {
            name: ref.payload("name"),
            position: ref.payload("position"),
            scopeType: "category",
            scopeId: ref.payload("categoryId"),
            createdAt: ref.now(),
            createdBy: ref.actor("memberId"),
            archivedAt: null,
          },
          activity: "created category",
        }),
      ],
    }),
  ),

  "category.update": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        categoryId: p.string({ max: 200 }),
        name: p.string({ max: 80 }).optional(),
        position: p.number({ min: 0 }).optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.update(categories, {
          id: ref.payload("categoryId"),
          set: {
            name: ref.payload("name"),
            position: ref.payload("position"),
            updatedAt: ref.now(),
          },
          activity: "updated category",
        }),
      ],
    }),
  ),

  "category.archive": action(
    {
      authorize: { roles: ["admin"] },
      payload: { categoryId: p.string({ max: 200 }) },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.mark(categories, {
          id: ref.payload("categoryId"),
          set: { archivedAt: ref.now() },
          activity: "archived category",
        }),
      ],
    }),
  ),

  "category.reorder": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        categoryId: p.string({ max: 200 }),
        position: p.number({ min: 0 }),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.update(categories, {
          id: ref.payload("categoryId"),
          set: { position: ref.payload("position"), updatedAt: ref.now() },
          activity: "reordered category",
        }),
      ],
    }),
  ),

  "channel.create": action(
    {
      authorize: { roles: ["admin"] },
      payload: {
        channelId: p.string({ max: 200 }),
        name: p.string({ max: 80 }),
        topic: p.string({ max: 240 }).nullable().optional(),
        group: p.string({ max: 80 }).nullable().optional(),
        categoryId: p.string({ max: 200 }).nullable().optional(),
        position: p.number({ min: 0 }).optional(),
        visibility: p.enum(["public", "private"]).optional(),
        requiredRole: p.string({ max: 120 }),
        allowedRoleIds: p.array(p.string({ max: 120 }), { max: 64 }).optional(),
        allowedMemberIds: p.array(p.string({ max: 240 }), { max: 128 }).optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.create(channels, {
          id: ref.payload("channelId"),
          fields: {
            name: ref.payload("name"),
            topic: ref.payload("topic"),
            group: ref.payload("group"),
            categoryId: ref.payload("categoryId"),
            position: ref.payload("position"),
            visibility: ref.payload("visibility"),
            allowedRoleIds: ref.payload("allowedRoleIds"),
            allowedMemberIds: ref.payload("allowedMemberIds"),
            requiredRole: ref.payload("requiredRole"),
            scopeType: "channel",
            scopeId: ref.payload("channelId"),
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
      authorize: {
        roles: ["moderator"],
        scoped: {
          scopeType: "channel",
          record: { collection: "channels", idField: "channelId", scopeIdField: "scopeId" },
          minimumLevel: "moderator",
        },
      },
      payload: {
        channelId: p.string({ max: 200 }),
        name: p.string({ max: 80 }).nullable().optional(),
        topic: p.string({ max: 240 }).nullable().optional(),
        group: p.string({ max: 80 }).nullable().optional(),
        categoryId: p.string({ max: 200 }).nullable().optional(),
        position: p.number({ min: 0 }).optional(),
        visibility: p.enum(["public", "private"]).optional(),
        requiredRole: p.string({ max: 120 }).optional(),
        allowedRoleIds: p.array(p.string({ max: 120 }), { max: 64 }).optional(),
        allowedMemberIds: p.array(p.string({ max: 240 }), { max: 128 }).optional(),
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
            categoryId: ref.payload("categoryId"),
            position: ref.payload("position"),
            visibility: ref.payload("visibility"),
            requiredRole: ref.payload("requiredRole"),
            allowedRoleIds: ref.payload("allowedRoleIds"),
            allowedMemberIds: ref.payload("allowedMemberIds"),
            updatedAt: ref.now(),
          },
          activity: "updated record",
        }),
      ],
    }),
  ),

  "channel.archive": action(
    {
      authorize: {
        roles: ["moderator"],
        scoped: {
          scopeType: "channel",
          record: { collection: "channels", idField: "channelId", scopeIdField: "scopeId" },
          minimumLevel: "moderator",
        },
      },
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
      authorize: {
        roles: ["guest", "member"],
        scoped: { scopeType: "channel", payloadScopeIdField: "channelId", minimumLevel: "editor" },
      },
      payload: {
        channelId: p.string({ max: 200 }),
        body: p.string({ max: 4000 }),
        embeds: p.array().optional(),
        mentionIds: p.array(p.string({ max: 120 })).optional(),
        attachmentIds: p.array(p.string({ max: 200 })).optional(),
        tagIds: p.array(p.string({ max: 120 }), { max: 32 }).optional(),
        customMediaRefs: customMediaRefsPayload,
      },
    },
    ({ ref, fx, guard }) => ({
      guards: [guard.or(guard.eq("$payload.channelId", "guest"), guard.ne("$actor.role", "guest"))],
      effects: [
        fx.create(messages, {
          id: ref.newId("message"),
          fields: {
            channelId: ref.payload("channelId"),
            scopeType: "channel",
            scopeId: ref.payload("channelId"),
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
            embeds: ref.payload("embeds"),
            attachmentIds: ref.payload("attachmentIds"),
            tagIds: ref.payload("tagIds"),
            customMediaRefs: ref.payload("customMediaRefs"),
          },
          activity: "created message",
        }),
      ],
    }),
  ),

  "message.reply": action(
    {
      authorize: {
        roles: ["guest", "member"],
        scoped: { scopeType: "channel", payloadScopeIdField: "channelId", minimumLevel: "editor" },
      },
      payload: {
        channelId: p.string({ max: 200 }),
        replyToId: p.string({ max: 200 }),
        body: p.string({ max: 4000 }),
        mentionIds: p.array(p.string({ max: 120 })).optional(),
        attachmentIds: p.array(p.string({ max: 200 })).optional(),
        tagIds: p.array(p.string({ max: 120 }), { max: 32 }).optional(),
        customMediaRefs: customMediaRefsPayload,
      },
    },
    ({ ref, fx, guard }) => ({
      guards: [guard.or(guard.eq("$payload.channelId", "guest"), guard.ne("$actor.role", "guest"))],
      effects: [
        fx.create(messages, {
          id: ref.newId("message"),
          fields: {
            channelId: ref.payload("channelId"),
            scopeType: "channel",
            scopeId: ref.payload("channelId"),
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
            attachmentIds: ref.payload("attachmentIds"),
            tagIds: ref.payload("tagIds"),
            customMediaRefs: ref.payload("customMediaRefs"),
          },
          activity: "created message",
        }),
      ],
    }),
  ),

  "message.edit": action(
    {
      authorize: {
        roles: ["member"],
        scoped: {
          scopeType: "channel",
          record: { collection: "messages", idField: "messageId", scopeIdField: "channelId", ownerField: "authorId" },
          minimumLevel: "editor",
          ownerAllowed: true,
        },
      },
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
      authorize: {
        roles: ["member"],
        scoped: {
          scopeType: "channel",
          record: { collection: "messages", idField: "messageId", scopeIdField: "channelId" },
          minimumLevel: "editor",
        },
      },
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
      authorize: {
        roles: ["moderator"],
        scoped: {
          scopeType: "channel",
          record: { collection: "messages", idField: "messageId", scopeIdField: "channelId" },
          minimumLevel: "moderator",
        },
      },
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
      authorize: {
        roles: ["moderator"],
        scoped: {
          scopeType: "channel",
          record: { collection: "messages", idField: "messageId", scopeIdField: "channelId" },
          minimumLevel: "moderator",
        },
      },
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
      authorize: {
        roles: ["member"],
        scoped: {
          scopeType: "channel",
          record: { collection: "messages", idField: "messageId", scopeIdField: "channelId", ownerField: "authorId" },
          minimumLevel: "moderator",
          ownerAllowed: true,
        },
      },
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

  "member.call.update": action(
    {
      authorize: { roles: ["member"] },
      payload: {
        clientId: p.string({ max: 200 }),
        peerId: p.string({ max: 200 }),
        peerAddress: p.string({ max: 400 }).optional(),
        callPubkey: p.string({ max: 200 }),
        name: p.string({ max: 80 }).optional(),
        avatar: p.string({ max: 200 }).optional(),
      },
    },
    ({ ref, fx }) => ({
      effects: [
        fx.upsertActor(guests, {
          fields: {
            memberId: ref.actor("memberId"),
            role: ref.actor("role"),
            lastSeenAt: ref.now(),
            callClientId: ref.payload("clientId"),
            peerId: ref.payload("peerId"),
            peerAddress: ref.payload("peerAddress"),
            callPubkey: ref.payload("callPubkey"),
            name: ref.payload("name"),
            avatar: ref.payload("avatar"),
            callUpdatedAt: ref.now(),
          },
        }),
        fx.upsertActor(callRoutes, {
          fields: {
            memberId: ref.actor("memberId"),
            callClientId: ref.payload("clientId"),
            peerId: ref.payload("peerId"),
            peerAddress: ref.payload("peerAddress"),
            callPubkey: ref.payload("callPubkey"),
            name: ref.payload("name"),
            avatar: ref.payload("avatar"),
            callUpdatedAt: ref.now(),
          },
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
            banReason: ref.payload("reason"),
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

  // Custom Mosh role CRUD moved to Matterhorn core scoped access.
  // SDK actions below delegate to Matterhorn's immutable scoped-role lifecycle.
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
    scope: { type: "direct.thread", id: "$direct.threadId" },
    presentation: {
      title: { $expr: "$actor.displayName", fallback: "New message" },
      body: "sent you a direct message",
    },
    link: { route: "dm", params: { memberId: "$actor.memberId" } },
    read: {
      scopeKey: "direct.thread:$direct.threadId",
      cursor: {
        createdAt: "$operation.createdAt",
        operationId: "$operation.id",
      },
      defaultPolicy: "route-visible",
    },
    delivery: { collapse: "scope" },
  },
  directMessageReply: {
    kind: "mosh.directMessage.reply",
    on: { action: "directMessageReply" },
    audience: { userIds: "$payload.userIds", excludeActor: true },
    scope: { type: "direct.thread", id: "$direct.threadId" },
    presentation: {
      title: { $expr: "$actor.displayName", fallback: "New reply" },
      body: "replied in a direct message",
    },
    link: { route: "dm", params: { memberId: "$actor.memberId" } },
    read: {
      scopeKey: "direct.thread:$direct.threadId",
      cursor: { createdAt: "$operation.createdAt", operationId: "$operation.id" },
      defaultPolicy: "route-visible",
    },
    delivery: { collapse: "scope" },
  },
  directMessageForward: {
    kind: "mosh.directMessage.forward",
    on: { action: "directMessageForward" },
    audience: { userIds: "$payload.userIds", excludeActor: true },
    scope: { type: "direct.thread", id: "$direct.threadId" },
    presentation: {
      title: { $expr: "$actor.displayName", fallback: "Forwarded message" },
      body: "forwarded a message to you",
    },
    link: { route: "dm", params: { memberId: "$actor.memberId" } },
    read: {
      scopeKey: "direct.thread:$direct.threadId",
      cursor: { createdAt: "$operation.createdAt", operationId: "$operation.id" },
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
  // Drive is optional: the app remains usable with encrypted room files when
  // no OAuth broker is configured. These are the exact capability keys
  // consumed by Matterhorn's driveManagement host for Google Drive sharing.
  appCapabilities: {
    optional: [
      "driveManagement.providers.read",
      "driveManagement.connections.read",
      "driveManagement.connect",
      "driveManagement.upload",
      "driveManagement.accountLabel.read",
      "driveManagement.googleDrive.files.create",
      "driveManagement.googleDrive.files.content.read",
      "driveManagement.googleDrive.files.metadata.read",
      "driveManagement.googleDrive.files.delete",
      "driveManagement.googleDrive.permissions.write",
    ],
  },
  example: {
    id: "matterhorn-mosh",
    title: "Mosh Matterhorn example",
  },
  model: chat.withOperations(operations),
  actions: {
    categoryCreate: {
      plugin: "primary",
      type: "category.create",
      requiredRole: "admin",
    },
    categoryUpdate: {
      plugin: "primary",
      type: "category.update",
      requiredRole: "admin",
    },
    categoryArchive: {
      plugin: "primary",
      type: "category.archive",
      requiredRole: "admin",
    },
    categoryReorder: {
      plugin: "primary",
      type: "category.reorder",
      requiredRole: "admin",
    },
    channelCreate: {
      plugin: "primary",
      type: "channel.create",
      requiredRole: "admin",
    },
    channelRename: {
      plugin: "primary",
      type: "channel.rename",
      requiredRole: "moderator",
    },
    channelArchive: {
      plugin: "primary",
      type: "channel.archive",
      requiredRole: "moderator",
    },
    mediaRoomCreateScoped: {
      plugin: "mediaRooms",
      type: "media.room.create.v2",
      requiredRole: "moderator",
      authorize: { scoped: { scopeType: "$payload.parentScopeType", scopeId: "$payload.parentScopeId", minimumLevel: "moderator" } },
    },
    mediaRoomUpdate: {
      plugin: "mediaRooms",
      type: "media.room.update",
      requiredRole: "moderator",
      authorize: { scoped: { record: { collection: "rooms", idField: "roomId", scopeTypeField: "scopeType", scopeIdField: "scopeId" }, minimumLevel: "moderator" } },
    },
    ...permissions.roleManagementActions({
      defineName: "roleCreate",
      updateName: "roleUpdate",
      assignName: "memberRoleAssign",
      unassignName: "memberRoleUnassign",
      tombstoneName: "roleTombstone",
      overrideSetName: "scopeMemberOverrideSet",
      overrideRemoveName: "scopeMemberOverrideRemove",
      parentSetName: "scopeParentSet",
      parentRemoveName: "scopeParentRemove",
    }),
    moderateMember: {
      plugin: "primary",
      type: "member.moderate",
      requiredRole: "admin",
    },
    updateMemberCall: {
      plugin: "primary",
      type: "member.call.update",
      requiredRole: "member",
    },
    banMember: { plugin: "primary", type: "member.ban", requiredRole: "admin" },
    unbanMember: {
      plugin: "primary",
      type: "member.unban",
      requiredRole: "admin",
    },
    memberTimeout: {
      plugin: "core",
      type: "member.timeout",
      requiredRole: "moderator",
    },
    memberQuarantine: {
      plugin: "core",
      type: "member.quarantine",
      requiredRole: "moderator",
    },
    channelSlowmode: {
      plugin: "core",
      type: "channel.slowmode",
      requiredRole: "moderator",
    },
    memberReport: {
      plugin: "core",
      type: "member.report",
      requiredRole: "member",
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
    directMessageReply: {
      plugin: "core",
      type: "dm.message.reply",
      requiredRole: "member",
    },
    directMessageEdit: {
      plugin: "core",
      type: "dm.message.edit",
      requiredRole: "member",
    },
    directMessageDelete: {
      plugin: "core",
      type: "dm.message.delete",
      requiredRole: "member",
    },
    directMessageReact: {
      plugin: "core",
      type: "dm.message.react",
      requiredRole: "member",
    },
    directMessagePin: {
      plugin: "core",
      type: "dm.message.pin",
      requiredRole: "member",
    },
    directMessageUnpin: {
      plugin: "core",
      type: "dm.message.unpin",
      requiredRole: "member",
    },
    messageForward: {
      plugin: "core",
      type: "message.forward",
      requiredRole: "member",
    },
    directMessageForward: {
      plugin: "core",
      type: "dm.message.forward",
      requiredRole: "member",
    },
    pollCreate: {
      plugin: "polls",
      type: "poll.create",
      requiredRole: "member",
    },
    pollVote: {
      plugin: "polls",
      type: "poll.vote",
      requiredRole: "member",
    },
    pollClose: {
      plugin: "polls",
      type: "poll.close",
      requiredRole: "moderator",
    },
    calendarEventRsvp: {
      plugin: "calendar",
      type: "calendar.event.rsvp",
      requiredRole: "member",
    },
    calendarNotificationRead: {
      plugin: "calendar",
      type: "calendar.notification.read",
      requiredRole: "member",
    },
    channelKindCreate: {
      plugin: "channels",
      type: "channel.create",
      requiredRole: "moderator",
    },
    channelPostingPolicy: {
      plugin: "channels",
      type: "channel.posting.policy",
      requiredRole: "moderator",
    },
    channelThreadPolicy: {
      plugin: "channels",
      type: "channel.thread.policy",
      requiredRole: "moderator",
    },
    channelSpeakerPolicy: {
      plugin: "channels",
      type: "channel.speaker.policy",
      requiredRole: "moderator",
    },
    channelVoiceTextBind: {
      plugin: "channels",
      type: "channel.voice-text.bind",
      requiredRole: "moderator",
    },
    channelForumLayout: {
      plugin: "channels",
      type: "channel.forum.layout",
      requiredRole: "moderator",
    },
    channelForumTagCreate: {
      plugin: "channels",
      type: "channel.forum.tag.create",
      requiredRole: "moderator",
    },
    channelForumTagUpdate: {
      plugin: "channels",
      type: "channel.forum.tag.update",
      requiredRole: "moderator",
    },
    channelForumTagArchive: {
      plugin: "channels",
      type: "channel.forum.tag.archive",
      requiredRole: "moderator",
    },
    commentsThreadArchive: { plugin: "comments", type: "comments.thread.archive", requiredRole: "moderator" },
    commentsThreadReopen: { plugin: "comments", type: "comments.thread.reopen", requiredRole: "moderator" },
    commentsThreadLock: { plugin: "comments", type: "comments.thread.lock", requiredRole: "moderator" },
    commentsThreadUnlock: { plugin: "comments", type: "comments.thread.unlock", requiredRole: "moderator" },
    commentsThreadFollow: { plugin: "comments", type: "comments.thread.follow", requiredRole: "member" },
    commentsThreadUnfollow: { plugin: "comments", type: "comments.thread.unfollow", requiredRole: "member" },
    commentsThreadMemberAdd: { plugin: "comments", type: "comments.thread.member.add", requiredRole: "moderator" },
    commentsThreadMemberRemove: { plugin: "comments", type: "comments.thread.member.remove", requiredRole: "moderator" },
    commentsThreadNotifications: { plugin: "comments", type: "comments.thread.notifications", requiredRole: "member" },
    // These operations are intentionally delegated to Matterhorn's reusable
    // storage/attachment plugins. The app only exposes typed operation names;
    // encryption, resumable transfer, provider validation, and OAuth remain
    // inside Matterhorn SDK hosts.
    filePublishV2: {
      plugin: "files",
      type: "file.publish.v2",
      requiredRole: "member",
    },
    filePublishV3: {
      plugin: "files",
      type: "file.publish.v3",
      requiredRole: "member",
    },
    fileRevisionPublishV3: {
      plugin: "files",
      type: "file.revision.publish.v3",
      requiredRole: "member",
    },
    fileRemove: {
      plugin: "files",
      type: "file.remove",
      requiredRole: "member",
    },
    attachmentAdd: {
      plugin: "attachments",
      type: "attachment.add",
      requiredRole: "member",
    },
    attachmentThirdPartyAdd: {
      plugin: "attachments",
      type: "attachment.third-party.add",
      requiredRole: "member",
    },
    attachmentRemove: {
      plugin: "attachments",
      type: "attachment.remove",
      requiredRole: "member",
    },
    messagePin: {
      plugin: "primary",
      type: "message.pin",
      requiredRole: "moderator",
    },
    messageUnpin: {
      plugin: "primary",
      type: "message.unpin",
      requiredRole: "moderator",
    },
    messageDelete: {
      plugin: "primary",
      type: "message.delete",
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
            roleAccess: {
              member: "editor",
              moderator: "editor",
              admin: "editor",
              owner: "editor",
            },
          },
          {
            id: "voice",
            name: "Voice",
            group: "General",
            allowsVideo: false,
            scopeType: "channel",
            scopeId: "general",
            roleAccess: {
              member: "editor",
              moderator: "editor",
              admin: "editor",
              owner: "editor",
            },
          },
          {
            id: "guest_voice",
            name: "Guest",
            group: "Guest",
            allowsVideo: false,
            scopeType: "channel",
            scopeId: "guest",
            roleAccess: {
              guest: "readonly",
              member: "editor",
              moderator: "editor",
              admin: "editor",
              owner: "editor",
            },
          },
        ],
      },
    },
    "screenShare",
    "embeds",
    "attachments",
    "files",
    "reactions",
    "calendar",
    "polls",
    "channels",
  ],
  views: {
    channelSummary: query.collection(channels),
    categorySummary: query.collection(categories),
    attachmentsForScope: { plugin: "attachments", kind: "query", query: "attachmentsForScope" },
    filesForScope: { plugin: "files", kind: "query", query: "filesForScope" },
    roomDirectory: { plugin: "mediaRooms", query: "roomDirectory" },
    onlineMembers: { plugin: "presence", query: "onlineMembers" },
    upcomingEvents: { plugin: "calendar", query: "upcomingEvents" },
    eventsForScope: { plugin: "calendar", query: "eventsForScope" },
    calendarNotificationsForMember: { plugin: "calendar", query: "notificationsForMember" },
    pollsForScope: { plugin: "polls", query: "pollsForScope" },
    pollForId: { plugin: "polls", query: "pollForId" },
    channelsForScope: { plugin: "channels", query: "channelsForScope" },
    channelForId: { plugin: "channels", query: "channelForId" },
    postingPolicyForChannel: { plugin: "channels", query: "postingPolicyForChannel" },
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
