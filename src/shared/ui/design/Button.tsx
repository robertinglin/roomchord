import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonTone = "quiet" | "muted" | "accent" | "success" | "danger";
export type ButtonVariant = "ghost" | "solid" | "etched";
export type ButtonShape = "square" | "round";
export type VoiceState = "on" | "off";

/**
 * One parametric button for the whole kit. Covers every button in chat.html:
 *   header/tool/message-action buttons → ghost, square, size md/sm
 *   send button                        → solid, accent, square
 *   leave button                       → solid, danger, square
 *   voice controls                     → etched, round, size lg, tone success,
 *                                        with state on/off toggling color+bg
 *   mute/settings user-foot buttons    → etched, square, size md
 *
 * `tone` selects the resting color and, for `solid`, the background.
 * `state` (on/off) is only meaningful for voice controls — `on` recolors to
 * success, `off` recolors to danger and tints the background.
 */
const sizes = stylex.create({
  sm: { width: "28px", height: "28px" },
  md: { width: "34px", height: "34px" },
  lg: { width: "46px", height: "46px" },
});

const base = stylex.create({
  btn: {
    display: "inline-grid",
    placeItems: "center",
    borderRadius: tokens.radiusItem,
    border: 0,
    background: "transparent",
    cursor: "pointer",
    color: tokens.quiet,
    transition: "background 140ms, color 140ms",
    ":hover": { color: tokens.fg, backgroundColor: tokens.panelHover },
  },
  // square vs round
  round: { borderRadius: "999px" },
  // variants
  etched: {
    border: "1px solid",
    borderLeftColor: tokens.dualLight,
    borderTopColor: tokens.dualLight,
    borderRightColor: tokens.dualDark,
    borderBottomColor: tokens.dualDark,
  },
  solid: {
    color: "oklch(0.18 0.05 40)",
    fontWeight: 600,
  },
  // tones (resting text color for ghost; bg for solid)
  toneQuiet: { color: tokens.quiet },
  toneMuted: { color: tokens.muted },
  toneAccent: { color: tokens.accent },
  toneSuccess: { color: tokens.success },
  toneDanger: { color: tokens.danger },
  solidAccent: {
    backgroundColor: tokens.accent,
    color: "oklch(0.18 0.05 40)",
    ":hover": { backgroundColor: tokens.accentHover, color: "oklch(0.18 0.05 40)" },
  },
  solidDanger: {
    backgroundColor: tokens.danger,
    color: "#fff",
    ":hover": { filter: "brightness(1.08)", backgroundColor: tokens.danger, color: "#fff" },
  },
  // voice-control state overrides (applied on top of ghost/etched)
  voiceOn: { color: tokens.success },
  voiceOff: {
    color: tokens.danger,
    backgroundColor: "oklch(0.68 0.18 25 / 0.16)",
    ":hover": { color: tokens.danger, backgroundColor: "oklch(0.68 0.18 25 / 0.16)" },
  },
  // text-bearing button (send) — relax the fixed square size
  content: {
    width: "auto",
    height: "auto",
    padding: "0 14px",
    fontSize: "14px",
    gap: "6px",
    display: "inline-flex",
  },
  sendHeight: { height: "32px" },
  leaveHeight: { height: "32px", fontSize: "13.5px", gap: "6px" },
  disabled: {
    backgroundColor: tokens.fieldBg,
    color: tokens.quiet,
    cursor: "not-allowed",
    ":hover": { backgroundColor: tokens.fieldBg, color: tokens.quiet },
  },
});

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  size?: ButtonSize;
  tone?: ButtonTone;
  variant?: ButtonVariant;
  shape?: ButtonShape;
  /** Voice-control toggle state (only meaningful for voice controls). */
  state?: VoiceState;
};

export function Button({
  size = "md",
  tone = "quiet",
  variant = "ghost",
  shape = "square",
  state,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const hasText = typeof children === "string" || (Array.isArray(children) && children.some((c) => typeof c === "string"));
  return (
    <button
      type={type}
      disabled={disabled}
      {...stylex.props(
        base.btn,
        sizes[size],
        shape === "round" && base.round,
        variant === "etched" && base.etched,
        base[`tone${tone.charAt(0).toUpperCase()}${tone.slice(1)}` as keyof typeof base],
        variant === "solid" && tone === "accent" && base.solidAccent,
        variant === "solid" && tone === "danger" && base.solidDanger,
        state === "on" && base.voiceOn,
        state === "off" && base.voiceOff,
        hasText && base.content,
        hasText && tone === "accent" && base.sendHeight,
        hasText && tone === "danger" && base.leaveHeight,
        disabled && base.disabled,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
