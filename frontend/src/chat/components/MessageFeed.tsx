import React, { useState } from "react";
import type { Message } from "../types";
import { MessageComposer } from "./messages/MessageComposer";
import { MessageRow } from "./messages/MessageRow";
import { loadRecentReactions, rememberReaction } from "./messages/recentReactions";
import type { MessageForwardTarget } from "./messages/types";

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
  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const displayMessages = [
    ...messages.filter((message) => message.pinnedAt && !message.deletedAt).map((message) => ({ message, pinnedCopy: true, instanceKey: `${message.id}:pinned` })),
    ...messages.map((message) => ({ message, pinnedCopy: false, instanceKey: message.id }))
  ];

  function submitMessage(body: string) {
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
