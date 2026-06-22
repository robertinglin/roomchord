import React, { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { messageAnchorId, messageHref } from "@entities/chat/model/messageLinks";
import type { Message } from "@entities/chat/model/types";
import { Avatar } from "@shared/ui/Avatar";
import { ForwardIcon, MoreIcon, ReplyIcon, SmileIcon } from "@shared/ui/Icons";
import { MarkdownMessage } from "@features/messages/ui/MarkdownMessage";
import { MemberContextMenu } from "@shared/ui/MemberContextMenu";
import { InlineEmojiPicker } from "@features/messages/ui/InlineEmojiPicker";
import { authorName, focusMessage, formatMessageTime, messageAvatar, previewText } from "@features/messages/model/messageDisplay";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";
import { parseMentionedMemberIds, renderMentionNames } from "@entities/chat/model/mentions";
import { tokens } from "../../../shared/ui/theme.stylex";

type MessageMenuPosition = { anchored: true } | { anchored: false; x: number; y: number };

type MessageMenuItem = {
  ariaLabel?: string;
  disabled?: boolean;
  icon?: string;
  id: string;
  label: string;
  onSelect?: () => void;
  sectionBefore?: boolean;
  variant?: "danger";
};

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: "40px minmax(0, 1fr)",
    columnGap: "12px",
    rowGap: 0,
    padding: "7px 16px",
    position: "relative",
  },
  content: {
    minWidth: 0,
    display: "grid",
    justifyItems: "start",
  },
  head: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    marginBottom: "2px",
    minWidth: 0,
  },
  name: {
    color: tokens.fg,
    fontSize: "15px",
    fontWeight: 700,
  },
  nameYou: {
    color: tokens.accent,
  },
  time: {
    color: tokens.quiet,
    fontSize: "11px",
  },
  role: {
    padding: "1px 5px",
    borderRadius: "4px",
    backgroundColor: tokens.accentSoft,
    color: tokens.mentionFg,
    fontSize: "10px",
    fontWeight: 700,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    justifySelf: "start",
    marginTop: "5px",
    opacity: 0,
  },
});

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
  const [messageMenuPosition, setMessageMenuPosition] = useState<MessageMenuPosition | undefined>();
  const name = authorName(message, memberNamesById);
  const isDeleted = Boolean(message.deletedAt);
  const reactions = Object.entries(message.reactions || {}).filter(([, members]) => members.length > 0);
  const canPin = Boolean((message.pinnedAt ? onUnpin : onPin) && !isDeleted);
  const canEdit = Boolean(!pinnedCopy && onEdit && !isDeleted && (!canEditMessage || canEditMessage(message)));
  const canDelete = Boolean(onDelete && !isDeleted && (!canDeleteMessage || canDeleteMessage(message)));
  const canReact = Boolean(onReact);
  const showMore = !isDeleted;
  const replyMessage = message.replyToId ? messagesById.get(message.replyToId) : undefined;
  const avatar = <Avatar className="msg-av" name={name} avatar={messageAvatar(message, memberAvatarsById)} />;
  const authoredByCurrentUser = Boolean(currentUserId && message.authorId === currentUserId);
  const mentionedCurrentUser = Boolean(
    currentUserId &&
    !isDeleted &&
    parseMentionedMemberIds(message.body, memberNamesById).includes(currentUserId)
  );
  const rowClassName =
    `msg${message.pinnedAt ? " pinned" : ""}${isDeleted ? " deleted" : ""}${mentionedCurrentUser ? " mentioned" : ""}`;

  function closeMenus() {
    setReactionPickerOpen(false);
    setForwardMenuOpen(false);
    setMessageMenuPosition(undefined);
  }

  function openMessageMenuAt(x: number, y: number) {
    const menuWidth = 244;
    const menuHeight = 446;
    setMessageMenuPosition({
      anchored: false,
      x: Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8))
    });
  }

  function copyText(value: string) {
    void navigator.clipboard?.writeText(value);
  }

  function messageLink() {
    if (typeof window === "undefined") return messageHref(message.id);
    return new URL(messageHref(message.id), window.location.href).toString();
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

  const messageMenuItems: MessageMenuItem[] = [
    {
      disabled: !canReact,
      icon: "›",
      id: "add-reaction",
      label: "Add Reaction",
      onSelect: () => {
        setMessageMenuPosition(undefined);
        setReactionPickerOpen(true);
      }
    },
    {
      ariaLabel: canEdit ? "Edit" : undefined,
      disabled: !canEdit,
      icon: "✎",
      id: "edit",
      label: "Edit Message",
      onSelect: () => setEditing({ id: message.id, body: message.body }),
      sectionBefore: true
    },
    {
      disabled: !onReply,
      icon: "↩",
      id: "reply",
      label: "Reply",
      onSelect: () => onReply?.(message)
    },
    {
      disabled: !onForward,
      icon: "↪",
      id: "forward",
      label: "Forward",
      onSelect: () => setForwardMenuOpen(true)
    },
    { disabled: true, icon: "▥", id: "create-thread", label: "Create Thread" },
    { icon: "⧉", id: "copy-text", label: "Copy Text", onSelect: () => copyText(message.body), sectionBefore: true },
    {
      ariaLabel: canPin ? (message.pinnedAt ? "Unpin" : "Pin") : undefined,
      disabled: !canPin,
      icon: "⌖",
      id: "pin",
      label: message.pinnedAt ? "Unpin Message" : "Pin Message",
      onSelect: () => message.pinnedAt ? onUnpin?.(message.id) : onPin?.(message.id)
    },
    { disabled: true, icon: "›", id: "apps", label: "Apps" },
    { disabled: true, icon: "◔", id: "mark-unread", label: "Mark Unread" },
    { icon: "🔗", id: "copy-link", label: "Copy Message Link", onSelect: () => copyText(messageLink()) },
    { disabled: true, icon: "◉", id: "speak", label: "Speak Message" },
    {
      ariaLabel: canDelete ? "Delete" : undefined,
      disabled: !canDelete,
      icon: "⌫",
      id: "delete",
      label: "Delete Message",
      onSelect: () => onDelete?.(message.id),
      sectionBefore: true,
      variant: "danger"
    }
  ];

  function selectMessageMenuItem(item: MessageMenuItem) {
    if (item.disabled || !item.onSelect) return;
    setMessageMenuPosition(undefined);
    item.onSelect();
  }

  return (
    <article
      className={`${rowClassName} ${stylex.props(styles.row).className}`}
      style={stylex.props(styles.row).style}
      id={pinnedCopy ? undefined : messageAnchorId(message.id)}
      tabIndex={-1}
      key={instanceKey}
      onContextMenu={(event) => {
        if (!showMore) return;
        event.preventDefault();
        closeMenus();
        openMessageMenuAt(event.clientX, event.clientY);
      }}
    >
      {message.authorId ? (
        <MemberContextMenu currentUserId={currentUserId} memberId={message.authorId} memberName={name} onDirectMessage={onDirectMessage}>
          {avatar}
        </MemberContextMenu>
      ) : avatar}
      <div className={`msg-content ${stylex.props(styles.content).className}`} style={stylex.props(styles.content).style}>
        <div className={`msg-head ${stylex.props(styles.head).className}`} style={stylex.props(styles.head).style}>
          <span
            className={`msg-name${authoredByCurrentUser ? " you" : ""} ${stylex.props(styles.name, authoredByCurrentUser && styles.nameYou).className}`}
            style={stylex.props(styles.name, authoredByCurrentUser && styles.nameYou).style}
          >
            {name}
          </span>
          {message.pinnedAt ? (
            <span className={`msg-role ${stylex.props(styles.role).className}`} style={stylex.props(styles.role).style}>Pinned</span>
          ) : authoredByCurrentUser ? (
            <span className={`msg-role ${stylex.props(styles.role).className}`} style={stylex.props(styles.role).style}>You</span>
          ) : null}
          {message.createdAt ? (
            <time className={`msg-time ${stylex.props(styles.time).className}`} style={stylex.props(styles.time).style} dateTime={new Date(message.createdAt).toISOString()}>
              {formatMessageTime(message.createdAt)}
            </time>
          ) : null}
          <a className="message-permalink" href={messageHref(message.id)} aria-label={`Link to message from ${name}`} title="Message link" onClick={() => focusMessage(message.id)}>#</a>
        </div>
        {message.replyToId ? <ReplyPreview message={replyMessage} memberNamesById={memberNamesById} onFollow={focusMessage} /> : null}
        {isDeleted ? (
          <p className="msg-body message-tombstone">Message deleted</p>
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
        {!isDeleted && canReact && reactions.length > 0 ? (
          <div className="reactions">
            {reactions.map(([emoji, members]) => (
              <button className={`react${currentUserId && members.some((memberId) => String(memberId) === currentUserId) ? " mine" : ""}`} key={emoji} type="button" onClick={() => reactWith(message.id, emoji)}>{emoji} {members.length}</button>
            ))}
          </div>
        ) : null}
        {!isDeleted ? (
          <div className={`msg-actions ${stylex.props(styles.actions).className}`} style={stylex.props(styles.actions).style} aria-label={`Actions for ${name}`}>
            {canReact ? recentReactions.map((emoji) => (
              <button className="message-action-emoji" key={emoji} type="button" aria-label={`React with ${emoji}`} onClick={() => reactWith(message.id, emoji)}>
                {emoji}
              </button>
            )) : null}
            {canReact ? (
              <button className="message-action-icon" type="button" aria-label={`Choose reaction for message from ${name}`} title="Choose reaction" onClick={() => { closeMenus(); setReactionPickerOpen((open) => !open); }}>
                <SmileIcon className="ico" />
              </button>
            ) : null}
            {onReply ? (
              <button className="message-action-icon" type="button" aria-label={`Reply to message from ${name}`} title="Reply" onClick={() => { closeMenus(); onReply(message); }}>
                <ReplyIcon className="ico" />
              </button>
            ) : null}
            {onForward ? (
              <button className="message-action-icon" type="button" aria-label={`Forward message from ${name}`} title="Forward" onClick={() => { closeMenus(); setForwardMenuOpen((open) => !open); }}>
                <ForwardIcon className="ico" />
              </button>
            ) : null}
            {showMore ? (
              <span className="message-more-wrap">
                <button
                  className="message-action-icon"
                  type="button"
                  aria-label={`More actions for message from ${name}`}
                  title="More"
                  onClick={() => {
                    const open = Boolean(messageMenuPosition);
                    closeMenus();
                    if (!open) setMessageMenuPosition({ anchored: true });
                  }}
                >
                  <MoreIcon className="ico" />
                </button>
                {messageMenuPosition ? (
                  <>
                    <span className="context-menu-shroud" role="presentation" onMouseDown={closeMenus} />
                    <span
                      className={`message-more-menu rich-context-menu${messageMenuPosition.anchored ? "" : " fixed"}`}
                      role="menu"
                      style={messageMenuPosition.anchored ? undefined : { left: messageMenuPosition.x, top: messageMenuPosition.y }}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {canReact ? (
                        <span className="message-menu-reaction-row">
                          {(recentReactions.length ? recentReactions : ["👍", "😆", "😂", "🤘"]).slice(0, 4).map((emoji) => (
                            <button key={emoji} type="button" aria-label={`React with ${emoji}`} onClick={() => reactWith(message.id, emoji)}>
                              {emoji}
                            </button>
                          ))}
                        </span>
                      ) : null}
                      {messageMenuItems.map((item) => (
                        <button
                          aria-label={item.ariaLabel}
                          className={`${item.sectionBefore ? "sectioned" : ""}${item.variant === "danger" ? " danger" : ""}`}
                          disabled={item.disabled}
                          type="button"
                          role="menuitem"
                          onClick={() => selectMessageMenuItem(item)}
                          key={item.id}
                        >
                          <span>
                            <strong>{item.label}</strong>
                          </span>
                          {item.icon ? <span className="context-menu-icon">{item.icon}</span> : null}
                        </button>
                      ))}
                    </span>
                  </>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}
        {!isDeleted && canReact && reactionPickerOpen ? (
          <>
            <span className="context-menu-shroud" role="presentation" onMouseDown={closeMenus} />
            <span className="context-menu-popover reaction-menu-popover" onMouseDown={(event) => event.stopPropagation()}>
              <InlineEmojiPicker
                ariaLabel="Reaction emoji picker"
                searchPlaceholder="Search reactions"
                onSelect={(emoji) => {
                  reactWith(message.id, emoji);
                  setReactionPickerOpen(false);
                }}
              />
            </span>
          </>
        ) : null}
        {!isDeleted && forwardMenuOpen ? (
          <>
            <span className="context-menu-shroud" role="presentation" onMouseDown={closeMenus} />
            <div className="message-forward-panel context-menu-popover" onMouseDown={(event) => event.stopPropagation()}>
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
          </>
        ) : null}
      </div>
    </article>
  );
}
