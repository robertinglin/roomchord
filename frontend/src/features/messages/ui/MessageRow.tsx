import React, { useState } from "react";
import { messageAnchorId, messageHref } from "@entities/chat/model/messageLinks";
import { reactionCount } from "@entities/chat/model/state";
import type { Message } from "@entities/chat/model/types";
import { Avatar } from "@shared/ui/Avatar";
import { ForwardIcon, MoreIcon, ReplyIcon, SmileIcon } from "@shared/ui/Icons";
import { MarkdownMessage } from "@features/messages/ui/MarkdownMessage";
import { MemberContextMenu } from "@shared/ui/MemberContextMenu";
import { InlineEmojiPicker } from "@features/messages/ui/InlineEmojiPicker";
import { authorName, focusMessage, formatMessageTime, messageAvatar, previewText } from "@features/messages/model/messageDisplay";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";
import { parseMentionedMemberIds, renderMentionNames } from "@entities/chat/model/mentions";

function ReplyPreview({
  message,
  memberNamesById,
  onFollow
}: {
  message?: Message;
  memberNamesById: Record<string, string>;
  onFollow: (messageId: string) => void;
}) {
  if (!message) {
    return (
      <span className="reply-preview missing">
        <span>Original message unavailable</span>
      </span>
    );
  }
  if (message.deletedAt) {
    return (
      <span className="reply-preview missing">
        <span>Original message was deleted</span>
      </span>
    );
  }
  const name = authorName(message, memberNamesById);
  const preview = previewText(renderMentionNames(message.body, memberNamesById));
  return (
    <a className="reply-preview" href={messageHref(message.id)} aria-label={`Replying to ${name}: ${preview}`} onClick={() => onFollow(message.id)}>
      <span>Replying to {name}</span>
      <strong>{preview}</strong>
    </a>
  );
}

export function MessageRow({
  canDeleteMessage,
  canEditMessage,
  currentUserId,
  forwardTargets,
  instanceKey,
  memberAvatarsById,
  memberNamesById,
  message,
  messagesById,
  onDelete,
  onDirectMessage,
  onEdit,
  onForward,
  onPin,
  onReact,
  onRememberReaction,
  onReply,
  onUnpin,
  pinnedCopy,
  recentReactions
}: {
  canDeleteMessage?: (message: Message) => boolean;
  canEditMessage?: (message: Message) => boolean;
  currentUserId?: string;
  forwardTargets: MessageForwardTarget[];
  instanceKey: string;
  memberAvatarsById: Record<string, string>;
  memberNamesById: Record<string, string>;
  message: Message;
  messagesById: Map<string, Message>;
  onDelete?: (messageId: string) => void;
  onDirectMessage?: (memberId: string) => void;
  onEdit?: (messageId: string, body: string) => void;
  onForward?: (message: Message, target: MessageForwardTarget) => void;
  onPin?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRememberReaction: (emoji: string) => void;
  onReply?: (message: Message) => void;
  onUnpin?: (messageId: string) => void;
  pinnedCopy: boolean;
  recentReactions: string[];
}) {
  const [editing, setEditing] = useState<{ id: string; body: string } | undefined>();
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [forwardMenuOpen, setForwardMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const name = authorName(message, memberNamesById);
  const isDeleted = Boolean(message.deletedAt);
  const reactions = Object.entries(message.reactions || {}).filter(([, members]) => members.length > 0);
  const canPin = Boolean((message.pinnedAt ? onUnpin : onPin) && !isDeleted);
  const canEdit = Boolean(!pinnedCopy && onEdit && !isDeleted && (!canEditMessage || canEditMessage(message)));
  const canDelete = Boolean(onDelete && !isDeleted && (!canDeleteMessage || canDeleteMessage(message)));
  const canReact = Boolean(onReact);
  const showMore = Boolean(canPin || canEdit || canDelete);
  const replyMessage = message.replyToId ? messagesById.get(message.replyToId) : undefined;
  const avatar = <Avatar name={name} avatar={messageAvatar(message, memberAvatarsById)} />;
  const mentionedCurrentUser = Boolean(
    currentUserId &&
    !isDeleted &&
    parseMentionedMemberIds(message.body, memberNamesById).includes(currentUserId)
  );
  const rowClassName =
    `message-row${message.pinnedAt ? " pinned" : ""}${isDeleted ? " deleted" : ""}${mentionedCurrentUser ? " mentioned" : ""}`;

  function closeMenus() {
    setReactionPickerOpen(false);
    setForwardMenuOpen(false);
    setMoreMenuOpen(false);
  }

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editing.body.trim() || !onEdit) return;
    onEdit(editing.id, editing.body.trim());
    setEditing(undefined);
  }

  function reactWith(messageId: string, emoji: string) {
    if (!onReact) return;
    onRememberReaction(emoji);
    onReact(messageId, emoji);
  }

  function forwardTo(target: MessageForwardTarget) {
    setForwardMenuOpen(false);
    onForward?.(message, target);
  }

  return (
    <article className={rowClassName} id={pinnedCopy ? undefined : messageAnchorId(message.id)} tabIndex={-1} key={instanceKey}>
      {message.authorId ? (
        <MemberContextMenu currentUserId={currentUserId} memberId={message.authorId} memberName={name} onDirectMessage={onDirectMessage}>
          {avatar}
        </MemberContextMenu>
      ) : avatar}
      <div className="message-content">
        <div className="message-meta">
          <strong>{name}</strong>
          {message.createdAt ? <time dateTime={new Date(message.createdAt).toISOString()}>{formatMessageTime(message.createdAt)}</time> : null}
          {message.pinnedAt ? <span className="pin-label">Pinned</span> : null}
          <a className="message-permalink" href={messageHref(message.id)} aria-label={`Link to message from ${name}`} title="Message link" onClick={() => focusMessage(message.id)}>#</a>
        </div>
        {message.replyToId ? <ReplyPreview message={replyMessage} memberNamesById={memberNamesById} onFollow={focusMessage} /> : null}
        {isDeleted ? (
          <p className="message-tombstone">Message deleted</p>
        ) : !pinnedCopy && editing?.id === message.id ? (
          <form className="edit-form" onSubmit={submitEdit}>
            <input
              aria-label={`Edit message from ${name}`}
              value={editing.body}
              onChange={(event) => setEditing({ id: message.id, body: event.target.value })}
            />
            <button className="primary-action" type="submit">Save</button>
            <button className="ghost-action" type="button" onClick={() => setEditing(undefined)}>Cancel</button>
          </form>
        ) : (
          <MarkdownMessage
            body={message.body}
            currentUserId={currentUserId}
            memberNamesById={memberNamesById}
            onDirectMessage={onDirectMessage}
          />
        )}
        {!isDeleted && canReact ? (
          <div className="message-reactions">
            {reactions.map(([emoji, members]) => (
              <button key={emoji} type="button" onClick={() => reactWith(message.id, emoji)}>{emoji} {members.length}</button>
            ))}
            {reactionCount(message.reactions) === 0 ? <span>No reactions</span> : null}
          </div>
        ) : null}
        {!isDeleted && canReact && reactionPickerOpen ? (
          <InlineEmojiPicker
            ariaLabel="Reaction emoji picker"
            searchPlaceholder="Search reactions"
            onSelect={(emoji) => {
              reactWith(message.id, emoji);
              setReactionPickerOpen(false);
            }}
          />
        ) : null}
        {!isDeleted && forwardMenuOpen ? (
          <div className="message-forward-panel">
            <strong>Forward to</strong>
            <div className="message-forward-list">
              {forwardTargets.length === 0 ? <span>No other chats available</span> : null}
              {forwardTargets.map((target) => (
                <button key={target.id} type="button" aria-label={`Forward to ${target.label}`} onClick={() => forwardTo(target)}>
                  {target.type === "channel" ? "Channel" : "DM"}
                  <span>{target.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {!isDeleted ? (
        <div className="message-actions" aria-label={`Actions for ${name}`}>
          {canReact ? recentReactions.map((emoji) => (
            <button className="message-action-emoji" key={emoji} type="button" aria-label={`React with ${emoji}`} onClick={() => reactWith(message.id, emoji)}>
              {emoji}
            </button>
          )) : null}
          {canReact ? (
            <button className="message-action-icon" type="button" aria-label={`Choose reaction for message from ${name}`} title="Choose reaction" onClick={() => { closeMenus(); setReactionPickerOpen((open) => !open); }}>
              <SmileIcon />
            </button>
          ) : null}
          {onReply ? (
            <button className="message-action-icon" type="button" aria-label={`Reply to message from ${name}`} title="Reply" onClick={() => { closeMenus(); onReply(message); }}>
              <ReplyIcon />
            </button>
          ) : null}
          {onForward ? (
            <button className="message-action-icon" type="button" aria-label={`Forward message from ${name}`} title="Forward" onClick={() => { closeMenus(); setForwardMenuOpen((open) => !open); }}>
              <ForwardIcon />
            </button>
          ) : null}
          {showMore ? (
            <span className="message-more-wrap">
              <button className="message-action-icon" type="button" aria-label={`More actions for message from ${name}`} title="More" onClick={() => { closeMenus(); setMoreMenuOpen((open) => !open); }}>
                <MoreIcon />
              </button>
              {moreMenuOpen ? (
                <span className="message-more-menu" role="menu">
                  {canPin ? <button type="button" role="menuitem" onClick={() => { setMoreMenuOpen(false); message.pinnedAt ? onUnpin?.(message.id) : onPin?.(message.id); }}>{message.pinnedAt ? "Unpin" : "Pin"}</button> : null}
                  {canEdit ? <button type="button" role="menuitem" onClick={() => { setMoreMenuOpen(false); setEditing({ id: message.id, body: message.body }); }}>Edit</button> : null}
                  {canDelete ? <button type="button" role="menuitem" onClick={() => { setMoreMenuOpen(false); onDelete?.(message.id); }}>Delete</button> : null}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
