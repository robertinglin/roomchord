import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseMarkdown,
  type MarkdownDocument,
  type MarkdownEmbed,
  type MarkdownNode,
type MarkdownToken
} from "matterhorn-sdk/browser/markdown";
import {
  MATTERHORN_EMBED_FRAME_ALLOW,
  MATTERHORN_EMBED_FRAME_SANDBOX,
  matterhornEmbedExternalUrl,
  matterhornEmbedFrameUrl,
  matterhornEmbedProviderLabel,
  matterhornEmbedSourceUrl,
  matterhornEmbedSupportsFullscreenDialog,
  matterhornEmbedTitle
} from "matterhorn-sdk/browser/embedFrame";
import { mentionSegments, renderMentionNames } from "@entities/chat/model/mentions";
import { CloseIcon, MaximizeIcon } from "@shared/ui/Icons";
import { MemberContextMenu } from "@shared/ui/MemberContextMenu";

const SINGLE_EMOJI_RE = /^(?:[\d#*]\uFE0F?\u20E3|\p{Regional_Indicator}{2}|\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?)*)$/u;

function parseBody(body: string): MarkdownDocument {
  try {
    return parseMarkdown(body || "");
  } catch {
    // Never let an unparseable message blank out the feed; fall back to plain text.
    return { kind: "matterhorn.markdown-document", version: 1, nodes: [{ type: "paragraph", text: body, children: [{ type: "text", value: body }] }], embeds: [], text: body, embedCount: 0 };
  }
}

function singleEmojiBody(body: string) {
  const trimmed = body.trim();
  return SINGLE_EMOJI_RE.test(trimmed) ? trimmed : undefined;
}

function InlineText({
  currentUserId,
  memberNamesById,
  onDirectMessage,
  value
}: {
  currentUserId?: string;
  memberNamesById: Record<string, string>;
  onDirectMessage?: (memberId: string) => void;
  value: string;
}) {
  return (
    <>
      {mentionSegments(value, memberNamesById).map((segment, index) => {
        if (segment.type === "text") return <React.Fragment key={index}>{segment.text}</React.Fragment>;
        return (
          <MemberContextMenu
            currentUserId={currentUserId}
            memberId={segment.memberId}
            memberName={memberNamesById[segment.memberId] || segment.memberId}
            onDirectMessage={onDirectMessage}
            key={index}
          >
            <span className="message-mention" data-member-id={segment.memberId}>{segment.text}</span>
          </MemberContextMenu>
        );
      })}
    </>
  );
}

function Inline({
  currentUserId,
  memberNamesById,
  onDirectMessage,
  onFullscreen,
  tokens
}: {
  currentUserId?: string;
  memberNamesById: Record<string, string>;
  onDirectMessage?: (memberId: string) => void;
  onFullscreen?: (embed: MarkdownEmbed) => void;
  tokens?: MarkdownToken[];
}) {
  if (!tokens || tokens.length === 0) return null;
  return (
    <>
      {tokens.map((token, index) => {
        if (token.type !== "link") {
          return (
            <React.Fragment key={index}>
              <InlineText
                currentUserId={currentUserId}
                memberNamesById={memberNamesById}
                onDirectMessage={onDirectMessage}
                value={token.value}
              />
            </React.Fragment>
          );
        }
        const embed = token.embed && token.embed.provider !== "link" ? token.embed : undefined;
        const title = embed ? matterhornEmbedTitle(embed) : token.text;
        const canFullscreen = Boolean(embed && matterhornEmbedSupportsFullscreenDialog(embed));
        if (!embed) {
          return (
            <a key={index} href={token.url} target="_blank" rel="noreferrer">
              {token.text}
            </a>
          );
        }
        return (
          <span key={index} className="embed-link-inline">
            <strong className="embed-link-provider">{matterhornEmbedProviderLabel(embed)}</strong>
            {canFullscreen && onFullscreen ? (
              <button
                type="button"
                className="embed-inline-expand"
                onClick={() => onFullscreen(embed)}
                aria-label={`View ${title} fullscreen`}
                title={`View ${title} fullscreen`}
              >
                <MaximizeIcon />
              </button>
            ) : null}
            <a href={token.url} target="_blank" rel="noreferrer">
              {token.text}
            </a>
          </span>
        );
      })}
    </>
  );
}

function MarkdownNodes({
  currentUserId,
  memberNamesById,
  nodes,
  onDirectMessage,
  onFullscreen
}: {
  currentUserId?: string;
  memberNamesById: Record<string, string>;
  nodes: MarkdownNode[];
  onDirectMessage?: (memberId: string) => void;
  onFullscreen: (embed: MarkdownEmbed) => void;
}) {
  const inlineProps = { currentUserId, memberNamesById, onDirectMessage, onFullscreen };
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "heading": {
            const depth = Math.min(6, Math.max(1, node.depth || 1));
            const Tag = `h${depth}` as React.ElementType;
            return (
              <Tag key={index} className="md-heading">
                <Inline tokens={node.children} {...inlineProps} />
              </Tag>
            );
          }
          case "code":
            return (
              <pre key={index} className="md-code">
                <code>{node.value}</code>
              </pre>
            );
          case "blockquote":
            return (
              <blockquote key={index} className="md-quote">
                <Inline tokens={node.children} {...inlineProps} />
              </blockquote>
            );
          case "list":
            return (
              <ul key={index} className="md-list">
                {(node.items || []).map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline tokens={item.children} {...inlineProps} />
                  </li>
                ))}
              </ul>
            );
          case "embed":
            // Block-level ::provider(url) directives surface in the embed stack below.
            return null;
          default:
            return (
              <p key={index} className="message-body">
                <Inline tokens={node.children} {...inlineProps} />
              </p>
            );
        }
      })}
    </>
  );
}

function frameUrl(embed: MarkdownEmbed) {
  return matterhornEmbedFrameUrl(embed, { parentHost: typeof window === "undefined" ? undefined : window.location.hostname });
}

function providerClassName(embed: MarkdownEmbed) {
  const provider = String(embed.provider || embed.kind || "embed")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return provider ? `message-embed-${provider}` : "";
}

export function EmbedCard({
  embed,
  isFullscreen,
  onCloseFullscreen
}: {
  embed: MarkdownEmbed;
  isFullscreen?: boolean;
  onCloseFullscreen?: () => void;
}) {
  const href = matterhornEmbedExternalUrl(embed);
  const title = matterhornEmbedTitle(embed);
  const baseClassName = `message-embed message-embed-inline ${providerClassName(embed)}`;
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing || !isFullscreen) return;
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      setIsClosing(false);
      onCloseFullscreen?.();
    }, 160);
  }, [isClosing, isFullscreen, onCloseFullscreen]);



  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isFullscreen, handleClose]);

  const fullscreenHeader = isFullscreen ? (
    <header className="embed-dialog-header" key="header">
      <span className="embed-meta">
        <strong>{title}</strong>
        {embed.provider ? <small className="embed-provider">{embed.provider}</small> : null}
      </span>
      <span className="embed-actions">
        <button
          ref={closeRef}
          type="button"
          className="embed-icon-button"
          onClick={handleClose}
          aria-label={`Close ${title} fullscreen`}
          title={`Close ${title} fullscreen`}
        >
          <CloseIcon />
        </button>
      </span>
    </header>
  ) : null;

  const fullscreenShroud = isFullscreen ? (
    <div
      key="shroud"
      className="embed-dialog-shroud"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    />
  ) : null;

  const fullscreenClassName = `${baseClassName}${isFullscreen ? " message-embed-fullscreen" : ""}${isFullscreen && isClosing ? " message-embed-fullscreen-exit" : ""}`;

  if (embed.renderMode === "iframe" || embed.renderMode === "file-preview") {
    const src = frameUrl(embed);
    if (src) {
      return (
        <figure
          className={fullscreenClassName}
          role={isFullscreen ? "dialog" : undefined}
          aria-modal={isFullscreen ? "true" : undefined}
          aria-label={isFullscreen ? `Fullscreen ${title}` : undefined}
        >
          {fullscreenShroud}
          {fullscreenHeader}
          <span className="embed-frame-shell" key="shell">
            <iframe
              className="embed-frame"
              title={title}
              src={src}
              loading="lazy"
              allow={MATTERHORN_EMBED_FRAME_ALLOW}
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox={MATTERHORN_EMBED_FRAME_SANDBOX}
            />
          </span>
        </figure>
      );
    }
  }
  if (embed.renderMode === "image") {
    const src = matterhornEmbedSourceUrl(embed);
    if (src) {
      return (
        <figure className={`${baseClassName} message-embed-image`}>
          <span className="embed-frame-shell">
            <img className="embed-media" src={src} alt={title} loading="lazy" />
          </span>
        </figure>
      );
    }
  }
  if (embed.renderMode === "video") {
    const src = matterhornEmbedSourceUrl(embed);
    if (src) {
      return (
        <figure className={`${baseClassName} message-embed-video`}>
          <span className="embed-frame-shell">
            <video className="embed-media" src={src} controls preload="metadata" aria-label={title} />
          </span>
        </figure>
      );
    }
  }
  if (embed.renderMode === "audio") {
    const src = matterhornEmbedSourceUrl(embed);
    if (src) {
      return (
        <figure className={`${baseClassName} message-embed-audio`}>
          <span className="embed-frame-shell">
            <audio className="embed-audio" src={src} controls preload="metadata" aria-label={title} />
          </span>
        </figure>
      );
    }
  }
  return (
    <a className="message-embed message-embed-card" href={href} target="_blank" rel="noreferrer">
      {embed.thumbnailUrl ? <img className="embed-thumb" src={embed.thumbnailUrl} alt="" loading="lazy" /> : null}
      <span className="embed-meta">
        <strong>{title}</strong>
        {embed.provider ? <small className="embed-provider">{embed.provider}</small> : null}
        {embed.url ? <span className="embed-url">{embed.url}</span> : null}
      </span>
    </a>
  );
}

// Rich embeds are the provider-specific ones (youtube, github, maps). Plain links
// resolve to the generic "link" provider and stay inline rather than as a card.
function richEmbeds(embeds: MarkdownEmbed[]): MarkdownEmbed[] {
  const seen = new Set<string>();
  return embeds.filter((embed) => {
    if (!embed || !embed.url || embed.provider === "link") return false;
    if (seen.has(embed.url)) return false;
    seen.add(embed.url);
    return true;
  });
}

export function MarkdownMessage({
  body,
  currentUserId,
  memberNamesById = {},
  onDirectMessage
}: {
  body: string;
  currentUserId?: string;
  memberNamesById?: Record<string, string>;
  onDirectMessage?: (memberId: string) => void;
}) {
  const displayBody = useMemo(() => renderMentionNames(body, memberNamesById), [body, memberNamesById]);
  const largeEmoji = useMemo(() => singleEmojiBody(displayBody), [displayBody]);
  const parsed = useMemo(() => parseBody(body), [body]);
  const cards = richEmbeds(parsed.embeds);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const openFullscreen = useCallback((embed: MarkdownEmbed) => {
    const src = frameUrl(embed);
    if (!src) return;
    setFullscreenUrl(embed.url || null);
  }, []);
  const closeFullscreen = useCallback(() => setFullscreenUrl(null), []);
  if (largeEmoji) {
    return (
      <div className="message-markdown">
        <p className="message-body message-body-emoji">{largeEmoji}</p>
      </div>
    );
  }
  return (
    <>
      <div className="message-markdown">
        <MarkdownNodes
          currentUserId={currentUserId}
          memberNamesById={memberNamesById}
          nodes={parsed.nodes}
          onDirectMessage={onDirectMessage}
          onFullscreen={openFullscreen}
        />
      </div>
      {cards.length > 0 ? (
        <div className="embed-stack">
          {cards.map((embed, index) => (
            <EmbedCard
              embed={embed}
              key={embed.url || index}
              isFullscreen={fullscreenUrl !== null && fullscreenUrl === embed.url}
              onCloseFullscreen={closeFullscreen}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
