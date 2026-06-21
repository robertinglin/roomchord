import React from "react";
import { Glyph } from "./Glyph";

/**
 * Named icon components. Each renders a `<Glyph>` with a fixed path body, so
 * callers pass only `size`. Stroke language (1.8px, round) is owned by Glyph;
 * bodies here are bare geometry.
 *
 * Note: `MicOff`, `ExternalLink`, `WordmarkSquiggle` carry semantic meaning
 * (color override / non-24x18 box) and accept extra props where needed.
 */

type IconProps = { size?: number; className?: string };

export function SpeakerGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1Z" />
      <path d="M16 9a3 3 0 0 1 0 6" />
    </Glyph>
  );
}

export function HashGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M9.25 4.5 7.75 19.5" />
      <path d="M16.25 4.5 14.75 19.5" />
      <path d="M5 9h15" />
      <path d="M4 15h15" />
    </Glyph>
  );
}

export function MicGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </Glyph>
  );
}

export function MicOffGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      <path d="m3 3 18 18" />
    </Glyph>
  );
}

export function BellGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Glyph>
  );
}

export function PinGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M12 17v5M9 10.8V4h6v6.8l3 3.2H6l3-3.2Z" />
    </Glyph>
  );
}

export function AttachGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" />
    </Glyph>
  );
}

export function GifGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9v6M11 9v6M11 12h2.5M16 9v6M16 9h2M16 12h1.5" />
    </Glyph>
  );
}

export function SmileGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
    </Glyph>
  );
}

export function ReplyGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v2" />
    </Glyph>
  );
}

export function MoreGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function MenuGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Glyph>
  );
}

export function LeaveGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M3 11h13a4 4 0 0 1 0 8h-3M3 11l4-4M3 11l4 4" />
    </Glyph>
  );
}

export function SearchGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Glyph>
  );
}

export function SendGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
    </Glyph>
  );
}

export function PlusGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M12 5v14M5 12h14" />
    </Glyph>
  );
}

export function ChevronGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="m9 6 6 6-6 6" />
    </Glyph>
  );
}

export function GearGlyph({ size = 16, ...rest }: IconProps) {
  // Symmetric 8-tooth cog: a central circle plus 8 evenly-spaced tooth rects,
  // all centered on (12,12). Avoids the slight horizontal asymmetry of the
  // single-path feather "settings" icon.
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    const cx = 12 + Math.cos(angle) * 8.5;
    const cy = 12 + Math.sin(angle) * 8.5;
    return (
      <rect
        key={i}
        x={cx - 1.4}
        y={cy - 3}
        width="2.8"
        height="6"
        rx="1"
        transform={`rotate(${i * 45} ${cx} ${cy})`}
      />
    );
  });
  return (
    <Glyph size={size} {...rest}>
      {teeth}
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.6" />
    </Glyph>
  );
}

export function ExternalLinkGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M12 19l7-7-2-2-5 5-3-3-2 2Z" />
      <path d="M5 3h14v4M5 21H3V3" />
    </Glyph>
  );
}

export function HeadphonesGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M17 9a4 4 0 0 1 0 6M23 9l-6 6M17 9l6 6" />
    </Glyph>
  );
}

export function VideoGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m22 8-6 4 6 4V8Z" />
    </Glyph>
  );
}

export function ScreenGlyph({ size = 16, ...rest }: IconProps) {
  return (
    <Glyph size={size} {...rest}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </Glyph>
  );
}
