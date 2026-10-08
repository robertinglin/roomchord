import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRuntimeProvider, useChatRuntime } from "@entities/chat/model/chatRuntime";

const store = {
  activeChannelId: "general", activeThreadId: undefined as string | undefined, activeView: "channel" as "channel" | "dm",
  closedDirectThreads: [], draftDirectThread: undefined, heldDirectCallRoomId: undefined as string | undefined,
  heldMediaRoomIds: {}, joinedMediaRoomId: undefined as string | undefined, localMediaSettings: { audio: true, video: false, screen: false },
  memberPreferences: {}, pendingScrollMessageId: undefined, readAtByThread: {}, recentVoiceJoin: undefined,
  selectedMediaRoomId: undefined as string | undefined, voicePreferences: { muted: false, deafened: false }, voiceSettingsOpen: false
};
let directOptions: any;
let mediaOptions: any;
let viewOptions: any;
const ui = {
  clearDirectCallHold: vi.fn(), clearVoiceJoin: vi.fn(), holdMediaRoom: vi.fn(), rememberVoiceJoin: vi.fn(),
  setJoinedMediaRoomId: vi.fn()
};
const media = {
  canSwapCamera: true, leaveRoom: vi.fn(), sfu: { mediaRoomId: "room-1", status: "connected", media: { audio: true, video: false, screen: false } },
  updateRoomMedia: vi.fn(), voiceTokens: []
};
const directCalls = {
  clientId: "client-1", memberIds: ["alice", "bob"], state: { directRoomId: undefined, status: "idle" }, updateMedia: vi.fn()
};
const view = {
  channels: [], currentChannelId: "general", currentThreadId: undefined, feedMessages: [], showingDm: false,
  threads: [], actorName: "Alice", actorCanDirectMessage: true, feedTitle: "# general", feedSubtitle: "Topic",
  actorChatDisabled: false, actorCanSendMessages: true, memberNamesById: {}, threadsForChannel: [], effectiveVoicePreferences: store.voicePreferences,
  selectedMediaRoom: undefined, joinedMediaRoomId: undefined, activeScreenShares: [], activeThread: undefined
};
const live: any = {
  actor: { memberId: "alice", role: "member" }, state: { rooms: [{ id: "room-1", name: "Lounge" }] }, media: {},
  can: vi.fn(() => true),
  notificationPreferences: {
    load: vi.fn().mockResolvedValue({ kind: "matterhorn.notification-preferences.v1", version: 1, ownerId: "alice", revision: 0, updatedAt: 1, preferences: {}, followedThreads: {} }),
    get: vi.fn(), resolve: vi.fn(), upsert: vi.fn(), clear: vi.fn(), followThread: vi.fn(), unfollowThread: vi.fn(), isThreadFollowed: vi.fn(() => false),
    subscribe: vi.fn((listener) => { listener({ kind: "matterhorn.notification-preferences.v1", version: 1, ownerId: "alice", revision: 0, updatedAt: 1, preferences: {}, followedThreads: {} }); return vi.fn(); })
  },
  personal: {
    load: vi.fn().mockResolvedValue({}),
    bookmarks: vi.fn().mockResolvedValue([]),
    reminders: vi.fn().mockResolvedValue([]),
    addBookmark: vi.fn(), removeBookmark: vi.fn(), addReminder: vi.fn(), scheduleReminder: vi.fn(),
    markReminderRead: vi.fn(), completeReminder: vi.fn(), removeReminder: vi.fn()
  }
};

vi.mock("@entities/chat/model/chatUiStore", () => ({
  useChatUiActions: () => ui,
  useChatUiStore: (selector: (value: typeof store) => unknown) => selector(store)
}));
vi.mock("@entities/chat/model/useChatMediaRooms", () => ({
  useChatMediaRooms: (options: any) => { mediaOptions = options; return media; }
}));
vi.mock("@entities/chat/model/useChatDirectCalls", () => ({
  useChatDirectCalls: (options: any) => { directOptions = options; return directCalls; }
}));
vi.mock("@entities/chat/model/useChatViewData", () => ({
  useChatViewData: (options: any) => { viewOptions = options; return view; }
}));
vi.mock("@entities/chat/model/chatActions", () => ({ chatActionHandlers: vi.fn(() => ({ voiceModeration: undefined })) }));
vi.mock("@entities/chat/model/useChatNotifications", () => ({ useChatNotifications: vi.fn() }));
vi.mock("@entities/chat/model/useChatSyncEffects", () => ({ useChatSyncEffects: vi.fn() }));
vi.mock("@entities/chat/model/voiceModeration", () => ({ useVoiceModerationState: vi.fn(() => undefined) }));
vi.mock("@shared/ui/CallSwitchDialog", () => ({
  CallSwitchDialog: ({ onCancel, onEnd, onHold }: any) => <div role="dialog"><button onClick={onCancel}>cancel switch</button><button onClick={onEnd}>end switch</button><button onClick={onHold}>hold switch</button></div>
}));

function Harness() {
  const runtime = useChatRuntime();
  return <>
    <output data-testid="room">{runtime.roomName}</output>
    <output data-testid="view">{runtime.view.showingDm ? "dm" : "channel"}</output>
    <button onClick={() => directOptions.onBeforeAccept()}>before accept</button>
  </>;
}

function renderRuntime() {
  return render(<ChatRuntimeProvider live={live} roomName="room-one"><Harness /></ChatRuntimeProvider>);
}

describe("ChatRuntimeProvider composition", () => {
  beforeEach(() => {
    Object.assign(store, { activeChannelId: "general", activeThreadId: undefined, activeView: "channel", heldDirectCallRoomId: undefined, joinedMediaRoomId: undefined, selectedMediaRoomId: undefined });
    Object.assign(directCalls, { state: { directRoomId: undefined, status: "idle" } });
    Object.assign(media, { sfu: { mediaRoomId: "room-1", status: "connected", media: { audio: true, video: false, screen: false } } });
    live.state = { rooms: [{ id: "room-1", name: "Lounge" }] };
    ui.clearDirectCallHold.mockClear(); ui.holdMediaRoom.mockClear(); ui.clearVoiceJoin.mockClear(); media.updateRoomMedia.mockClear();
  });

  it("composes channel state and forwards media/view synchronization inputs", () => {
    renderRuntime();
    expect(screen.getByTestId("room")).toHaveTextContent("room-one");
    expect(screen.getByTestId("view")).toHaveTextContent("channel");
    expect(viewOptions).toMatchObject({ activeChannelId: "general", activeView: "channel", live });
    expect(mediaOptions.roomName).toBe("room-one");
  });

  it("handles direct-call switching cancel, hold, and leave decisions", async () => {
    renderRuntime();
    let decision: Promise<boolean>;
    act(() => { decision = directOptions.onBeforeAccept(); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "cancel switch" }));
    await act(async () => { await decision; });

    act(() => { decision = directOptions.onBeforeAccept(); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "hold switch" }));
    await act(async () => { await decision; });
    expect(ui.holdMediaRoom).toHaveBeenCalledWith("room-1");

    act(() => { decision = directOptions.onBeforeAccept(); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "end switch" }));
    await act(async () => { await decision; });
    expect(media.leaveRoom).toHaveBeenCalled();
    expect(ui.clearVoiceJoin).toHaveBeenCalled();
  });

  it("exposes authoritative incoming hold/leave/decline actions", () => {
    renderRuntime();
    const actions = directOptions.incomingActions();
    expect(actions).toHaveLength(3);
    const accept = { accept: vi.fn() };
    actions[0].onSelect({}, accept);
    actions[1].onSelect({}, accept);
    actions[2].onSelect({}, { decline: vi.fn() });
    expect(ui.holdMediaRoom).toHaveBeenCalled();
    expect(media.leaveRoom).toHaveBeenCalled();
    expect(directOptions.onBeforeAccept()).resolves.toBe(true);
  });

  it("fails open to direct calls when no listed media room is active", async () => {
    media.sfu = { mediaRoomId: "missing", status: "idle", media: undefined };
    renderRuntime();
    expect(directOptions.incomingActions()).toBeUndefined();
    await expect(directOptions.onBeforeAccept()).resolves.toBe(true);
  });

  it("clears a stale held direct-call room and supports media-room view inputs", async () => {
    store.heldDirectCallRoomId = "stale-call";
    store.activeView = "dm";
    store.activeThreadId = "thread-1";
    store.selectedMediaRoomId = "room-1";
    view.showingDm = true;
    view.selectedMediaRoom = { id: "room-1", name: "Lounge", allowsVideo: true };
    directCalls.state = { directRoomId: "other-call", status: "connected" };
    renderRuntime();
    await waitFor(() => expect(ui.clearDirectCallHold).toHaveBeenCalledWith("stale-call"), { timeout: 1000 });
    expect(viewOptions).toMatchObject({ activeView: "dm", activeThreadId: "thread-1", selectedMediaRoomId: "room-1" });
  });
});
