import React from "react";

type Props = {
  avatar?: string;
  className?: string;
  name: string;
  small?: boolean;
};

const avatarColorCache = new Map<string, string>();
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function initialFor(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}

function isImageAvatar(value: string) {
  return /^(?:https?:\/\/|data:image\/|blob:|\/)/i.test(value);
}

export function displayAvatarValue(name: string, avatar?: string) {
  return avatar?.trim() || initialFor(name);
}

function firstGlyph(value: string) {
  const IntlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (locale?: string, options?: { granularity: "grapheme" }) => {
      segment: (input: string) => Iterable<{ segment: string }>;
    };
  };
  const segmenter = typeof Intl !== "undefined" && IntlWithSegmenter.Segmenter
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
  let red = 0;
  let green = 0;
  let blue = 0;
  let weight = 0;
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

export function Avatar({ avatar, className, name, small }: Props) {
  const value = displayAvatarValue(name, avatar);
  const glyph = firstGlyph(value);
  const isEmoji = EMOJI_RE.test(glyph);
  const backgroundColor = isEmoji ? colorFromEmoji(glyph) || colorFromText(name) : colorFromText(value);
  const classes = ["member-avatar", isEmoji ? "emoji-avatar" : "", small ? "small" : "", className || ""].filter(Boolean).join(" ");
  if (isImageAvatar(value)) {
    return (
      <span className={classes} aria-label={`${name} avatar`} role="img">
        <img alt="" src={value} />
      </span>
    );
  }
  return (
    <span className={classes} style={{ backgroundColor }} aria-label={`${name} avatar`} role="img">
      {value}
    </span>
  );
}
