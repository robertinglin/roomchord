import React, { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { Message } from "@entities/chat/model/types";
import { InlineEmojiPicker } from "@features/messages/ui/InlineEmojiPicker";
import { authorName, previewText } from "@features/messages/model/messageDisplay";
import { mentionToken } from "@entities/chat/model/mentions";
import { Button, ExternalLinkGlyph, SendGlyph, SmileGlyph } from "@shared/ui/design";
import { tokens } from "../../../shared/ui/theme.stylex";

const ZWSP = "\u200B"; // zero-width space used as a caret anchor around pills
const MENTION_QUERY_RE = /(?:^|[\s\u200B])@([^\n@]*)$/u;

type MentionCandidate = { id: string; name: string };

const styles = stylex.create({
  wrap: { flex: "0 0 auto", padding: "0 16px 18px" },
  reply: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "10px",
    margin: "0 0 8px",
    padding: "8px 10px",
    borderRadius: tokens.radiusItem,
    backgroundColor: tokens.surface,
    boxShadow: tokens.elevCtrl,
  },
  replyCopy: { minWidth: 0, display: "grid", gap: "2px" },
  replyTitle: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.fg,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },
  replyText: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.quiet,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },
  box: {
    position: "relative",
    overflow: "visible",
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surface,
    boxShadow: tokens.elevPanel,
  },
  top: { display: "flex", alignItems: "center", gap: "2px", padding: "6px 6px 0" },
  input: {
    width: "100%",
    minHeight: "46px",
    maxHeight: "160px",
    overflowY: "auto",
    padding: "6px 14px 8px",
    border: 0,
    outline: "none",
    backgroundColor: "transparent",
    color: tokens.fg,
    fontSize: "15px",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
    ":empty::before": { content: "attr(data-placeholder)", color: tokens.quiet },
  },
  mentionMenu: {
    position: "absolute",
    left: "10px",
    right: "10px",
    bottom: "calc(100% + 8px)",
    zIndex: 12,
    display: "grid",
    gap: "4px",
    padding: "6px",
    border: `1px solid ${tokens.borderSoft}`,
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surfaceDeep,
    boxShadow: tokens.elevPanel,
  },
  mentionOption: {
    minHeight: "32px",
    padding: "0 10px",
    border: 0,
    borderRadius: tokens.radiusItem,
    backgroundColor: "transparent",
    color: tokens.muted,
    textAlign: "left",
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.panelHover, color: tokens.fg },
  },
  mentionSelected: { backgroundColor: tokens.panelActive, color: tokens.fg },
  bottom: { display: "flex", alignItems: "center", gap: "8px", padding: "4px 10px 8px" },
  left: { display: "flex", gap: "2px" },
  length: {
    marginLeft: "auto",
    color: tokens.quiet,
    fontFamily: tokens.fontMono,
    fontSize: "11px",
  },
});

function mentionCandidates(memberNamesById: Record<string, string>, query: string) {
  const normalizedQuery = query.toLowerCase();
  return Object.entries(memberNamesById)
    .map(([id, name]) => ({ id, name }))
    .filter((member) => member.name.toLowerCase().includes(normalizedQuery) || member.id.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => {
      const leftStarts = left.name.toLowerCase().startsWith(normalizedQuery) || left.id.toLowerCase().startsWith(normalizedQuery);
      const rightStarts = right.name.toLowerCase().startsWith(normalizedQuery) || right.id.toLowerCase().startsWith(normalizedQuery);
      if (leftStarts === rightStarts) return 0;
      return leftStarts ? -1 : 1;
    })
    .slice(0, 6);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * The active "@query" immediately before the caret, or null.
 * Only fires when the caret is collapsed inside a text node of the editor.
 */
function queryAtCaret(editor: HTMLElement): { node: Text; offset: number; query: string } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
  const node = range.startContainer as Text;
  const match = (node.textContent ?? "").slice(0, range.startOffset).match(MENTION_QUERY_RE);
  if (!match) return null;
  return { node, offset: range.startOffset, query: match[1] };
}

/** Serialize editor DOM to plain text. Mentions become stable member-id tokens; &nbsp; becomes a space; ZWSP anchors are dropped. */
function serialize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u00A0/g, " ").replace(/\u200B/g, "");
  }
  if (!(node instanceof HTMLElement)) return "";
  if (node.classList.contains("composer-mention")) {
    const memberId = node.dataset.mentionId;
    return memberId ? mentionToken(memberId) : node.textContent ?? "";
  }
  if (node.tagName === "BR") return "\n";
  const inner = Array.from(node.childNodes).map(serialize).join("");
  return node.tagName === "DIV" || node.tagName === "P" ? `\n${inner}` : inner;
}

/**
 * A contenteditable=false node at the very start/end of the editor (or two adjacent
 * ones) has no text position next to it, so the caret can't reach that side with
 * arrow keys. Keep a zero-width-space text node as a caret anchor at those spots.
 */
function ensureCaretAnchors(editor: HTMLElement) {
  for (const pill of Array.from(editor.querySelectorAll(".composer-mention"))) {
    const prev = pill.previousSibling;
    if (!prev || (prev instanceof HTMLElement && prev.classList.contains("composer-mention"))) {
      editor.insertBefore(document.createTextNode(ZWSP), pill);
    }
    const next = pill.nextSibling;
    if (!next) {
      editor.appendChild(document.createTextNode(ZWSP));
    }
  }
}

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
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [contentLength, setContentLength] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);

  const mentionOptions = mentionQuery === null ? [] : mentionCandidates(memberNamesById, mentionQuery);
  const mentionMenuOpen = mentionOptions.length > 0;

  useEffect(() => {
    if (focusKey === undefined) return;
    editorRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionQuery]);

  // The mention query depends on caret position, not just content, so track it on
  // every selection change (typing, arrows, clicks) while the editor is focused.
  useEffect(() => {
    function onSelectionChange() {
      const editor = editorRef.current;
      if (!editor || document.activeElement !== editor) return;
      const hit = queryAtCaret(editor);
      setMentionQuery(hit ? hit.query : null);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  function refreshContentState() {
    const editor = editorRef.current;
    if (!editor) return;
    ensureCaretAnchors(editor);
    const text = (editor.textContent ?? "").replace(/\u200B/g, "");
    const hasMentions = editor.querySelector(".composer-mention") !== null;
    // Leftover <br> or stray ZWSP anchors after deleting everything break the :empty placeholder.
    if (!hasMentions && text.length === 0 && editor.childNodes.length > 0) {
      editor.innerHTML = "";
    }
    setHasContent(hasMentions || text.trim().length > 0);
    setContentLength(Array.from(editor.childNodes).map(serialize).join("").trim().length);
    const hit = queryAtCaret(editor);
    setMentionQuery(hit ? hit.query : null);
  }

  /** execCommand keeps the browser's native undo stack intact, which manual DOM edits would destroy. */
  function insertText(text: string) {
    editorRef.current?.focus();
    document.execCommand("insertText", false, text);
    refreshContentState();
  }

  function insertLink() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    const selected = selection && editor.contains(selection.anchorNode) ? selection.toString() : "";
    document.execCommand("insertText", false, `[${selected || "link"}](https://)`);
    // Place the caret just before the closing paren.
    selection?.modify?.("move", "backward", "character");
    refreshContentState();
  }

  function insertMention(member: MentionCandidate) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const hit = queryAtCaret(editor);
    if (!hit) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    // Select the "@query" text so insertHTML replaces it.
    const range = selection.getRangeAt(0);
    range.setStart(hit.node, hit.offset - hit.query.length - 1);
    selection.removeAllRanges();
    selection.addRange(range);
    const pill =
      `<span class="composer-mention" data-mention-id="${escapeHtml(member.id)}" contenteditable="false">` +
      `@${escapeHtml(member.name)}</span>&nbsp;`;
    document.execCommand("insertHTML", false, pill);
    setMentionQuery(null);
    refreshContentState();
  }

  function submitMessage() {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    const body = Array.from(editor.childNodes).map(serialize).join("").trim();
    if (!body) return;
    onSend(body);
    editor.innerHTML = "";
    setHasContent(false);
    setContentLength(0);
    setMentionQuery(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (mentionMenuOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSelectedMentionIndex((current) => (current + direction + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        insertMention(mentionOptions[selectedMentionIndex % mentionOptions.length]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (event.key === "Escape" && composerEmojiOpen) {
      event.preventDefault();
      setComposerEmojiOpen(false);
      return;
    }

    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (event.shiftKey) {
        document.execCommand("insertLineBreak");
        refreshContentState();
      } else {
        submitMessage();
      }
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    refreshContentState();
  }

  return (
    <footer {...stylex.props(styles.wrap)}>
      {replyTo ? (
        <div {...stylex.props(styles.reply)}>
          <span {...stylex.props(styles.replyCopy)}>
            <strong {...stylex.props(styles.replyTitle)}>Replying to {authorName(replyTo, memberNamesById)}</strong>
            <small {...stylex.props(styles.replyText)}>{previewText(replyTo.body)}</small>
          </span>
          <Button variant="etched" tone="muted" onClick={onCancelReply}>Cancel</Button>
        </div>
      ) : null}
      <div {...stylex.props(styles.box)}>
        <div {...stylex.props(styles.top)}>
          <Button tone="accent" aria-label="Insert link" title="Insert link" disabled={disabled} onClick={insertLink}>
            <ExternalLinkGlyph size={16} />
          </Button>
        </div>
        <div
          ref={editorRef}
          {...stylex.props(styles.input)}
          contentEditable={!disabled}
          role="textbox"
          aria-multiline="true"
          aria-label={`Message ${title}`}
          data-placeholder={`Message ${title}`}
          onInput={refreshContentState}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
        {mentionMenuOpen ? (
          <div {...stylex.props(styles.mentionMenu)} role="listbox" aria-label="Mention suggestions">
            {mentionOptions.map((member, index) => (
              <button
                aria-selected={index === selectedMentionIndex}
                {...stylex.props(styles.mentionOption, index === selectedMentionIndex && styles.mentionSelected)}
                key={member.id}
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertMention(member)}
              >
                {member.name}
              </button>
            ))}
          </div>
        ) : null}
        <div {...stylex.props(styles.bottom)}>
          <span {...stylex.props(styles.left)}>
            <Button aria-label="Add emoji" title="Add emoji" disabled={disabled} onClick={() => setComposerEmojiOpen((open) => !open)}>
              <SmileGlyph size={16} />
            </Button>
          </span>
          <span {...stylex.props(styles.length)} aria-live="polite">{contentLength} / 2000</span>
          <Button
            variant="solid"
            tone="accent"
            aria-label={mode === "dm" ? "Send DM" : "Send message"}
            title={mode === "dm" ? "Send DM" : "Send message"}
            disabled={disabled || !hasContent}
            onClick={submitMessage}
          >
            <SendGlyph size={15} />
            Send
          </Button>
        </div>
      </div>
      {composerEmojiOpen ? (
        <InlineEmojiPicker
          ariaLabel="Message emoji picker"
          searchPlaceholder="Search emoji"
          onSelect={(emoji) => {
            insertText(emoji);
            setComposerEmojiOpen(false);
          }}
        />
      ) : null}
    </footer>
  );
}
