import React, { useState } from "react";
import type { CommentThread, ThreadComment } from "@shared/model/commentThreads";
import { NotificationControlsMenu } from "./NotificationControlsMenu";
import type { NotificationMode, NotificationMute } from "matterhorn-sdk/browser";

/** Generic comments-thread surface; feature orchestration supplies the data and actions. */
export function ThreadPanel({
  thread,
  comments,
  memberNamesById,
  currentUserId,
  followed = false,
  muted = false,
  notificationMode = "inherit",
  notificationSummary,
  onAddComment,
  onResolve,
  onClose,
  onArchive,
  onReopen,
  onLock,
  onUnlock,
  onFollow,
  onUnfollow,
  onMuteChange,
  onNotificationModeChange,
  onAddMember,
  onRemoveMember,
  onOpenSource
}: {
  thread: CommentThread;
  comments: ThreadComment[];
  memberNamesById: Record<string, string>;
  currentUserId?: string;
  followed?: boolean;
  muted?: boolean;
  notificationMode?: NotificationMode;
  notificationSummary?: string;
  onAddComment: (body: string) => void;
  onResolve: (resolved: boolean) => void;
  onClose: () => void;
  onArchive?: () => void;
  onReopen?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onMuteChange?: (mute: NotificationMute) => void | Promise<void>;
  onNotificationModeChange?: (mode: NotificationMode) => void | Promise<void>;
  onAddMember?: (memberId: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onOpenSource?: () => void;
}) {
  const [body, setBody] = useState("");
  const [memberId, setMemberId] = useState("");
  const archived = thread.lifecycle === "archived" || Boolean(thread.archivedAt);
  const locked = thread.lifecycle === "locked";
  const privateMemberIds = thread.privateMemberIds || [];
  const privateMemberIdSet = new Set(privateMemberIds.map(String));
  const memberOptions = Object.entries(memberNamesById).filter(([id]) => !privateMemberIdSet.has(id));
  const status = archived ? "Archived" : locked ? "Locked" : thread.resolved ? "Resolved" : "Open";
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || archived || locked || thread.resolved) return;
    onAddComment(body.trim());
    setBody("");
  }
  return (
    <aside className="thread-panel" aria-label={`${thread.title || "Thread"} discussion`}>
      <NotificationControlsMenu
        label="Thread"
        inheritLabel="Use Parent Default"
        muted={muted}
        notificationMode={notificationMode}
        notificationSummary={notificationSummary}
        onMuteChange={onMuteChange}
        onNotificationModeChange={onNotificationModeChange}
        preferenceUnavailableMessage="Notification preferences are still loading."
      >
        <header className="thread-panel-head">
          <div>
            <strong>{thread.title || "Thread"}</strong>
            <small>{status}</small>
            {thread.source ? <small>Source message: {thread.source.messageId}</small> : null}
          </div>
          <div className="thread-panel-actions">
            {thread.source && onOpenSource ? <button type="button" onClick={onOpenSource}>Open source message</button> : null}
            {!archived && !locked ? <button type="button" onClick={() => onResolve(!thread.resolved)}>{thread.resolved ? "Reopen" : "Resolve"}</button> : null}
            {archived ? (onReopen ? <button type="button" onClick={onReopen}>Reopen thread</button> : null) : (onArchive ? <button type="button" onClick={onArchive}>Archive thread</button> : null)}
            {locked ? (onUnlock ? <button type="button" onClick={onUnlock}>Unlock thread</button> : null) : (!archived && onLock ? <button type="button" onClick={onLock}>Lock thread</button> : null)}
            {currentUserId && (followed ? (onUnfollow ? <button type="button" onClick={onUnfollow}>Unfollow</button> : null) : (onFollow ? <button type="button" onClick={onFollow}>Follow</button> : null))}
            <button type="button" onClick={onClose} aria-label="Close thread">×</button>
          </div>
        </header>
      </NotificationControlsMenu>
      {thread.visibility === "private" && (onAddMember || onRemoveMember) ? (
        <section aria-label="Private thread members" className="thread-panel-members">
          <strong>Private members</strong>
          {privateMemberIds.length ? privateMemberIds.map((id) => (
            <div key={id}><span>{memberNamesById[id] || id}</span>{onRemoveMember ? <button type="button" onClick={() => onRemoveMember(id)}>Remove {memberNamesById[id] || id}</button> : null}</div>
          )) : <small>No additional members.</small>}
          {onAddMember && memberOptions.length ? (
            <form onSubmit={(event) => { event.preventDefault(); if (!memberId) return; onAddMember(memberId); setMemberId(""); }}>
              <select aria-label="Private member to add" value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                <option value="">Choose a member</option>
                {memberOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <button type="submit" disabled={!memberId}>Add member</button>
            </form>
          ) : null}
        </section>
      ) : null}
      <div className="thread-panel-comments">
        {comments.length === 0 ? <p className="thread-empty">No replies yet.</p> : null}
        {comments.map((comment) => (
          <article key={comment.id} className="thread-comment">
            <strong>{memberNamesById[comment.authorId] || comment.authorName || comment.authorId}</strong>
            {comment.authorId === currentUserId ? <small>You</small> : null}
            <p>{comment.body}</p>
          </article>
        ))}
      </div>
      {archived ? <p role="status">This thread is archived.</p> : null}
      {locked ? <p role="status">This thread is locked.</p> : null}
      {!thread.resolved && !archived && !locked ? (
        <form className="thread-composer" onSubmit={submit}>
          <input aria-label="Thread reply" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Reply in thread" />
          <button type="submit" disabled={!body.trim()}>Send</button>
        </form>
      ) : null}
    </aside>
  );
}
