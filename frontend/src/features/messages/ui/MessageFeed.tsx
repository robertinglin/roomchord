import React, { useLayoutEffect, useRef, useState } from "react";
import type { Message } from "@entities/chat/model/types";
import { MessageComposer } from "@features/messages/ui/MessageComposer";
import { MessageRow } from "@features/messages/ui/MessageRow";
import { loadRecentReactions, rememberReaction } from "@features/messages/model/recentReactions";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";
import { MenuIcon } from "@shared/ui/Icons";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";

export type { MessageForwardTarget };

export type MessageFeedProps = {
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
  feedKey?: string;
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
};

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
  feedKey,
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
}: MessageFeedProps) {
  const [replyTo, setReplyTo] = useState<Message | undefined>();
  const [recentReactions, setRecentReactions] = useState(loadRecentReactions);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const lastFeedKeyRef = useRef<string | undefined>();
  const lastMessageIdRef = useRef<string | undefined>();
  const forceNextBottomRef = useRef(false);
  const sidebarOpen = useChatUiStore((value) => value.sidebarOpen);
  const ui = useChatUiActions();
  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const activeFeedKey = feedKey ?? `${mode}:${title}`;
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : undefined;
  const displayMessages = [
    ...messages.filter((message) => message.pinnedAt && !message.deletedAt).map((message) => ({ message, pinnedCopy: true, instanceKey: `${message.id}:pinned` })),
    ...messages.map((message) => ({ message, pinnedCopy: false, instanceKey: message.id }))
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

  function submitMessage(body: string) {
    forceNextBottomRef.current = true;
    scrollToBottom();
    if (replyTo && onReply) {
      onReply(replyTo.id, body);
      setReplyTo(undefined);
      return;
    }
    onSend(body);
  }

  return (
    <section className="chat-main" aria-labelledby="active-room-heading">
      <header className="chat-main-header">
        <button
          type="button"
          className="chat-mobile-nav-toggle"
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          onClick={() => ui.setSidebarOpen(!sidebarOpen)}
        >
          <MenuIcon />
        </button>
        <div>
          <h1 id="active-room-heading">{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </header>

      <div ref={listRef} className="message-list" role="log" aria-label={`${title} messages`} onScroll={updateScrollPosition}>
        {messages.length === 0 ? (
          <div className="empty-thread">
            <strong>No messages yet</strong>
            <span>Start the conversation in {title}.</span>
          </div>
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
            message={message}
            messagesById={messagesById}
            onDelete={onDelete}
            onDirectMessage={onDirectMessage}
            onEdit={onEdit}
            onForward={onForward}
            onPin={onPin}
            onReact={onReact}
            onRememberReaction={(emoji) => setRecentReactions((current) => rememberReaction(current, emoji))}
            onReply={onReply ? setReplyTo : undefined}
            onUnpin={onUnpin}
            pinnedCopy={pinnedCopy}
            recentReactions={recentReactions}
          />
        ))}
      </div>

      {showNewMessages ? (
        <div className="new-messages-wrap">
          <button className="new-messages-button" type="button" onClick={scrollToBottom}>
            New messages
          </button>
        </div>
      ) : null}

      <MessageComposer
        disabled={disabled}
        focusKey={focusKey}
        memberNamesById={memberNamesById}
        mode={mode}
        onCancelReply={() => setReplyTo(undefined)}
        onSend={submitMessage}
        replyTo={replyTo}
        title={title}
      />
    </section>
  );
}
