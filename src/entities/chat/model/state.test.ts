import { describe, expect, it } from "vitest";
import {
  activeScreenShareCount,
  channelEmbeds,
  channelMessages,
  channelThreads,
  directMessages,
  directThreadIdForUsers,
  emptyChatState,
  isCoreDirectMessage,
  isCoreDirectThread,
  joinRequestsForState,
  latestDirectMessageTime,
  memberChatDisabled,
  memberModerationFor,
  normalizeUserIds,
  participantCount,
  publicInvitesForState,
  reactionCount,
  scopedReactionCount
} from "@entities/chat/model/state";

describe("chat state projections", () => {
  it("creates the complete empty shape and normalizes direct participants", () => {
    const state = emptyChatState();
    expect(state.channels).toEqual([]);
    expect(normalizeUserIds([" bob ", "alice", "bob", ""])).toEqual(["alice", "bob"]);
    expect(directThreadIdForUsers(["bob", "alice"])).toBe("dm_alice__bob");
    expect(isCoreDirectThread({})).toBe(true);
    expect(isCoreDirectThread({ protocol: "other" })).toBe(false);
    expect(isCoreDirectMessage({})).toBe(true);
    expect(isCoreDirectMessage({ protocol: "other" })).toBe(false);
  });

  it("projects visible channels and direct messages while hiding tombstones and legacy records", () => {
    const state = {
      messages: {
        old: { id: "old", channelId: "general", body: "old", createdAt: 1, deletedAt: null },
        removed: { id: "removed", channelId: "general", body: "removed", createdAt: 2, deletedAt: 3 },
        latest: { id: "latest", channelId: "general", body: "latest", createdAt: 4, deletedAt: null },
      },
      directMessages: {
        dm: { id: "dm", threadId: "direct-1", body: "hello", createdAt: 2 },
        legacy: { id: "legacy", threadId: "direct-1", protocol: "legacy", body: "no", createdAt: 3 },
        deleted: { id: "deleted", threadId: "direct-1", body: "gone", createdAt: 4, deletedAt: 5 },
      },
    } as never;

    expect(channelMessages(state, "general").map((message) => message.id)).toEqual(["old", "removed", "latest"]);
    expect(channelMessages(state).length).toBe(0);
    expect(directMessages(state, "direct-1").map((message) => message.id)).toEqual(["dm"]);
    expect(directMessages(state).length).toBe(0);
    expect(latestDirectMessageTime(state, "direct-1")).toBe(2);
    expect(latestDirectMessageTime(state)).toBe(0);
  });

  it("projects scoped embeds, threads, reactions, members, and rooms", () => {
    const state = {
      embeds: {
        current: { id: "current", scopeType: "channel", scopeId: "general", addedAt: 5 },
        removed: { id: "removed", scopeType: "channel", scopeId: "general", removedAt: 6, addedAt: 9 },
      },
      commentThreads: {
        current: { id: "current", scopeType: "channel", scopeId: "general", createdAt: 2, lastCommentAt: 4 },
        other: { id: "other", scopeType: "channel", scopeId: "other", createdAt: 9 },
      },
      screenShares: {
        active: { roomId: "media", stoppedAt: null },
        stopped: { roomId: "media", stoppedAt: 9 },
        other: { roomId: "other", stoppedAt: null },
      },
      guests: { lee: { memberId: "lee", chatDisabled: true }, bob: { memberId: "bob", bannedAt: 4 } },
      publicInvites: [{ id: "invite" }],
      joinRequests: { request: { id: "request" } },
    } as never;

    expect(channelEmbeds(state, "general").map((embed) => embed.id)).toEqual(["current"]);
    expect(channelEmbeds(state).length).toBe(0);
    expect(channelThreads(state, "general").map((thread) => thread.id)).toEqual(["current"]);
    expect(channelThreads(state).length).toBe(0);
    expect(activeScreenShareCount(state, "media")).toBe(1);
    expect(activeScreenShareCount(state)).toBe(2);
    expect(participantCount({ participants: ["a", "b"] })).toBe(2);
    expect(participantCount({ participants: { a: {}, b: {} } })).toBe(2);
    expect(reactionCount({ "👍": ["alice", "bob"] })).toBe(2);
    expect(reactionCount()).toBe(0);
    expect(scopedReactionCount({ reactions: { "👍": ["alice"] } } as never)).toBe(1);
    expect(memberModerationFor(state, "lee")).toMatchObject({ chatDisabled: true });
    expect(memberModerationFor(state)).toBeUndefined();
    expect(memberChatDisabled(state, "lee")).toBe(true);
    expect(memberChatDisabled(state, "missing")).toBe(false);
    expect(publicInvitesForState(state)).toHaveLength(1);
    expect(joinRequestsForState(state)).toHaveLength(1);
  });

  it("handles sparse projections, scoped shares, and sorting fallbacks", () => {
    const sparse = {} as never;
    expect(memberModerationFor(sparse, "missing")).toBeUndefined();
    expect(memberChatDisabled(sparse, "missing")).toBe(false);
    expect(publicInvitesForState(sparse)).toEqual([]);
    expect(joinRequestsForState(sparse)).toEqual([]);
    expect(channelMessages(sparse, "general")).toEqual([]);
    expect(directMessages(sparse, "thread-1")).toEqual([]);
    expect(channelEmbeds(sparse, "general")).toEqual([]);
    expect(channelThreads(sparse, "general")).toEqual([]);

    const state = {
      guests: { banned: { memberId: "banned", bannedAt: 1 } },
      directMessages: {
        later: { id: "later", threadId: "thread-1", body: "later", createdAt: 9 },
        earlier: { id: "earlier", threadId: "thread-1", body: "earlier", createdAt: 1 },
        noTimestamp: { id: "noTimestamp", threadId: "thread-1", body: "first" },
      },
      screenShares: {
        scoped: { roomId: "other", scopeId: "channel-1", stoppedAt: null },
        stopped: { roomId: "media", stoppedAt: 10 },
      },
      embeds: {
        newest: { id: "newest", scopeType: "channel", scopeId: "general", addedAt: 8 },
        oldest: { id: "oldest", scopeType: "channel", scopeId: "general" },
      },
      commentThreads: {
        recent: { id: "recent", scopeType: "channel", scopeId: "general", lastCommentAt: 8, createdAt: 1 },
        created: { id: "created", scopeType: "channel", scopeId: "general", createdAt: 4 },
      },
    } as never;

    expect(memberChatDisabled(state, "banned")).toBe(true);
    expect(directMessages(state, "thread-1").map((message) => message.id)).toEqual(["noTimestamp", "earlier", "later"]);
    expect(latestDirectMessageTime(state, "thread-1")).toBe(9);
    expect(activeScreenShareCount(state, "channel-1")).toBe(1);
    expect(channelEmbeds(state, "general").map((embed) => embed.id)).toEqual(["newest", "oldest"]);
    expect(channelThreads(state, "general").map((thread) => thread.id)).toEqual(["recent", "created"]);
    expect(participantCount({})).toBe(0);
    expect(scopedReactionCount({} as never)).toBe(0);
  });
});
