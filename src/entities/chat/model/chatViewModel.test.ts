import { describe, expect, it } from "vitest";
import {
  avatarForActor,
  authoritativeMemberOptions,
  canDeleteMessage,
  channelFeed,
  directThreadForUsers,
  draftDirectThreadForUsers,
  hasDirectMessages,
  isMessageAuthor,
  linkedMessageLocation,
  memberAvatarsForState,
  memberNamesForState,
  messageEmbeds,
  forwardTargetsForState
} from "@entities/chat/model/chatViewModel";

describe("forward targets", () => {
  it("preserves the committed Matterhorn direct-thread id", () => {
    const targets = forwardTargetsForState({
      activeView: "channel",
      actorId: "alice",
      channels: [{ id: "general", name: "general" }],
      memberNamesById: { bob: "Bob" },
      state: {
        members: { alice: { id: "alice" }, bob: { id: "bob" } },
        presence: {},
        directThreads: { authoritative: { id: "direct_7f", userIds: ["alice", "bob"], topicKey: "project:bob" } }
      } as any
    });

    expect(targets.find((target) => target.type === "dm")).toMatchObject({
      threadId: "direct_7f",
      topicKey: "project:bob",
      userIds: ["alice", "bob"]
    });
  });

  it("filters the active, revoked, banned, and duplicate member targets", () => {
    const targets = forwardTargetsForState({
      activeView: "dm",
      activeThreadId: "direct_7f",
      actorId: "alice",
      channels: [{ id: "general", name: "general" }, { id: "random", name: "random" }],
      memberNamesById: { bob: "Bob", carol: "Carol", dave: "Dave" },
      state: {
        members: {
          alice: { id: "alice" },
          bob: { id: "bob" },
          carol: { id: "carol", revokedAt: 1 },
          dave: { id: "dave", bannedAt: 1 }
        },
        presence: { alice: { memberId: "alice" }, bob: { memberId: "bob" } },
        directThreads: { authoritative: { id: "direct_7f", userIds: ["alice", "bob"] } }
      } as any
    });

    expect(targets.filter((target) => target.type === "channel")).toHaveLength(2);
    expect(targets.filter((target) => target.type === "dm")).toHaveLength(0);
  });

  it("leaves a new DM target uncommitted for Matterhorn reservation", () => {
    const targets = forwardTargetsForState({
      activeView: "channel",
      actorId: "alice",
      channels: [],
      memberNamesById: { bob: "Bob" },
      state: {
        members: { alice: { id: "alice" }, bob: { id: "bob" } },
        presence: {},
        directThreads: {}
      } as any
    });

    const target = targets.find((item) => item.type === "dm");
    expect(target).toMatchObject({ userIds: ["alice", "bob"] });
    expect(target && "threadId" in target ? target.threadId : undefined).toBeUndefined();
  });
});

describe("chat view projections", () => {
  const actor = { memberId: "alice", displayName: "Alice", avatarUrl: "alice.png" } as any;
  const state = {
    members: {
      alice: { memberId: "alice", displayName: "Alice", avatarUrl: "alice.png" },
      bob: { memberId: "bob", displayName: "Bob", avatar: "bob.png" }
    },
    presence: { bob: { memberId: "bob", status: "online", avatarUrl: "presence.png" } },
    messages: {
      channelMessage: { id: "channelMessage", channelId: "general", body: "hello", deletedAt: null }
    },
    directMessages: {
      dmMessage: { id: "dmMessage", threadId: "direct_7f", body: "private", deletedAt: null },
      deleted: { id: "deleted", threadId: "direct_7f", body: "gone", deletedAt: 4 }
    },
    directThreads: { authoritative: { id: "direct_7f", userIds: ["alice", "bob"] } },
    channels: [{ id: "general", name: "general" }],
    embeds: {},
    comments: {},
    commentThreads: {}
  } as any;

  it("projects names, avatars, author checks, and direct-thread presence", () => {
    expect(memberNamesForState(state, actor, { bob: { nickname: "Bobby" } } as any)).toMatchObject({ alice: "Alice", bob: "Bobby" });
    expect(memberAvatarsForState(state, actor)).toMatchObject({ alice: "alice.png", bob: "presence.png" });
    expect(avatarForActor(actor)).toBe("alice.png");
    expect(isMessageAuthor(actor, { authorId: "alice" } as any)).toBe(true);
    expect(canDeleteMessage(actor, { authorId: "bob" } as any, false)).toBe(false);
    expect(canDeleteMessage(actor, { authorId: "bob" } as any, true)).toBe(true);
    expect(hasDirectMessages(state, "direct_7f")).toBe(true);
    expect(directThreadForUsers(state, ["bob", "alice"])).toMatchObject({ id: "direct_7f" });
    expect(draftDirectThreadForUsers("alice", ["alice"])).toBeUndefined();
    expect(draftDirectThreadForUsers("alice", ["bob"], "reserved")).toMatchObject({ id: "reserved" });
  });

  it("derives member choices from authoritative room members", () => {
    const names = { alice: "Alice", bob: "Bob", ghost: "Ghost", unnamed: "unnamed", revoked: "Revoked", banned: "Banned", left: "Left" };
    const memberChoices = authoritativeMemberOptions({
      members: {
        alice: { id: "alice" },
        bob: { id: "bob" },
        unnamed: { id: "unnamed" },
        revoked: { id: "revoked", revokedAt: 1 },
        banned: { id: "banned", bannedAt: 1 },
        left: { id: "left", status: "left" }
      },
      presence: {
        ghost: { memberId: "ghost", name: "Ghost" }
      }
    } as any, names);

    expect(memberChoices).toEqual([
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" }
    ]);
    expect(memberChoices.find((member) => member.id === "ghost")).toBeUndefined();
  });

  it("deduplicates embeds and resolves channel/direct links", () => {
    expect(messageEmbeds("[one](https://example.test) [two](https://example.test)")).toHaveLength(1);
    expect(linkedMessageLocation(state, "#channelMessage", () => "channelMessage")).toEqual({ messageId: "channelMessage", view: "channel", channelId: "general" });
    expect(linkedMessageLocation(state, "#dmMessage", () => "dmMessage")).toEqual({ messageId: "dmMessage", view: "dm", threadId: "direct_7f" });
    expect(linkedMessageLocation(state, "#deleted", () => "deleted")).toBeUndefined();
    expect(linkedMessageLocation(state, "#missing", () => undefined)).toBeUndefined();
  });

  it("projects channel feeds and handles missing channel ids", () => {
    expect(channelFeed(state, "general")).toEqual(expect.objectContaining({ messages: expect.any(Array), embeds: expect.any(Array), threads: expect.any(Array) }));
    expect(channelFeed(state)).toEqual(expect.objectContaining({ messages: [], embeds: [], threads: [] }));
  });
});
