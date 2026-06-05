import React, { useEffect, useRef, useState } from "react";
import { createRoomkitEmojiPicker, type RoomkitEmojiPicker } from "roomkit-sdk/browser/emojiPicker";
import type { RoomkitEmoji } from "roomkit-sdk/browser/emojiData";
import { messageAnchorId, messageHref } from "../messageLinks";
import { reactionCount } from "../state";
import type { Message } from "../types";
import { Avatar } from "./Avatar";
import { ForwardIcon, LinkIcon, MoreIcon, ReplyIcon, SendArrowIcon, SmileIcon } from "./Icons";
import { MarkdownMessage } from "./MarkdownMessage";
import { MemberContextMenu } from "./MemberContextMenu";

const RECENT_REACTIONS_KEY = "roomkit:chord:recent-reactions:v1";
const DEFAULT_RECENT_REACTIONS = ["👍", "😂", "❤️"];
const COMPOSER_MAX_HEIGHT = 160;

export type MessageForwardTarget =
  | { id: string; type: "channel"; label: string; channelId: string }
  | { id: string; type: "dm"; label: string; threadId: string; userIds: string[] };

function authorName(message: Message, memberNamesById: Record<string, string>) {
  return message.authorName || (message.authorId ? memberNamesById[message.authorId] : undefined) || message.authorId || "Member";
}

function messageAvatar(message: Message, memberAvatarsById: Record<string, string>) {
  return message.authorImageUrl || message.authorAvatarUrl || message.authorAvatar || (message.authorId ? memberAvatarsById[message.authorId] : undefined);
}

function formatTime(value?: number) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function previewText(body: string) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (!normalized) return "Message has no text";
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function uniqueRecent(items: string[]) {
  return Array.from(new Set(items.filter(Boolean))).slice(0, 3);
}

function loadRecentReactions() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_REACTIONS_KEY) || "[]");
    if (Array.isArray(parsed)) {
      const saved = parsed.filter((item): item is string => typeof item === "string");
      return uniqueRecent([...saved, ...DEFAULT_RECENT_REACTIONS]);
    }
  } catch {
    return DEFAULT_RECENT_REACTIONS;
  }
  return DEFAULT_RECENT_REACTIONS;
}

function saveRecentReactions(reactions: string[]) {
  try {
    window.localStorage.setItem(RECENT_REACTIONS_KEY, JSON.stringify(reactions));
  } catch {
    return;
  }
}

function rememberReaction(current: string[], emoji: string) {
  const currentRecent = uniqueRecent([...current, ...DEFAULT_RECENT_REACTIONS]);
  const next = currentRecent.includes(emoji)
    ? currentRecent
    : uniqueRecent([emoji, ...currentRecent]);
  saveRecentReactions(next);
  return next;
}

function InlineEmojiPicker({ ariaLabel, searchPlaceholder, onSelect }: { ariaLabel: string; searchPlaceholder: string; onSelect: (emoji: string) => void }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<RoomkitEmojiPicker>();
  const selectRef = useRef(onSelect);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;
    pickerRef.current = createRoomkitEmojiPicker({
      target,
      ariaLabel,
      searchPlaceholder,
      onSelect(emoji: RoomkitEmoji) {
        selectRef.current(emoji.emoji);
      }
    });
    pickerRef.current.focus();
    return () => {
      pickerRef.current?.destroy();
      pickerRef.current = undefined;
    };
  }, []);

  return <div className="message-reaction-picker" ref={targetRef} />;
}

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
  const preview = previewText(message.body);
  return (
    <a className="reply-preview" href={messageHref(message.id)} aria-label={`Replying to ${name}: ${preview}`} onClick={() => onFollow(message.id)}>
      <span>Replying to {name}</span>
      <strong>{preview}</strong>
    </a>
  );
}

export function MessageFeed({
  title,
  subtitle,
  messages,
  memberNamesById = {},
  memberAvatarsById = {},
  forwardTargets = [],
  focusKey,
  currentUserId,
  mode,
  disabled,
  onSend,
  onReply,
  onReact,
  onForward,
  onPin,
  onUnpin,
  onDelete,
  onEdit,
  onDirectMessage,
  canDeleteMessage,
  canEditMessage
}: {
  title: string;
  subtitle?: string;
  messages: Message[];
  memberNamesById?: Record<string, string>;
  memberAvatarsById?: Record<string, string>;
  forwardTargets?: MessageForwardTarget[];
  focusKey?: number;
  currentUserId?: string;
  mode: "channel" | "dm";
  disabled?: boolean;
  onSend: (body: string) => void;
  onReply?: (messageId: string, body: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onForward?: (message: Message, target: MessageForwardTarget) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, body: string) => void;
  onDirectMessage?: (memberId: string) => void;
  canDeleteMessage?: (message: Message) => boolean;
  canEditMessage?: (message: Message) => boolean;
}) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Message | undefined>();
  const [editing, setEditing] = useState<{ id: string; body: string } | undefined>();
  const [reactionPickerFor, setReactionPickerFor] = useState<string | undefined>();
  const [forwardMenuFor, setForwardMenuFor] = useState<string | undefined>();
  const [moreMenuFor, setMoreMenuFor] = useState<string | undefined>();
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [recentReactions, setRecentReactions] = useState(loadRecentReactions);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const canReact = Boolean(onReact);
  const displayMessages = [
    ...messages.filter((message) => message.pinnedAt && !message.deletedAt).map((message) => ({ message, pinnedCopy: true, instanceKey: `${message.id}:pinned` })),
    ...messages.map((message) => ({ message, pinnedCopy: false, instanceKey: message.id }))
  ];

  useEffect(() => {
    if (focusKey === undefined) return;
    composerRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    resizeComposer();
  }, [body]);

  function resizeComposer() {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }

  function insertComposerText(text: string, selectionOffset = text.length) {
    const textarea = composerRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? start;
    const nextBody = `${body.slice(0, start)}${text}${body.slice(end)}`;
    const nextCursor = start + selectionOffset;
    setBody(nextBody);
    window.requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.setSelectionRange(nextCursor, nextCursor);
      resizeComposer();
    });
  }

  function insertLink() {
    const textarea = composerRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = body.slice(start, end);
    const label = selected || "link";
    const markdown = `[${label}](https://)`;
    insertComposerText(markdown, markdown.length - 1);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || disabled) return;
    if (replyTo && onReply) {
      onReply(replyTo.id, cleanBody);
      setReplyTo(undefined);
    } else {
      onSend(cleanBody);
    }
    setBody("");
  }

  function submitOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editing.body.trim() || !onEdit) return;
    onEdit(editing.id, editing.body.trim());
    setEditing(undefined);
  }

  function reactWith(messageId: string, emoji: string) {
    if (!onReact) return;
    setRecentReactions((current) => rememberReaction(current, emoji));
    onReact(messageId, emoji);
  }

  function toggleReactionPicker(messageId: string) {
    setReactionPickerFor((current) => current === messageId ? undefined : messageId);
    setForwardMenuFor(undefined);
    setMoreMenuFor(undefined);
  }

  function toggleForwardMenu(messageId: string) {
    setForwardMenuFor((current) => current === messageId ? undefined : messageId);
    setReactionPickerFor(undefined);
    setMoreMenuFor(undefined);
  }

  function toggleMoreMenu(messageId: string) {
    setMoreMenuFor((current) => current === messageId ? undefined : messageId);
    setReactionPickerFor(undefined);
    setForwardMenuFor(undefined);
  }

  function forwardTo(message: Message, target: MessageForwardTarget) {
    setForwardMenuFor(undefined);
    onForward?.(message, target);
  }

  function startReply(message: Message) {
    setReplyTo(message);
    setReactionPickerFor(undefined);
    setForwardMenuFor(undefined);
    composerRef.current?.focus();
  }

  function focusMessage(messageId: string) {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(messageAnchorId(messageId));
      target?.scrollIntoView?.({ block: "center" });
      target?.focus({ preventScroll: true });
    });
  }

  return (
    <section className="chat-main" aria-labelledby="active-room-heading">
      <header className="chat-main-header">
        <div>
          <h1 id="active-room-heading">{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </header>

      <div className="message-list" role="log" aria-label={`${title} messages`}>
        {messages.length === 0 ? (
          <div className="empty-thread">
            <strong>No messages yet</strong>
            <span>Start the conversation in {title}.</span>
          </div>
        ) : null}
        {displayMessages.map(({ message, pinnedCopy, instanceKey }) => {
          const name = authorName(message, memberNamesById);
          const isDeleted = Boolean(message.deletedAt);
          const reactions = Object.entries(message.reactions || {}).filter(([, members]) => members.length > 0);
          const canPin = Boolean((message.pinnedAt ? onUnpin : onPin) && !isDeleted);
          const canEdit = Boolean(!pinnedCopy && onEdit && !isDeleted && (!canEditMessage || canEditMessage(message)));
          const canDelete = Boolean(onDelete && !isDeleted && (!canDeleteMessage || canDeleteMessage(message)));
          const showMore = Boolean(canPin || canEdit || canDelete);
          const replyMessage = message.replyToId ? messagesById.get(message.replyToId) : undefined;
          const avatar = <Avatar name={name} avatar={messageAvatar(message, memberAvatarsById)} />;
          return (
            <article className={`message-row${message.pinnedAt ? " pinned" : ""}${isDeleted ? " deleted" : ""}`} id={pinnedCopy ? undefined : messageAnchorId(message.id)} tabIndex={-1} key={instanceKey}>
              {message.authorId ? (
                <MemberContextMenu currentUserId={currentUserId} memberId={message.authorId} memberName={name} onDirectMessage={onDirectMessage}>
                  {avatar}
                </MemberContextMenu>
              ) : avatar}
              <div className="message-content">
                <div className="message-meta">
                  <strong>{name}</strong>
                  {message.createdAt ? <time dateTime={new Date(message.createdAt).toISOString()}>{formatTime(message.createdAt)}</time> : null}
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
                  <MarkdownMessage body={message.body} />
                )}
                {!isDeleted && canReact ? (
                  <div className="message-reactions">
                    {reactions.map(([emoji, members]) => (
                      <button key={emoji} type="button" onClick={() => reactWith(message.id, emoji)}>{emoji} {members.length}</button>
                    ))}
                    {reactionCount(message.reactions) === 0 ? <span>No reactions</span> : null}
                  </div>
                ) : null}
                {!isDeleted && canReact && reactionPickerFor === instanceKey ? (
                  <InlineEmojiPicker
                    ariaLabel="Reaction emoji picker"
                    searchPlaceholder="Search reactions"
                    onSelect={(emoji) => {
                      reactWith(message.id, emoji);
                      setReactionPickerFor(undefined);
                    }}
                  />
                ) : null}
                {!isDeleted && forwardMenuFor === instanceKey ? (
                  <div className="message-forward-panel">
                    <strong>Forward to</strong>
                    <div className="message-forward-list">
                      {forwardTargets.length === 0 ? <span>No other chats available</span> : null}
                      {forwardTargets.map((target) => (
                        <button key={target.id} type="button" aria-label={`Forward to ${target.label}`} onClick={() => forwardTo(message, target)}>
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
                    <button className="message-action-icon" type="button" aria-label={`Choose reaction for message from ${name}`} title="Choose reaction" onClick={() => toggleReactionPicker(instanceKey)}>
                      <SmileIcon />
                    </button>
                  ) : null}
                  {onReply ? (
                    <button className="message-action-icon" type="button" aria-label={`Reply to message from ${name}`} title="Reply" onClick={() => startReply(message)}>
                      <ReplyIcon />
                    </button>
                  ) : null}
                  {onForward ? (
                    <button className="message-action-icon" type="button" aria-label={`Forward message from ${name}`} title="Forward" onClick={() => toggleForwardMenu(instanceKey)}>
                      <ForwardIcon />
                    </button>
                  ) : null}
                  {showMore ? (
                    <span className="message-more-wrap">
                      <button className="message-action-icon" type="button" aria-label={`More actions for message from ${name}`} title="More" onClick={() => toggleMoreMenu(instanceKey)}>
                        <MoreIcon />
                      </button>
                      {moreMenuFor === instanceKey ? (
                        <span className="message-more-menu" role="menu">
                          {canPin ? <button type="button" role="menuitem" onClick={() => { setMoreMenuFor(undefined); message.pinnedAt ? onUnpin?.(message.id) : onPin?.(message.id); }}>{message.pinnedAt ? "Unpin" : "Pin"}</button> : null}
                          {canEdit ? <button type="button" role="menuitem" onClick={() => { setMoreMenuFor(undefined); setEditing({ id: message.id, body: message.body }); }}>Edit</button> : null}
                          {canDelete ? <button type="button" role="menuitem" onClick={() => { setMoreMenuFor(undefined); onDelete?.(message.id); }}>Delete</button> : null}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <footer className="composer-wrap">
        {replyTo ? (
          <div className="replying-bar">
            <span>
              <strong>Replying to {authorName(replyTo, memberNamesById)}</strong>
              <small>{previewText(replyTo.body)}</small>
            </span>
            <button type="button" onClick={() => setReplyTo(undefined)}>Cancel</button>
          </div>
        ) : null}
        <form className="message-composer" onSubmit={submit}>
          <textarea
            ref={composerRef}
            aria-label={`Message ${title}`}
            rows={1}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={submitOnEnter}
            placeholder={`Message ${title}`}
            disabled={disabled}
          />
          <span className="composer-inline-tools">
            <button className="composer-tool-button" type="button" aria-label="Insert link" title="Insert link" disabled={disabled} onClick={insertLink}>
              <LinkIcon />
            </button>
            <button className="composer-tool-button" type="button" aria-label="Add emoji" title="Add emoji" disabled={disabled} onClick={() => setComposerEmojiOpen((open) => !open)}>
              <SmileIcon />
            </button>
          </span>
          <button
            className="composer-send-button"
            type="submit"
            aria-label={mode === "dm" ? "Send DM" : "Send message"}
            title={mode === "dm" ? "Send DM" : "Send message"}
            disabled={disabled || !body.trim()}
          >
            <SendArrowIcon />
          </button>
        </form>
        {composerEmojiOpen ? (
          <InlineEmojiPicker
            ariaLabel="Message emoji picker"
            searchPlaceholder="Search emoji"
            onSelect={(emoji) => {
              insertComposerText(emoji);
              setComposerEmojiOpen(false);
            }}
          />
        ) : null}
      </footer>
    </section>
  );
}
