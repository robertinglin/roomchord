import * as stylex from "@stylexjs/stylex";

/**
 * Mosh design tokens, transcribed from the canonical reference at `chat.html`.
 * These are exposed as CSS custom properties and consumed by StyleX styles
 * throughout the app.
 */
export const tokens = stylex.defineVars({
  bg: "oklch(0.205 0.007 250)",
  surface: "oklch(0.172 0.007 250)",
  surfaceDeep: "oklch(0.145 0.007 250)",
  panelHover: "oklch(0.235 0.008 250)",
  panelActive: "oklch(0.258 0.01 250)",
  fieldBg: "oklch(0.225 0.008 250)",
  border: "oklch(0.29 0.009 250 / 0.42)",
  borderSoft: "oklch(0.27 0.009 250 / 0.24)",
  fg: "oklch(0.93 0.004 250)",
  muted: "oklch(0.68 0.01 250)",
  quiet: "oklch(0.54 0.012 250)",
  accent: "oklch(0.73 0.13 40)",
  accentHover: "oklch(0.79 0.13 40)",
  accentSoft: "oklch(0.73 0.13 40 / 0.12)",
  accentInk: "oklch(0.18 0.05 40)",
  mentionFg: "oklch(0.84 0.09 40)",
  mentionBg: "oklch(0.73 0.13 40 / 0.18)",
  success: "oklch(0.74 0.13 155)",
  warning: "oklch(0.80 0.12 82)",
  danger: "oklch(0.68 0.18 25)",
  dangerSoft: "oklch(0.68 0.18 25 / 0.14)",
  // Role palette — colored role tags/dots from the brand spec.
  roleOwner: "oklch(0.73 0.13 40)",
  roleAdmin: "oklch(0.72 0.13 290)",
  roleMod: "oklch(0.74 0.12 230)",
  roleMember: "oklch(0.74 0.13 155)",
  roleGuest: "oklch(0.62 0.01 250)",
  dualLight: "oklch(0.72 0.004 250 / 0.46)",
  dualDark: "oklch(0 0 0 / 0.37)",
  elevCtrl:
    "inset 0 0 0 0.5px rgba(255,255,255,0.045), 0 1px 2px rgba(0,0,0,0.32)",
  elevPanel:
    "inset 0 0 0 0.5px rgba(255,255,255,0.04), 0 14px 36px rgba(0,0,0,0.3)",
  fontDisplay:
    '"Bricolage Grotesque","Instrument Sans",sans-serif',
  fontBody:
    '"Instrument Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif',
  fontMono:
    '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
  radiusItem: "7px",
  radiusPanel: "8px",
  sidebarWidth: "272px",
  railWidth: "304px",
});

export const fonts = stylex.defineVars({
  display: tokens.fontDisplay,
  body: tokens.fontBody,
  mono: tokens.fontMono,
});

export const radii = stylex.defineVars({
  item: tokens.radiusItem,
  panel: tokens.radiusPanel,
});
