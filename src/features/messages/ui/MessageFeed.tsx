import React, { useLayoutEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { Message } from "@entities/chat/model/types";
import type { CommentThread, ThreadComment } from "@entities/chat/model/types";
import { MessageComposer } from "@features/messages/ui/MessageComposer";
import { MessageRow } from "@features/messages/ui/MessageRow";
import { loadRecentReactions, rememberReaction } from "@features/messages/model/recentReactions";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";
import { useChatUiActions, useChatUiStore, type PendingComposerText } from "@entities/chat/model/chatUiStore";
import {
  Button,
  ChatHeader,
  EmptyState,
  MessageList,
  NewMessagesButton,
} from "@shared/ui/design";
import { sectionShell } from "@shared/ui/design/sectionShell";
import { HashGlyph, MenuGlyph } from "@shared/ui/design/icons";
import type { AttachmentPreviewLoader, AttachmentRecord, AttachmentTransferState, EncryptedFileRecord, PendingAttachmentPreview } from "@shared/model/attachments";
import type { AttachmentPickerConfig } from "@shared/model/attachmentPicker";
import { ThreadPanel } from "@shared/ui/ThreadPanel";
import type { RoomHistoryState } from "@features/messages/model/useRoomHistory";
import type { PersonalUnreadMarker } from "matterhorn-sdk/client";
import type { MatterhornBookmark, MatterhornReminder } from "matterhorn-sdk/browser";
import type { NotificationPreferencesController } from "@entities/chat/model/useNotificationPreferences";
import type { NotificationScope } from "matterhorn-sdk/browser";
import { filterForumPosts, normalizeForumTagIds, type ForumLayout, type ForumTag } from "@entities/community/model/forum";
import { ForumPostFilter } from "@entities/community/ui/ForumPostFilter";
import { messageAnchorId } from "@entities/chat/model/messageLinks";

export type { MessageForwardTarget };
export type MessageForwardStatus = { kind: "success" | "error"; message: string; actionLabel?: string; onAction?: () => void };

export type MessageFeedProps = {
  title: string;
  subtitle?: string;
  messages: Message[];
  memberNamesById?: Record<string, string>;
  memberKindsById?: Record<string, "bot" | undefined>;
  memberAvatarsById?: Record<string, string>;
  forwardTargets?: MessageForwardTarget[];
  focusKey?: number;
  pendingComposerText?: PendingComposerText;
  currentUserId?: string;
  mode: "channel" | "dm";
  channelKind?: string;
  forumLayout?: ForumLayout;
  forumTags?: ForumTag[];
  onForumLayoutChange?: (layout: ForumLayout) => void;
  onCreateForumTag?: (name: string, color?: string) => void;
  onUpdateForumTag?: (tagId: string, name: string, color?: string) => void;
  onArchiveForumTag?: (tagId: string) => void;
  disabled?: boolean;
  feedKey?: string;
  onSend: (body: string, forumTagIds?: string[]) => void;
  onReply?: (messageId: string, body: string, forumTagIds?: string[]) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onForward?: (message: Message, target: MessageForwardTarget) => void;
  forwardStatus?: MessageForwardStatus;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, body: string) => void;
  onDirectMessage?: (memberId: string) => void;
  commentThreads?: CommentThread[];
  comments?: ThreadComment[];
  onCreateThread?: (message: Message) => Promise<string | undefined> | string | void;
  onAddThreadComment?: (threadId: string, body: string) => void;
  onResolveThread?: (threadId: string, resolved: boolean) => void;
  onArchiveThread?: (threadId: string) => void;
  onReopenThread?: (threadId: string) => void;
  onLockThread?: (threadId: string) => void;
  onUnlockThread?: (threadId: string) => void;
  notificationCategoryId?: string;
  notificationPreferences?: NotificationPreferencesController;
  notificationRoomId?: string;
  onAddThreadMember?: (threadId: string, memberId: string) => void;
  onRemoveThreadMember?: (threadId: string, memberId: string) => void;
  canDeleteMessage?: (message: Message) => boolean;
  canEditMessage?: (message: Message) => boolean;
  attachmentRecords?: AttachmentRecord[];
  fileRecords?: EncryptedFileRecord[];
  attachmentTransfer?: AttachmentTransferState;
  onDownloadFile?: (file: EncryptedFileRecord) => void;
  onPreviewFile?: AttachmentPreviewLoader;
  onOpenAttachment?: (attachment: AttachmentRecord) => void;
  history?: RoomHistoryState;
  personalUnreadMarker?: PersonalUnreadMarker;
  onMarkUnread?: (message: Message) => void;
  onClearUnread?: () => void;
  bookmarks?: MatterhornBookmark[];
  reminders?: MatterhornReminder[];
  onAddBookmark?: (message: Message) => void;
  onRemoveBookmark?: (bookmarkId: string) => void;
  onAddReminder?: (message: Message) => void;
  onRemoveReminder?: (reminderId: string) => void;
  onShareDrive?: (file: File) => void;
  onUploadFile?: (file: File) => void;
  advancedPicker?: AttachmentPickerConfig;
  attachmentUnavailableReason?: string;
  canSendWithoutText?: boolean;
  pendingAttachments?: PendingAttachmentPreview[];
  onRemovePendingAttachment?: (id: string) => void;
};

function historyRecordLabel(record: Record<string, unknown>, fallback: string) {
  for (const key of ["body", "text", "title"]) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  return fallback;
}

export function MessageFeed({
  title,
  subtitle,
  messages,
  memberNamesById = {},
  memberKindsById = {},
  memberAvatarsById = {},
  forwardTargets = [],
  focusKey,
  pendingComposerText,
  currentUserId,
  mode,
  channelKind,
  forumLayout = "list",
  forumTags = [],
  onForumLayoutChange,
  onCreateForumTag,
  onUpdateForumTag,
  onArchiveForumTag,
  disabled,
  feedKey,
  onSend,
  onReply,
  onReact,
  onForward,
  forwardStatus,
  onPin,
  onUnpin,
  onDelete,
  onEdit,
  onDirectMessage,
  commentThreads = [],
  comments = [],
  onCreateThread,
  onAddThreadComment,
  onResolveThread,
  onArchiveThread,
  onReopenThread,
  onLockThread,
  onUnlockThread,
  notificationCategoryId,
  notificationPreferences,
  notificationRoomId,
  onAddThreadMember,
  onRemoveThreadMember,
  canDeleteMessage,
  canEditMessage,
  attachmentRecords = [],
  fileRecords = [],
  attachmentTransfer,
  onDownloadFile,
  onPreviewFile,
  onShareDrive,
  onUploadFile,
  advancedPicker,
  onOpenAttachment,
  attachmentUnavailableReason,
  canSendWithoutText,
  pendingAttachments = [],
  onRemovePendingAttachment,
  history,
  personalUnreadMarker,
  onMarkUnread,
  onClearUnread,
  bookmarks = [],
  reminders = [],
  onAddBookmark,
  onRemoveBookmark,
  onAddReminder,
  onRemoveReminder,
}: MessageFeedProps) {
  const [replyTo, setReplyTo] = useState<Message | undefined>();
  const [activeCommentThreadId, setActiveCommentThreadId] = useState<string | undefined>();
  const [recentReactions, setRecentReactions] = useState(loadRecentReactions);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCursor, setHistoryCursor] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const lastFeedKeyRef = useRef<string | undefined>(undefined);
  const lastMessageIdRef = useRef<string | undefined>(undefined);
  const forceNextBottomRef = useRef(false);
  const sidebarOpen = useChatUiStore((value) => value.sidebarOpen);
  const ui = useChatUiActions();
  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const [forumQuery, setForumQuery] = useState("");
  const [forumTagFilter, setForumTagFilter] = useState("");
  const [composerForumTagIds, setComposerForumTagIds] = useState<string[]>([]);
  const forumMode = mode === "channel" && channelKind === "forum";
  const visibleMessages = forumMode ? filterForumPosts(messages, forumQuery, forumTagFilter) : messages;
  const attachmentOnlySendEnabled = canSendWithoutText === true && (attachmentTransfer?.phase ?? "idle") === "idle";
  const activeFeedKey = feedKey ?? `${mode}:${title}`;
  const lastMessageId = visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1].id : undefined;
  const displayMessages = [
    ...visibleMessages.filter((message) => message.pinnedAt && !message.deletedAt).map((message) => ({ message, pinnedCopy: true, instanceKey: `${message.id}:pinned` })),
    ...visibleMessages.map((message) => ({ message, pinnedCopy: false, instanceKey: message.id }))
  ];

  function isAtBottom(element: HTMLElement) {
    return element.scrollHeight - element.scrollTop - element.clientHeight <= 40;
  }

  function scrollToBottom() {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    atBottomRef.current = true;
    setShowNewMessages(false);
  }

  function updateScrollPosition() {
    const list = listRef.current;
    if (!list) return;
    const atBottom = isAtBottom(list);
    atBottomRef.current = atBottom;
    if (atBottom) setShowNewMessages(false);
  }

  useLayoutEffect(() => {
    const feedChanged = lastFeedKeyRef.current !== activeFeedKey;
    const messageChanged = lastMessageIdRef.current !== lastMessageId;

    if (feedChanged || forceNextBottomRef.current || atBottomRef.current) {
      scrollToBottom();
    } else if (messageChanged) {
      setShowNewMessages(true);
    }

    forceNextBottomRef.current = false;
    lastFeedKeyRef.current = activeFeedKey;
    lastMessageIdRef.current = lastMessageId;
  }, [activeFeedKey, lastMessageId, messages.length]);

  function submitMessage(body: string, forumTagIds?: string[]) {
    forceNextBottomRef.current = true;
    scrollToBottom();
    const normalizedForumTagIds = forumMode ? normalizeForumTagIds(forumTagIds || composerForumTagIds, forumTags) : [];
    if (replyTo && onReply) {
      if (normalizedForumTagIds.length) onReply(replyTo.id, body, normalizedForumTagIds);
      else onReply(replyTo.id, body);
      setReplyTo(undefined);
      return;
    }
    if (normalizedForumTagIds.length) onSend(body, normalizedForumTagIds);
    else onSend(body);
    if (forumMode) setComposerForumTagIds([]);
  }

  const channelName = title.replace(/^#/, "");

  return (
    <section {...stylex.props(sectionShell.chat)}>
      <ChatHeader
        mobileToggle={
          <Button
            tone="muted"
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            title={sidebarOpen ? "Close navigation" : "Open navigation"}
            onClick={() => ui.setSidebarOpen(!sidebarOpen)}
          >
            <MenuGlyph size={16} />
          </Button>
        }
        icon={<HashGlyph size={22} />}
        title={channelName}
        topic={subtitle}
      />

      {forumMode ? <ForumPostFilter query={forumQuery} postCount={visibleMessages.length} onQueryChange={setForumQuery} tags={forumTags} selectedTagId={forumTagFilter} onTagChange={setForumTagFilter} layout={forumLayout} onLayoutChange={onForumLayoutChange} onCreateTag={onCreateForumTag} onUpdateTag={onUpdateForumTag} onArchiveTag={onArchiveForumTag} /> : null}

      {mode === "channel" && commentThreads.length > 0 ? (
        <section aria-label="Channel threads" style={{ display: "grid", gap: 6, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <strong>Threads</strong>
            <span>{commentThreads.length}</span>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {commentThreads.map((thread) => {
              const replyCount = comments.filter((comment) => comment.threadId === thread.id && !comment.deletedAt).length;
              const threadTitle = thread.title || "Untitled thread";
              return (
                <button
                  key={thread.id}
                  type="button"
                  aria-label={`Open thread ${threadTitle}`}
                  onClick={() => setActiveCommentThreadId(thread.id)}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, textAlign: "left" }}
                >
                  <span>{threadTitle}</span>
                  <small>{thread.resolved ? "Resolved" : "Open"} · {replyCount} {replyCount === 1 ? "reply" : "replies"}</small>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="message-history" role="group" aria-label="Message history controls">
        <button type="button" aria-label="Load older messages" disabled={!history || history.loading} onClick={() => history?.loadOlder()} title="Load older encrypted messages">Load older</button>
        <button type="button" aria-expanded={historyOpen} onClick={() => setHistoryOpen((open) => !open)} disabled={!history}>History options</button>
        {historyOpen && history ? <div className="message-history-options">
          <label>Open a saved position<input aria-label="History cursor" value={historyCursor} placeholder="Paste a message position" onChange={(event) => setHistoryCursor(event.currentTarget.value)} /></label>
          <button type="button" disabled={history.loading || !historyCursor.trim()} title="Jump to encrypted history position" onClick={() => history.jumpToCursor(historyCursor.trim())}>Open position</button>
          <p>Use a position shared by this room. This does not search or expose other rooms.</p>
        </div> : null}
        {history?.loading ? <span role="status">Loading encrypted history…</span> : null}
        {history?.error ? <span role="alert">{history.error}</span> : null}
        {history?.records.length ? <span role="status">Loaded {history.records.length} archived message records.</span> : null}
        {forwardStatus ? <span role={forwardStatus.kind === "error" ? "alert" : "status"}>{forwardStatus.message}{forwardStatus.actionLabel && forwardStatus.onAction ? <button type="button" onClick={forwardStatus.onAction}>{forwardStatus.actionLabel}</button> : null}</span> : null}
      </div>
      {history?.records.length ? (
        <ol aria-label="Archived message records" className="message-history-records">
          {history.records.map((record, index) => <li key={String(record.id || index)}>{historyRecordLabel(record, `Archived message ${index + 1}`)}</li>)}
        </ol>
      ) : null}

      <MessageList listRef={listRef} onScroll={updateScrollPosition} aria-label={`${title} messages`}>
        {visibleMessages.length === 0 ? (
          <EmptyState
            icon={<HashGlyph size={52} />}
            title={`Welcome to ${title}`}
            description={`This is the start of ${title}. Send the first message to break the ice.`}
          />
        ) : null}
        {displayMessages.map(({ message, pinnedCopy, instanceKey }) => (
          <MessageRow
            canDeleteMessage={canDeleteMessage}
            canEditMessage={canEditMessage}
            currentUserId={currentUserId}
            forwardTargets={forwardTargets}
            instanceKey={instanceKey}
            key={instanceKey}
            memberAvatarsById={memberAvatarsById}
            memberNamesById={memberNamesById}
            memberKindsById={memberKindsById}
            message={message}
            messagesById={messagesById}
            onDelete={onDelete}
            onDirectMessage={onDirectMessage}
            onCreateThread={onCreateThread ? (message) => {
              const created = onCreateThread(message);
              if (created instanceof Promise) {
                void created.then((threadId) => { if (threadId) setActiveCommentThreadId(threadId); });
                return;
              }
              if (created) setActiveCommentThreadId(created);
            } : undefined}
            onEdit={onEdit}
            onForward={onForward}
            onPin={onPin}
            onReact={onReact}
            onRememberReaction={(emoji) => setRecentReactions((current) => rememberReaction(current, emoji))}
            onReply={onReply ? setReplyTo : undefined}
            onUnpin={onUnpin}
            pinnedCopy={pinnedCopy}
            recentReactions={recentReactions}
            fileRecords={fileRecords}
            attachmentRecords={attachmentRecords}
            onDownloadFile={onDownloadFile}
            onPreviewFile={onPreviewFile}
            onOpenAttachment={onOpenAttachment}
            onMarkUnread={onMarkUnread}
            onClearUnread={onClearUnread}
            unreadMarkerMessageId={personalUnreadMarker?.messageId}
            bookmarks={bookmarks}
            reminders={reminders}
            onAddBookmark={onAddBookmark}
            onRemoveBookmark={onRemoveBookmark}
            onAddReminder={onAddReminder}
            onRemoveReminder={onRemoveReminder}
          />
        ))}
      </MessageList>

      {activeCommentThreadId ? (() => {
        const thread = commentThreads.find((item) => item.id === activeCommentThreadId);
        if (!thread) return null;
        const notificationScope: NotificationScope | undefined = notificationRoomId && thread.scopeType === "channel"
          ? { type: "channel.thread", roomId: notificationRoomId, channelId: thread.scopeId, threadId: thread.id }
          : undefined;
        const preference = notificationScope ? notificationPreferences?.preference(notificationScope) : undefined;
        const resolution = notificationScope ? notificationPreferences?.resolve(notificationScope, notificationCategoryId) : undefined;
        const notificationSummary = resolution?.muted
          ? "Muted"
          : resolution?.mode === "mentions"
            ? "Only @mentions"
            : resolution?.mode === "none" ? "Nothing" : "All Messages";
        return (
          <ThreadPanel
            thread={thread}
            comments={comments.filter((comment) => comment.threadId === thread.id)}
            memberNamesById={memberNamesById}
            currentUserId={currentUserId}
            followed={notificationPreferences?.followed(thread.id)}
            muted={preference?.mute?.kind === "indefinite" || preference?.mute?.kind === "until" && preference.mute.expiresAt > Date.now()}
            notificationMode={preference?.mode || "inherit"}
            notificationSummary={notificationSummary}
            onAddComment={(body) => onAddThreadComment?.(thread.id, body)}
            onResolve={(resolved) => onResolveThread?.(thread.id, resolved)}
            onArchive={onArchiveThread ? () => onArchiveThread(thread.id) : undefined}
            onReopen={onReopenThread ? () => onReopenThread(thread.id) : undefined}
            onLock={onLockThread ? () => onLockThread(thread.id) : undefined}
            onUnlock={onUnlockThread ? () => onUnlockThread(thread.id) : undefined}
            onFollow={notificationPreferences ? () => { void notificationPreferences.setFollowed(thread.id, true); } : undefined}
            onUnfollow={notificationPreferences ? () => { void notificationPreferences.setFollowed(thread.id, false); } : undefined}
            onMuteChange={notificationScope && notificationPreferences ? (mute) => notificationPreferences.setMute(notificationScope, mute) : undefined}
            onNotificationModeChange={notificationScope && notificationPreferences ? (notificationMode) => notificationPreferences.setMode(notificationScope, notificationMode) : undefined}
            onAddMember={onAddThreadMember ? (memberId) => onAddThreadMember(thread.id, memberId) : undefined}
            onRemoveMember={onRemoveThreadMember ? (memberId) => onRemoveThreadMember(thread.id, memberId) : undefined}
            onOpenSource={thread.source?.messageId ? () => {
              const source = document.getElementById(messageAnchorId(String(thread.source?.messageId)));
              source?.scrollIntoView({ behavior: "smooth", block: "center" });
              source?.focus();
            } : undefined}
            onClose={() => setActiveCommentThreadId(undefined)}
          />
        );
      })() : null}

      {showNewMessages ? <NewMessagesButton onClick={scrollToBottom} /> : null}

      <MessageComposer
        disabled={disabled}
        focusKey={focusKey}
        memberNamesById={memberNamesById}
        memberKindsById={memberKindsById}
        mode={mode}
        onCancelReply={() => setReplyTo(undefined)}
        onShareDrive={onShareDrive}
        onUploadFile={onUploadFile}
        advancedPicker={advancedPicker}
        attachmentUnavailableReason={attachmentUnavailableReason}
        canSendWithoutText={attachmentOnlySendEnabled}
        pendingAttachments={pendingAttachments}
        onRemovePendingAttachment={onRemovePendingAttachment}
        forumTags={forumMode ? forumTags : []}
        forumTagIds={composerForumTagIds}
        onForumTagIdsChange={(tagIds) => setComposerForumTagIds(normalizeForumTagIds(tagIds, forumTags))}
        pendingText={pendingComposerText}
        onSend={submitMessage}
        replyTo={replyTo}
        title={title}
        transfer={attachmentTransfer}
      />
    </section>
  );
}
