import { describe, expect, it } from "vitest";
import { createChatUiStore } from "./chatUiStore";

function store() {
  return createChatUiStore({
    storageKeys: {
      closedDirectThreads: "test:closed",
      memberPreferences: "test:members",
      readAtByThread: "test:read",
      voicePreferences: "test:voice",
      voiceReconnect: "test:reconnect"
    }
  });
}

describe("chat UI store", () => {
  it("covers navigation, call, media, and composer actions", () => {
    const current = store();
    const actions = current.getState().actions;
    const thread = { id: "dm-1", userIds: ["alice", "bob"], topic: null, createdAt: 1, archivedAt: null } as any;

    actions.setSidebarOpen(true);
    actions.closeSidebar();
    actions.setActiveView("media");
    actions.setJoinedMediaRoomId("voice-1");
    actions.setSelectedMediaRoomId("voice-1");
    actions.holdDirectCall("voice-1");
    actions.clearDirectCallHold("other");
    actions.clearDirectCallHold("voice-1");
    actions.holdMediaRoom("voice-1");
    actions.holdMediaRoom("voice-2");
    actions.clearMediaRoomHold("missing");
    actions.clearMediaRoomHold("voice-1");
    actions.setLocalMediaSettings({ audio: false, video: true });
    actions.setVoiceSettingsOpen(true);
    actions.setPendingScrollMessageId("message-1");
    actions.queueComposerText("hello");
    actions.bumpComposerFocus();
    actions.setActiveThreadId("dm-1");
    actions.selectChannel("general");
    actions.selectMediaRoom("voice-2");
    actions.selectDirectThread("dm-1");
    actions.setActiveView("dm");
    actions.ensureActiveChannel();
    actions.ensureActiveThread();
    actions.ensureActiveChannel("fallback");
    actions.ensureActiveThread("fallback-thread");
    actions.openDraftDirectThread(thread);
    actions.clearDraftDirectThread("other");
    actions.clearDraftDirectThread("dm-1");
    actions.archiveJoinedMediaRoom("other");
    actions.archiveJoinedMediaRoom("voice-1");
    actions.setJoinedMediaRoomId("voice-3");
    actions.archiveJoinedMediaRoom("voice-3");
    actions.leaveEmptyDmView(true);
    actions.setActiveView("dm");
    actions.leaveEmptyDmView(false);
    actions.closeManageDialog();
    actions.openManageDialog("members", "bob");
    expect(current.getState().manageDialog).toEqual({ tab: "members", memberId: "bob", channelId: undefined, roomId: undefined });
    actions.openManageDialog("channels", "general");
    expect(current.getState().manageDialog).toEqual({ tab: "channels", memberId: undefined, channelId: "general", roomId: undefined });
    actions.openManageDialog("voice", "voice-1");
    expect(current.getState().manageDialog).toEqual({ tab: "voice", memberId: undefined, channelId: undefined, roomId: "voice-1" });
    actions.openMemberProfileDialog("carol");
    actions.setSidebarOpen(false);
    actions.setSelectedMediaRoomId(undefined);

    expect(current.getState()).toMatchObject({
      activeView: "channel",
      activeChannelId: "general",
      pendingComposerText: { text: "hello" },
      selectedMediaRoomId: undefined,
      sidebarOpen: false
    });
  });

  it("covers thread closure, read cursors, member preferences, voice state, and routed links", () => {
    const current = store();
    const actions = current.getState().actions;
    const thread = { id: "dm-1", userIds: ["alice", "bob"], topic: null, createdAt: 1, archivedAt: null } as any;
    actions.openDraftDirectThread(thread);
    actions.closeDirectThread({ threadId: "other", latestMessageAt: 3, nextThreadId: "dm-2" });
    actions.closeDirectThread({ threadId: "dm-1", latestMessageAt: 4 });
    actions.markDirectThreadRead("dm-1", 1);
    actions.markDirectThreadRead("dm-1", 2);
    actions.markDirectThreadRead("dm-1", 1);
    actions.showDirectThread("missing");
    actions.showDirectThread("dm-1");
    actions.setMemberBlock("bob", true);
    actions.setMemberBlock("bob", false);
    actions.setMemberIgnore("bob", true);
    actions.setMemberIgnore("bob", false);
    actions.setMemberNickname("bob", " Bobby ");
    actions.setMemberNickname("bob", "   ");
    actions.setMemberNote("bob", "note");
    actions.setMemberNote("bob", null);
    actions.toggleVoiceParticipantMute("bob");
    actions.toggleVoiceParticipantMute("bob");
    actions.updateVoicePreferences({ muted: true, deafened: true });
    actions.rememberVoiceJoin("voice-1", { audio: true, video: false }, 10);
    actions.refreshRecentVoiceJoin();
    actions.clearVoiceJoin();
    actions.dismissReconnect();
    actions.openLinkedMessage({ view: "channel", channelId: "general", messageId: "m1" } as any, "#general/m1");
    actions.openLinkedMessage({ view: "channel", channelId: "random", messageId: "m2" } as any, "#random/m2");
    actions.openLinkedMessage({ view: "dm", threadId: "dm-2", messageId: "m3" } as any, "dm-2/m3");
    actions.openLinkedMessage({ view: "dm", threadId: "dm-2", messageId: "m3" } as any, "dm-2/m3");
    actions.clearRoutedHash();
    expect(current.getState().memberPreferences.bob).toBeUndefined();
    expect(current.getState().readAtByThread["dm-1"]).toBe(2);
    expect(current.getState().recentVoiceJoin).toBeUndefined();
    expect(current.getState().pendingScrollMessageId).toBe("m3");
  });
});
