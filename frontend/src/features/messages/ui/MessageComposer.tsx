import React, { useEffect, useRef, useState } from "react";
import type { Message } from "@entities/chat/model/types";
import { LinkIcon, SendArrowIcon, SmileIcon } from "@shared/ui/Icons";
import { InlineEmojiPicker } from "@features/messages/ui/InlineEmojiPicker";
import { authorName, previewText } from "@features/messages/model/messageDisplay";

const COMPOSER_MAX_HEIGHT = 160;

export function MessageComposer({
  disabled,
  focusKey,
  memberNamesById,
  mode,
  onCancelReply,
  onSend,
  replyTo,
  title
}: {
  disabled?: boolean;
  focusKey?: number;
  memberNamesById: Record<string, string>;
  mode: "channel" | "dm";
  onCancelReply: () => void;
  onSend: (body: string) => void;
  replyTo?: Message;
  title: string;
}) {
  const [body, setBody] = useState("");
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

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
    onSend(cleanBody);
    setBody("");
  }

  function submitOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <footer className="composer-wrap">
      {replyTo ? (
        <div className="replying-bar">
          <span>
            <strong>Replying to {authorName(replyTo, memberNamesById)}</strong>
            <small>{previewText(replyTo.body)}</small>
          </span>
          <button type="button" onClick={onCancelReply}>Cancel</button>
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
  );
}
