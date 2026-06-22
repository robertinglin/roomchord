import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

export type PresenceStatus = "on" | "idle" | "dnd" | "off";
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const DIMS: Record<AvatarSize, number> = { xs: 18, sm: 22, md: 32, lg: 40, xl: 64 };
const FONT_SIZE: Record<AvatarSize, number> = { xs: 9, sm: 11, md: 14, lg: 17, xl: 26 };

const styles = stylex.create({
  wrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    verticalAlign: "middle",
    borderRadius: "999px",
    overflow: "hidden",
  },
  img: {
    borderRadius: "999px",
    objectFit: "cover",
    display: "block",
  },
  imgRing: {
    boxShadow: `0 0 0 2px ${tokens.surface}`,
  },
  imgOff: { filter: "saturate(0.35) brightness(0.7)" },
  glyph: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    borderRadius: "999px",
    color: tokens.fg,
    fontWeight: 600,
    lineHeight: 1,
    userSelect: "none",
  },
  stat: {
    position: "absolute",
    right: "-2px",
    bottom: "-2px",
    width: "11px",
    height: "11px",
    borderRadius: "999px",
    border: `2.5px solid ${tokens.surface}`,
  },
  statOn: { backgroundColor: tokens.success },
  statIdle: { backgroundColor: tokens.warning },
  statDnd: { backgroundColor: tokens.danger },
  statOff: { backgroundColor: tokens.quiet },
});

/* ── legacy fallback logic (ported from src/shared/ui/Avatar.tsx) ── */
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const avatarColorCache = new Map<string, string>();

function isImageAvatar(value: string) {
  return /^(?:https?:\/\/|data:image\/|blob:|\/)/i.test(value);
}
function initialFor(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}
function firstGlyph(value: string) {
  const IntlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (locale?: string, options?: { granularity: "grapheme" }) => {
      segment: (input: string) => Iterable<{ segment: string }>;
    };
  };
  const segmenter =
    typeof Intl !== "undefined" && IntlWithSegmenter.Segmenter
      ? new IntlWithSegmenter.Segmenter(undefined, { granularity: "grapheme" })
      : undefined;
  if (!segmenter) return Array.from(value)[0] || value;
  return segmenter.segment(value)[Symbol.iterator]().next().value?.segment || value;
}
function colorFromText(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `oklch(0.42 0.07 ${hash % 360})`;
}
function colorFromEmoji(emoji: string) {
  if (avatarColorCache.has(emoji)) return avatarColorCache.get(emoji);
  if (typeof document === "undefined") return undefined;
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return undefined;
  const canvas = document.createElement("canvas");
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return undefined;
  context.clearRect(0, 0, size, size);
  context.font = "36px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(emoji, size / 2, size / 2 + 1);
  const pixels = context.getImageData(0, 0, size, size).data;
  let red = 0, green = 0, blue = 0, weight = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha < 0.08) continue;
    red += pixels[index] * alpha;
    green += pixels[index + 1] * alpha;
    blue += pixels[index + 2] * alpha;
    weight += alpha;
  }
  if (weight === 0) return undefined;
  const color = `rgb(${Math.round(red / weight)} ${Math.round(green / weight)} ${Math.round(blue / weight)} / 0.72)`;
  avatarColorCache.set(emoji, color);
  return color;
}

/**
 * Avatar with optional presence pip.
 *
 * Two modes:
 *  • `src` provided → renders the image directly.
 *  • otherwise `name` (+ optional `avatar`) → image URL, or initial/emoji glyph
 *    fallback with a hashed background color (legacy behavior, so the live app
 *    can pass `name`+`avatar?` without resolving a URL first).
 *
 * Sizes: xs 18 · sm 22 · md 32 · lg 40 · xl 64.
 * `ring` adds the 2px surface ring used by voice-member avatars.
 */
export function Avatar({
  src,
  name,
  avatar,
  size = "md",
  status,
  ring,
  alt,
  desaturate,
}: {
  src?: string;
  name?: string;
  avatar?: string;
  size?: AvatarSize;
  status?: PresenceStatus;
  ring?: boolean;
  alt?: string;
  desaturate?: boolean;
}) {
  const px = DIMS[size];
  // Resolve what to show: explicit src wins; else legacy name+avatar resolution.
  const resolved = src ?? (avatar?.trim() || (name ? initialFor(name) : undefined));
  const showImage = resolved ? isImageAvatar(resolved) : false;

  let glyphColor: string | undefined;
  let glyphText: string | undefined;
  if (resolved && !showImage) {
    const glyph = firstGlyph(resolved);
    glyphText = glyph;
    const isEmoji = EMOJI_RE.test(glyph);
    glyphColor = isEmoji ? colorFromEmoji(glyph) || colorFromText(name || resolved) : colorFromText(resolved);
  }

  return (
    <span {...stylex.props(styles.wrap)} style={{ width: px, height: px }} role="img" aria-label={alt ? `${alt} avatar` : undefined}>
      {showImage && resolved ? (
        <img
          {...stylex.props(styles.img, ring && styles.imgRing, desaturate && styles.imgOff)}
          src={resolved}
          alt={alt || ""}
          width={px}
          height={px}
        />
      ) : (
        <span
          {...stylex.props(styles.glyph)}
          style={{ backgroundColor: glyphColor, fontSize: FONT_SIZE[size] }}
        >
          {glyphText}
        </span>
      )}
      {status && (
        <span
          {...stylex.props(
            styles.stat,
            status === "on" && styles.statOn,
            status === "idle" && styles.statIdle,
            status === "dnd" && styles.statDnd,
            status === "off" && styles.statOff,
          )}
        />
      )}
    </span>
  );
}

export default Avatar;
