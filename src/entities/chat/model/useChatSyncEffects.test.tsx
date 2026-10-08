import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChatSyncEffects } from "./useChatSyncEffects";

function uiActions() {
  return {
    ensureActiveChannel: vi.fn(),
    ensureActiveThread: vi.fn(),
    leaveEmptyDmView: vi.fn(),
    clearDraftDirectThread: vi.fn(),
    setActiveThreadId: vi.fn(),
    clearRoutedHash: vi.fn(),
    openLinkedMessage: vi.fn(),
    setPendingScrollMessageId: vi.fn(),
    refreshRecentVoiceJoin: vi.fn(),
    archiveJoinedMediaRoom: vi.fn(),
    markDirectThreadRead: vi.fn()
  } as any;
}

function syncInput(options: Record<string, unknown> = {}) {
  return {
    live: { actor: { memberId: "alice" }, dispatch: vi.fn().mockResolvedValue({ ok: true }) },
    channels: [{ id: "general" }],
    currentChannelId: "general",
    feedMessages: [{ id: "channel-message", channelId: "general", createdAt: 20 }],
    showingDm: false,
    state: { members: { alice: { readTags: {} } }, messages: {}, directMessages: {}, rooms: [] },
    threads: [],
    ui: uiActions(),
    ...options
  } as any;
}

describe("visible chat read cursors", () => {
  it("uses the app read-tag operation for a visible channel", () => {
    const input = syncInput();
    renderHook(() => useChatSyncEffects(input));
    expect(input.live.dispatch).toHaveBeenCalledWith("read.tag.set", expect.objectContaining({
      scopeType: "channel",
      scopeId: "general",
      messageId: "channel-message",
      operationId: "channel-message"
    }));
  });

  it("uses the app read-tag operation for a visible direct thread", () => {
    const input = syncInput({
      currentChannelId: undefined,
      currentThreadId: "thread-1",
      showingDm: true,
      feedMessages: [],
      state: {
        members: { alice: { readTags: {} } },
        messages: {},
        directMessages: {
          "direct-message": { id: "direct-message", protocol: "matterhorn.direct.v1", threadId: "thread-1", createdAt: 30 }
        },
        rooms: []
      }
    });
    renderHook(() => useChatSyncEffects(input));
    expect(input.live.dispatch).toHaveBeenCalledWith("read.tag.set", expect.objectContaining({
      scopeType: "direct.thread",
      scopeId: "thread-1",
      messageId: "direct-message",
      operationId: "direct-message"
    }));
  });
});
