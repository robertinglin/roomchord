import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { draftDirectThreadForUsers } from "@entities/chat/model/chatViewModel";
import { useChatViewData, type ChatViewDataInput } from "@entities/chat/model/useChatViewData";

function liveFixture(directGroups: unknown[] = []) {
  const state: any = {
    channels: [{ id: "general", name: "general", topic: "General", archivedAt: null }],
    members: {
      alice: { memberId: "alice", displayName: "Alice" },
      bob: { memberId: "bob", displayName: "Bob" },
      carol: { memberId: "carol", displayName: "Carol" }
    },
    presence: {},
    messages: {},
    directMessages: {},
    directThreads: {},
    rooms: [],
    embeds: {},
    comments: {},
    commentThreads: {}
  };
  return {
    actor: { memberId: "alice", role: "member", displayName: "Alice" },
    envelope: { room: { id: "room-1", name: "Room" } },
    state,
    can: vi.fn(() => true),
    getDMs: vi.fn(async () => directGroups),
    subscribeDMs: vi.fn(() => () => undefined),
    notifications: undefined,
    permissions: {},
    select: {
      channels: () => state.channels,
      records: () => [],
      embedsByScope: () => [],
      messagesByChannel: () => []
    }
  } as any;
}

function input(live: any, draftDirectThread?: any): ChatViewDataInput {
  return {
    activeView: "channel",
    closedDirectThreads: {},
    draftDirectThread,
    live,
    media: { sfu: { mediaRoomId: undefined } } as any,
    memberPreferences: {},
    readAtByThread: {},
    voicePreferences: { muted: false, deafened: false },
    voiceSettingsOpen: false
  };
}

describe("direct-message view projection", () => {
  it("keeps a named empty group thread visible", async () => {
    const live = liveFixture([{
      thread: {
        id: "group-1",
        userIds: ["alice", "bob", "carol"],
        name: "Launch team",
        topic: null,
        createdAt: 1,
        archivedAt: null,
        ownerId: "alice"
      },
      messages: []
    }]);

    const { result } = renderHook(() => useChatViewData(input(live)));
    await waitFor(() => expect(result.current.threads).toHaveLength(1));
    expect(result.current.threads[0]).toMatchObject({ id: "group-1", name: "Launch team" });
  });

  it("keeps an empty one-to-one reservation as a local draft", async () => {
    const live = liveFixture();
    const draft = draftDirectThreadForUsers("alice", ["bob"], "reserved-dm")!;
    const { result } = renderHook(() => useChatViewData(input(live, draft)));
    await waitFor(() => expect(result.current.threads).toHaveLength(1));
    expect(result.current.threads[0]).toMatchObject({ id: "reserved-dm", userIds: ["alice", "bob"] });
  });

  it("projects archived, closed, ignored, and active-call scopes with room access", async () => {
    const live = liveFixture([
      { thread: { id: "group-1", userIds: ["alice", "bob", "carol"], name: "Launch", topic: null, createdAt: 1, archivedAt: null, ownerId: "alice" }, messages: [] },
      { thread: { id: "empty", userIds: ["alice", "bob"], topic: null, createdAt: 1, archivedAt: null }, messages: [] },
      { thread: { id: "archived", userIds: ["alice", "bob"], topic: null, createdAt: 1, archivedAt: 1 }, messages: [{ id: "old", authorId: "bob", createdAt: 2 }] },
      { thread: { id: "closed", userIds: ["alice", "carol"], topic: null, createdAt: 1, archivedAt: null }, messages: [{ id: "closed-message", authorId: "bob", createdAt: 10 }] },
      { thread: { id: "dm-1", userIds: ["alice", "bob"], topic: "Private", createdAt: 1, archivedAt: null }, unreadCount: 2, messages: [
        { id: "dm-old", authorId: "bob", createdAt: 2 },
        { id: "dm-new", authorId: "bob", createdAt: 12 },
        { id: "dm-self", authorId: "alice", createdAt: 13 }
      ] }
    ]);
    live.state.directMessages = {
      "closed-message": { id: "closed-message", threadId: "closed", authorId: "bob", createdAt: 10 },
      "dm-old": { id: "dm-old", threadId: "dm-1", authorId: "bob", createdAt: 2 },
      "dm-new": { id: "dm-new", threadId: "dm-1", authorId: "bob", createdAt: 12 },
      "dm-self": { id: "dm-self", threadId: "dm-1", authorId: "alice", createdAt: 13 }
    };
    live.state.directThreads = {
      closed: { id: "closed", userIds: ["alice", "carol"], topic: null, createdAt: 1, archivedAt: null },
      "dm-1": { id: "dm-1", userIds: ["alice", "bob"], topic: "Private", createdAt: 1, archivedAt: null }
    };
    live.state.messages = {
      m1: { id: "m1", channelId: "general", authorId: "bob", createdAt: 10 },
      m2: { id: "m2", channelId: "general", authorId: "bob", createdAt: 11, deletedAt: 12 }
    };
    live.state.channels = [
      { id: "general", name: "general", topic: "General", archivedAt: null },
      { id: "old", name: "old", topic: "Old", archivedAt: 1 }
    ];
    live.state.commentThreads = { thread: { id: "thread", scopeType: "channel", scopeId: "general", createdAt: 1 } };
    live.state.rooms = [
      { id: "hidden-room", archivedAt: null, roleAccess: { admin: "editor" } },
      { id: "editor-room", archivedAt: null, roleAccess: { member: "editor" } },
      { id: "archived-room", archivedAt: 1, roleAccess: { member: "editor" } }
    ];
    live.select.channels = () => live.state.channels;
    live.select.records = () => live.state.rooms;
    live.select.embedsByScope = () => [{ id: "embed-1" }];
    live.select.messagesByChannel = () => Object.values(live.state.messages);
    live.permissions = { roomAccessLevel: (room: any) => room.id === "hidden-room" ? "hidden" : room.id === "editor-room" ? "editor" : undefined };
    live.notifications = { getReadCursor: () => 5 };
    live.can = vi.fn((capability: string) => ["messageSend", "directMessageSend"].includes(capability));
    const draft = draftDirectThreadForUsers("alice", ["erin"], "draft-erin")!;
    const { result } = renderHook(() => useChatViewData({
      ...input(live, draft),
      activeDirectCallMemberIds: ["dave"],
      activeThreadId: "group-1",
      closedDirectThreads: { closed: 20 },
      readAtByThread: { "dm-1": 5 },
      activeView: "channel",
      joinedMediaRoomId: undefined,
      recentVoiceJoin: { roomId: "editor-room", media: { audio: true, video: false }, joinedAt: 1 },
      selectedMediaRoomId: "editor-room",
      voicePreferences: { muted: false, deafened: false },
      voiceSettingsOpen: true
    }));

    await waitFor(() => expect(result.current.threads.map((thread) => thread.id)).toEqual(["group-1", "dm-1", "draft-erin", "dm_alice__dave"]));
    expect(result.current.channels).toHaveLength(1);
    expect(result.current.currentChannelId).toBe("general");
    expect(result.current.feedMessages).toHaveLength(1);
    expect(result.current.threadsForChannel).toHaveLength(1);
    expect(result.current.unreadCounts["dm-1"]).toBe(1);
    expect(result.current.unreadCounts["group-1"]).toBe(0);
    expect(result.current.topicUnreadCounts["channel:general"]).toBe(1);
    expect(result.current.effectiveVoicePreferences.deafened).toBe(true);
    expect(result.current.reconnectRoom?.id).toBe("editor-room");
    expect(result.current.visibleRooms.map((room) => room.id)).toEqual(["editor-room"]);
  });

  it("renders a DM feed and handles ignored members and unavailable channels", async () => {
    const live = liveFixture([{ thread: { id: "dm-1", userIds: ["alice", "bob"], topic: null, createdAt: 1, archivedAt: null }, unreadCount: 3, messages: [{ id: "dm", authorId: "bob", createdAt: 5 }] }]);
    live.state.channels = [];
    live.state.members.alice.readTags = {};
    live.state.guests = { alice: { chatDisabled: true } };
    live.permissions = { roomAccessLevel: () => "hidden" };
    const { result } = renderHook(() => useChatViewData({
      ...input(live),
      activeView: "dm",
      activeThreadId: "dm-1",
      memberPreferences: { bob: { ignored: true } },
      readAtByThread: { "dm-1": 0 },
      voicePreferences: { muted: true, deafened: false },
      voiceSettingsOpen: false
    }));
    await waitFor(() => expect(result.current.showingDm).toBe(true));
    expect(result.current.feedTitle).toContain("Bob");
    expect(result.current.feedSubtitle).toBe("Direct message");
    expect(result.current.unreadCounts["dm-1"]).toBe(0);
    expect(result.current.actorChatDisabled).toBe(true);
    expect(result.current.currentChannelId).toBeUndefined();
    expect(result.current.actorCanSendMessages).toBe(true);
    expect(result.current.showingMediaRoom).toBe(false);
  });
});
