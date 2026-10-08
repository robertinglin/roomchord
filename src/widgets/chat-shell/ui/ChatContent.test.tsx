import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatContent } from "@widgets/chat-shell/ui/ChatContent";

const uiStore = { composerFocusKey: 1, heldDirectCallRoomId: undefined, heldMediaRoomIds: {}, localMediaSettings: { audio: true, video: false, screen: false }, mutedVoiceParticipantIds: [], pendingComposerText: undefined, sidebarOpen: false };
const ui = { clearDirectCallHold: vi.fn(), clearMediaRoomHold: vi.fn(), selectChannel: vi.fn(), setSidebarOpen: vi.fn(), toggleVoiceParticipantMute: vi.fn() };
const actions: any = {
  addThreadComment: vi.fn(), createCommentThread: vi.fn(async () => "thread-1"), deleteMessage: vi.fn(async () => true), editMessage: vi.fn(),
  forwardMessage: vi.fn(async () => true), leaveMediaRoom: vi.fn(), openDirectThreadForMember: vi.fn(), pinMessage: vi.fn(),
  reactToMessage: vi.fn(), replyToMessage: vi.fn(), resolveCommentThread: vi.fn(), resumeDirectCallThread: vi.fn(),
  sendChannelMessage: vi.fn(), sendDirectMessage: vi.fn(), stopScreenShare: vi.fn(), unpinMessage: vi.fn(), updateMediaRoom: vi.fn(),
  voiceModeration: undefined
};
const directCalls: any = { clientId: "client-1", endCall: vi.fn(), error: undefined, memberIds: ["alice", "bob"], state: { directRoomId: undefined, remoteName: "Bob", status: "idle", room: undefined }, stopWatchingScreenShare: vi.fn(), updateMedia: vi.fn(), watchScreenShare: vi.fn() };
const media: any = { canSwapCamera: true, error: undefined, sfu: { mediaRoomId: undefined, status: "idle", media: { audio: true, video: false, screen: false } }, stopWatchingScreenShare: vi.fn(), toggleCameraFacing: vi.fn(), updateRoomMedia: vi.fn(), voiceTokens: [] };
const live: any = { actor: { memberId: "alice", role: "member" }, can: vi.fn(() => true), driveManagement: {}, state: { comments: {}, directThreads: {}, files: {}, rooms: {} } };
const history = { loading: false, error: undefined, records: [], loadOlder: vi.fn(), jumpToCursor: vi.fn() };
const personalUnread = { marker: undefined as any, clear: vi.fn(), mark: vi.fn() };
const productivity = { bookmarks: [], reminders: [], addBookmark: vi.fn(), removeBookmark: vi.fn(), scheduleReminder: vi.fn(), removeReminder: vi.fn() };
const attachments: any = { advancedPicker: undefined, attachments: [], clearPendingAttachments: vi.fn(), consumePendingAttachmentIds: vi.fn(() => ["file-1"]), downloadFile: vi.fn(), drivePickerAdapter: undefined, files: [], openAttachment: vi.fn(), pendingAttachmentCount: 0, pendingAttachments: [], publishPendingAttachments: vi.fn(async () => ["file-1"]), removePendingAttachment: vi.fn(), scope: { scopeType: "channel", scopeId: "general" }, shareToGoogleDrive: vi.fn(), transfer: { phase: "idle" }, uploadFile: vi.fn() };
const view: any = {
  actorCanDirectMessage: true, actorCanSendMessages: true, actorChatDisabled: false, actorName: "Alice", activeScreenShares: [], activeThread: undefined,
  channels: [{ id: "general", name: "general", kind: "text" }], currentChannelId: "general", currentThreadId: "thread-1", effectiveVoicePreferences: { muted: false, deafened: false }, feedMessages: [{ id: "message-1", channelId: "general", body: "hello", authorId: "alice", createdAt: 1 }], feedSubtitle: "Topic", feedTitle: "# general", feedKey: "channel:general", forwardTargets: [], joinedMediaRoomId: undefined, joinedRoomId: undefined, memberAvatarsById: {}, memberNamesById: {}, selectedMediaRoom: undefined, showingDm: false, showingMediaRoom: false, threadsForChannel: []
};
const runtime: any = { actions, directCalls, live, media, productivity, roomName: "room-one", view };

vi.mock("@entities/chat/model/chatRuntime", () => ({ useChatRuntime: () => runtime }));
vi.mock("@entities/chat/model/chatUiStore", () => ({ useChatUiActions: () => ui, useChatUiStore: (selector: (value: typeof uiStore) => unknown) => selector(uiStore) }));
vi.mock("@shared/ui/useIsMobile", () => ({ useIsMobile: () => false }));
vi.mock("@features/attachments/model/useAttachments", () => ({ useAttachments: () => attachments }));
vi.mock("@features/messages/model/useRoomHistory", () => ({ useRoomHistory: () => history }));
vi.mock("@entities/chat/model/usePersonalUnread", () => ({ usePersonalUnread: () => personalUnread }));
vi.mock("@features/personal-productivity/model/usePersonalProductivity", () => ({ bookmarkInput: (value: unknown) => value, reminderInput: (value: unknown) => value, usePersonalProductivity: () => productivity }));
vi.mock("@entities/chat/model/chatViewModel", () => ({ canDeleteMessage: vi.fn(() => true), isMessageAuthor: vi.fn(() => true), avatarForActor: vi.fn(() => "avatar") }));
vi.mock("@features/messages/ui/MessageFeed", () => ({
  MessageFeed: (props: any) => <section aria-label="mock message feed">
    <button onClick={() => props.onSend("body")}>send</button>
    <button onClick={() => props.onSend("")}>send attachment-only</button>
    <button onClick={() => props.onReply?.("message-1", "reply")}>reply</button>
    <button onClick={() => props.onMarkUnread?.(props.messages[0])}>mark unread</button>
    <button onClick={() => props.onClearUnread?.()}>clear unread</button>
    <button onClick={() => props.onAddBookmark?.(props.messages[0])}>bookmark</button>
    <button onClick={() => props.onRemoveBookmark?.("bookmark-1")}>remove bookmark</button>
    <button onClick={() => props.onAddReminder?.(props.messages[0])}>reminder</button>
    <button onClick={() => props.onRemoveReminder?.("reminder-1")}>remove reminder</button>
    <button onClick={() => props.onForward?.(props.messages[0], { type: "channel", id: "general", channelId: "general", label: "General" })}>forward</button>
    <button onClick={() => props.onForward?.(props.messages[0], { type: "dm", id: "thread-1", label: "DM" })}>forward dm</button>
    <button onClick={() => props.onPin?.(props.messages[0])}>pin</button><button onClick={() => props.onUnpin?.("message-1")}>unpin</button>
    <button onClick={() => props.onDelete?.(props.messages[0])}>delete</button><button onClick={() => props.onEdit?.(props.messages[0], "edited")}>edit</button>
    <button onClick={() => props.onReact?.("message-1", "👍")}>react</button><button onClick={() => props.onDirectMessage?.("bob")}>direct message</button>
    <button onClick={() => props.onCreateThread?.(props.messages[0])}>create thread</button>
    <button onClick={() => props.onAddThreadComment?.("thread-1", "comment")}>add comment</button><button onClick={() => props.onResolveThread?.("thread-1", true)}>resolve thread</button>
    <button onClick={() => props.onDownloadFile?.("file-1")}>download</button><button onClick={() => props.onOpenAttachment?.("file-1")}>open attachment</button>
    <button onClick={() => props.onUploadFile?.(new File(["file"], "notes.txt", { type: "text/plain" }))}>upload attachment</button>
    <button onClick={() => props.history?.loadOlder?.()}>load older</button><button onClick={() => props.history?.jumpToCursor?.("cursor-1")}>jump history</button>
    <span data-can-delete={String(props.canDeleteMessage?.(props.messages[0]))} data-can-edit={String(props.canEditMessage?.(props.messages[0]))} />
    <span role={props.forwardStatus?.kind === "error" ? "alert" : "status"}>{props.forwardStatus?.message || ""}</span>
    {props.forwardStatus?.actionLabel ? <button onClick={props.forwardStatus.onAction}>{props.forwardStatus.actionLabel}</button> : null}
    <span role="status" />
  </section>
}));
vi.mock("@features/voice-room/ui/VoiceRoomView", () => ({
  VoiceRoomView: (props: any) => <section aria-label="mock voice room">
    <button onClick={() => props.onToggleVoiceScreenShare?.()}>voice screen</button><button onClick={() => props.onToggleVoiceVideo?.()}>voice video</button>
    <button onClick={() => props.onLeaveVoiceRoom?.()}>leave voice</button><button onClick={() => props.onResumeVoiceRoom?.()}>resume voice</button>
    <button onClick={() => props.onOpenVoiceText?.("voice-text")}>voice text</button><button onClick={() => props.onToggleVoiceParticipantMute?.("bob")}>mute participant</button>
  </section>
}));

function reset() {
  Object.assign(view, { activeScreenShares: [], activeThread: undefined, currentChannelId: "general", currentThreadId: "thread-1", feedMessages: [{ id: "message-1", channelId: "general", body: "hello", authorId: "alice", createdAt: 1 }], joinedMediaRoomId: undefined, joinedRoomId: undefined, selectedMediaRoom: undefined, showingDm: false, showingMediaRoom: false });
  Object.assign(directCalls, { memberIds: ["alice", "bob"], state: { directRoomId: undefined, remoteName: "Bob", status: "idle", room: undefined } });
  Object.assign(media, { sfu: { mediaRoomId: undefined, status: "idle", media: { audio: true, video: false, screen: false } } });
  Object.assign(attachments, { scope: { scopeType: "channel", scopeId: "general" }, pendingAttachmentCount: 0 });
  Object.assign(uiStore, { heldDirectCallRoomId: undefined, heldMediaRoomIds: {}, mutedVoiceParticipantIds: [] });
  personalUnread.marker = undefined;
  live.actor.role = "member";
  live.can.mockImplementation(() => true);
  Object.values(actions).forEach((value) => { if (typeof value?.mockClear === "function") value.mockClear(); });
  ui.clearDirectCallHold.mockClear(); ui.clearMediaRoomHold.mockClear(); history.loadOlder.mockClear(); history.jumpToCursor.mockClear(); personalUnread.clear.mockClear(); personalUnread.mark.mockClear();
  Object.values(productivity).forEach((value) => { if (typeof value?.mockClear === "function") value.mockClear(); });
  Object.values(attachments).forEach((value) => { if (typeof value?.mockClear === "function") value.mockClear(); });
  directCalls.endCall.mockClear(); directCalls.updateMedia.mockClear(); media.updateRoomMedia.mockClear(); media.stopWatchingScreenShare.mockClear();
}

describe("ChatContent composition", () => {
  beforeEach(reset);

  it("wires channel history, unread, productivity, sends, replies, and forwarding", async () => {
    const { container } = render(<ChatContent />);
    expect(container.children).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "send" }));
    fireEvent.click(screen.getByRole("button", { name: "reply" }));
    fireEvent.click(screen.getByRole("button", { name: "mark unread" }));
    fireEvent.click(screen.getByRole("button", { name: "clear unread" }));
    fireEvent.click(screen.getByRole("button", { name: "bookmark" }));
    fireEvent.click(screen.getByRole("button", { name: "remove bookmark" }));
    fireEvent.click(screen.getByRole("button", { name: "reminder" }));
    fireEvent.click(screen.getByRole("button", { name: "remove reminder" }));
    fireEvent.click(screen.getByRole("button", { name: "forward" }));
    fireEvent.click(screen.getByRole("button", { name: "forward dm" }));
    fireEvent.click(screen.getByRole("button", { name: "download" }));
    fireEvent.click(screen.getByRole("button", { name: "open attachment" }));
    fireEvent.click(screen.getByRole("button", { name: "load older" }));
    fireEvent.click(screen.getByRole("button", { name: "jump history" }));
    await waitFor(() => expect(actions.sendChannelMessage).toHaveBeenCalledWith("body", []));
    await waitFor(() => expect(actions.replyToMessage).toHaveBeenCalledWith("message-1", "reply", []));
    expect(personalUnread.mark).toHaveBeenCalled();
    expect(productivity.addBookmark).toHaveBeenCalled();
    expect(productivity.removeBookmark).toHaveBeenCalledWith("bookmark-1");
    expect(productivity.scheduleReminder).toHaveBeenCalled();
    expect(productivity.removeReminder).toHaveBeenCalledWith("reminder-1");
    expect(actions.forwardMessage).toHaveBeenCalled();
    expect(attachments.downloadFile).toHaveBeenCalledWith("file-1");
    expect(attachments.openAttachment).toHaveBeenCalledWith("file-1");
    expect(history.loadOlder).toHaveBeenCalled();
    expect(history.jumpToCursor).toHaveBeenCalledWith("cursor-1");
  });

  it("queues an upload without sending until the composer is submitted", async () => {
    render(<ChatContent />);

    fireEvent.click(screen.getByRole("button", { name: "upload attachment" }));

    await waitFor(() => expect(attachments.uploadFile).toHaveBeenCalledWith(expect.objectContaining({ name: "notes.txt" })));
    expect(actions.sendChannelMessage).not.toHaveBeenCalled();
  });

  it("uploads queued attachments when the composer is submitted", async () => {
    attachments.pendingAttachmentCount = 1;
    render(<ChatContent />);

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => expect(actions.sendChannelMessage).toHaveBeenCalledWith("body", ["file-1"]));
    expect(attachments.publishPendingAttachments).toHaveBeenCalled();
    expect(attachments.clearPendingAttachments).toHaveBeenCalled();
  });

  it("publishes and consumes queued attachments for an attachment-only message", async () => {
    attachments.pendingAttachmentCount = 1;
    render(<ChatContent />);

    fireEvent.click(screen.getByRole("button", { name: "send attachment-only" }));

    await waitFor(() => expect(actions.sendChannelMessage).toHaveBeenCalledWith("", ["file-1"]));
    expect(attachments.publishPendingAttachments).toHaveBeenCalled();
    expect(attachments.consumePendingAttachmentIds).toHaveBeenCalled();
    expect(attachments.clearPendingAttachments).toHaveBeenCalled();
  });

  it("treats authoritative re-share metadata as a successful forward", async () => {
    actions.forwardMessage.mockResolvedValueOnce({
      replacements: [{ sourceFileId: "file-1", targetFileId: "file-2", shareId: "share-1" }],
      forward: { ok: true }
    });
    render(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "forward" }));
    await waitFor(() => expect(screen.getByText("Message forwarded with encrypted file provenance.", { exact: true })).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not report a resolved authoritative rejection as a successful forward", async () => {
    actions.forwardMessage.mockResolvedValueOnce({ replacements: [], forward: { ok: false, reason: "denied" } });
    render(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "forward" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Message forwarding was rejected by the authorized host"));
    expect(screen.queryByText("Message forwarded with encrypted file provenance.", { exact: true })).not.toBeInTheDocument();
  });

  it("uses the DM scope and direct-call controls", async () => {
    view.showingDm = true; view.currentThreadId = "thread-1"; view.activeThread = { id: "thread-1", userIds: ["alice", "bob"] }; view.feedTitle = "Direct message";
    attachments.scope = { scopeType: "direct.thread", scopeId: "thread-1" };
    render(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "send" }));
    fireEvent.click(screen.getByRole("button", { name: "reply" }));
    await waitFor(() => expect(actions.sendDirectMessage).toHaveBeenCalledWith("body", []));
    await waitFor(() => expect(actions.replyToMessage).toHaveBeenCalledWith("message-1", "reply", []));

    directCalls.state = { directRoomId: "call-1", remoteName: "Bob", status: "connected", room: { remoteStreams: [] } };
    const { rerender } = render(<ChatContent />);
    rerender(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "voice screen" }));
    fireEvent.click(screen.getByRole("button", { name: "voice video" }));
    fireEvent.click(screen.getByRole("button", { name: "leave voice" }));
    expect(directCalls.endCall).toHaveBeenCalled();

    uiStore.heldDirectCallRoomId = "call-1";
    rerender(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "resume voice" }));
    expect(actions.resumeDirectCallThread).toHaveBeenCalledWith("thread-1");
  });

  it("renders media rooms and exercises voice text, sharing, resume, and moderation callbacks", () => {
    view.showingMediaRoom = true; view.selectedMediaRoom = { id: "room-1", name: "Lounge", allowsVideo: true }; view.joinedMediaRoomId = "room-1"; view.joinedRoomId = "room-1";
    view.channels = [{ id: "voice-text", name: "Voice text", kind: "voice-text", mediaRoomId: "room-1" }];
    media.sfu = { mediaRoomId: "room-1", status: "connected", media: { audio: true, video: false, screen: false } };
    const { rerender } = render(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "voice screen" }));
    fireEvent.click(screen.getByRole("button", { name: "voice video" }));
    fireEvent.click(screen.getByRole("button", { name: "voice text" }));
    fireEvent.click(screen.getByRole("button", { name: "mute participant" }));
    fireEvent.click(screen.getByRole("button", { name: "leave voice" }));
    expect(media.updateRoomMedia).toHaveBeenCalled();
    expect(ui.selectChannel).toHaveBeenCalledWith("voice-text");
    expect(ui.toggleVoiceParticipantMute).not.toHaveBeenCalled();

    uiStore.heldMediaRoomIds = { "room-1": true };
    rerender(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "resume voice" }));
    expect(actions.updateMediaRoom).toHaveBeenCalledWith(expect.objectContaining({ id: "room-1" }), expect.anything());

    view.activeScreenShares = [{ id: "share-1", scopeId: "room-1", stoppedAt: undefined }];
    uiStore.heldMediaRoomIds = {};
    rerender(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "voice screen" }));
    expect(actions.stopScreenShare).toHaveBeenCalledWith("share-1");

    view.joinedRoomId = undefined;
    rerender(<ChatContent />);
    const updateCount = media.updateRoomMedia.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "voice video" }));
    expect(media.updateRoomMedia.mock.calls.length).toBe(updateCount);
  });

  it("fails closed for draft DM attachment scopes", () => {
    view.showingDm = true; view.activeThread = undefined; attachments.scope = undefined;
    render(<ChatContent />);
    expect(screen.queryByText("Custom media")).not.toBeInTheDocument();
  });

  it("clears a personal unread marker when a newer visible feed is read", async () => {
    personalUnread.marker = { messageId: "old-message", createdAt: 1, label: "# general" };
    render(<ChatContent />);
    await waitFor(() => expect(personalUnread.clear).toHaveBeenCalled());
  });

  it("wires message management actions and fail-closed forwarding", async () => {
    live.actor.role = "admin";
    live.state.comments = { "comment-1": { id: "comment-1", scopeType: "channel", scopeId: "general", body: "comment" } };
    live.can.mockImplementation((capability: string) => capability !== "directMessageForward");
    actions.forwardMessage.mockResolvedValueOnce("Rejected by policy");
    render(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "pin" }));
    fireEvent.click(screen.getByRole("button", { name: "unpin" }));
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    fireEvent.click(screen.getByRole("button", { name: "edit" }));
    fireEvent.click(screen.getByRole("button", { name: "react" }));
    fireEvent.click(screen.getByRole("button", { name: "direct message" }));
    fireEvent.click(screen.getByRole("button", { name: "create thread" }));
    fireEvent.click(screen.getByRole("button", { name: "add comment" }));
    fireEvent.click(screen.getByRole("button", { name: "resolve thread" }));
    fireEvent.click(screen.getByRole("button", { name: "forward dm" }));
    fireEvent.click(screen.getByRole("button", { name: "forward" }));
    expect(actions.pinMessage).toHaveBeenCalled();
    expect(actions.unpinMessage).toHaveBeenCalledWith("message-1");
    expect(actions.deleteMessage).toHaveBeenCalled();
    expect(actions.editMessage).toHaveBeenCalledWith(expect.anything(), "edited");
    expect(actions.reactToMessage).toHaveBeenCalledWith("message-1", "👍");
    expect(actions.openDirectThreadForMember).toHaveBeenCalledWith("bob");
    expect(actions.createCommentThread).toHaveBeenCalledWith("channel", "general", "hello", { source: { kind: "channel", scopeId: "general", messageId: "message-1" } });
    expect(actions.addThreadComment).toHaveBeenCalledWith("thread-1", "comment");
    expect(actions.resolveCommentThread).toHaveBeenCalledWith("thread-1", true);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Rejected by policy"));
  });

  it("explains unconfirmed deletion and offers an explicit retry", async () => {
    actions.deleteMessage.mockResolvedValueOnce("Deletion was not confirmed. The message and its attached files may still exist.").mockResolvedValueOnce(true);
    render(<ChatContent />);

    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Deletion was not confirmed");
    fireEvent.click(screen.getByRole("button", { name: "Retry deletion and cleanup" }));

    await waitFor(() => expect(actions.deleteMessage).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Message and exclusively attached files deleted.")).toBeInTheDocument();
  });

  it("does not create personal productivity items without a message scope", () => {
    view.currentChannelId = undefined;
    view.feedMessages = [{ id: "message-1", body: "orphan", authorId: "alice", createdAt: 1 }];
    attachments.scope = undefined;
    render(<ChatContent />);
    fireEvent.click(screen.getByRole("button", { name: "bookmark" }));
    fireEvent.click(screen.getByRole("button", { name: "reminder" }));
    expect(productivity.addBookmark).not.toHaveBeenCalled();
    expect(productivity.scheduleReminder).not.toHaveBeenCalled();
  });
});
