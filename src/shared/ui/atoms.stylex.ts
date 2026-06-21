import * as stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";

/**
 * Atomic, reusable StyleX styles for the Mosh UI.
 * Compose these with `stylex.props(atoms.a, atoms.b, condition && atoms.c)`.
 */

// ── Layout ──
export const layout = stylex.create({
  flex: { display: "flex" },
  grid: { display: "grid" },
  inlineFlex: { display: "inline-flex" },
  inlineGrid: { display: "inline-grid" },
  contents: { display: "contents" },
  hidden: { display: "none" },

  column: { flexDirection: "column" },
  row: { flexDirection: "row" },

  itemsStart: { alignItems: "flex-start" },
  itemsCenter: { alignItems: "center" },
  itemsEnd: { alignItems: "flex-end" },
  itemsBaseline: { alignItems: "baseline" },

  justifyStart: { justifyContent: "flex-start" },
  justifyCenter: { justifyContent: "center" },
  justifyEnd: { justifyContent: "flex-end" },
  justifyBetween: { justifyContent: "space-between" },

  placeCenter: { placeItems: "center" },

  flex1: { flex: "1 1 0%" },
  flexAuto: { flex: "1 1 auto" },
  flexNone: { flex: "0 0 auto" },
  shrink0: { flexShrink: 0 },

  minW0: { minWidth: 0 },
  minH0: { minHeight: 0 },

  overflowHidden: { overflow: "hidden" },
  overflowAuto: { overflow: "auto" },
  overflowXAuto: { overflowX: "auto" },
  overflowYAuto: { overflowY: "auto" },

  relative: { position: "relative" },
  absolute: { position: "absolute" },
  fixed: { position: "fixed" },

  inset0: { inset: 0 },

  textLeft: { textAlign: "left" },
  textCenter: { textAlign: "center" },

  truncate: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  // Common layout grids
  sidebarItem: {
    display: "grid",
    gridTemplateColumns: "20px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "8px",
  },
  dmItem: {
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "10px",
  },
  messageItem: {
    display: "grid",
    gridTemplateColumns: "40px minmax(0, 1fr)",
    gap: "12px",
  },
  railMember: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
});

// ── Box ──
export const box = stylex.create({
  wFull: { width: "100%" },
  hFull: { height: "100%" },

  p1: { padding: "4px" },
  p2: { padding: "8px" },
  p3: { padding: "10px" },
  p4: { padding: "12px" },
  p5: { padding: "14px" },
  p6: { padding: "16px" },
  p8: { padding: "18px" },
  p10: { padding: "20px" },
  p12: { padding: "24px" },

  px2: { paddingLeft: "8px", paddingRight: "8px" },
  px3: { paddingLeft: "10px", paddingRight: "10px" },
  px4: { paddingLeft: "12px", paddingRight: "12px" },

  py1: { paddingTop: "4px", paddingBottom: "4px" },
  py2: { paddingTop: "8px", paddingBottom: "8px" },
  py3: { paddingTop: "10px", paddingBottom: "10px" },

  m0: { margin: 0 },
  mb1: { marginBottom: "4px" },
  mb2: { marginBottom: "8px" },
  mb3: { marginBottom: "10px" },
  mb4: { marginBottom: "12px" },
  mb5: { marginBottom: "14px" },

  gap1: { gap: "4px" },
  gap2: { gap: "8px" },
  gap3: { gap: "10px" },
  gap4: { gap: "12px" },
  gap5: { gap: "14px" },
  gap6: { gap: "16px" },

  radiusItem: { borderRadius: tokens.radiusItem },
  radiusPanel: { borderRadius: tokens.radiusPanel },
  radiusFull: { borderRadius: "999px" },

  borderBase: { border: `1px solid ${tokens.border}` },
  borderSoft: { border: `1px solid ${tokens.borderSoft}` },
  borderTransparent: { border: "1px solid transparent" },
  borderNone: { border: 0 },

  borderRight: { borderRight: `1px solid oklch(0.11 0.006 250 / 0.72)` },
  borderLeft: { borderLeft: `1px solid oklch(0.11 0.006 250 / 0.72)` },
  borderTop: { borderTop: `1px solid oklch(0.11 0.006 250 / 0.72)` },
  borderBottom: { borderBottom: `1px solid oklch(0.11 0.006 250 / 0.72)` },
});

// ── Colors ──
export const color = stylex.create({
  fg: { color: tokens.fg },
  muted: { color: tokens.muted },
  quiet: { color: tokens.quiet },
  accent: { color: tokens.accent },
  accentHover: { color: tokens.accentHover },
  mentionFg: { color: tokens.mentionFg },
  success: { color: tokens.success },
  warning: { color: tokens.warning },
  danger: { color: tokens.danger },
  current: { color: "currentColor" },

  bg: { backgroundColor: tokens.bg },
  surface: { backgroundColor: tokens.surface },
  surfaceDeep: { backgroundColor: tokens.surfaceDeep },
  panelHover: { backgroundColor: tokens.panelHover },
  panelActive: { backgroundColor: tokens.panelActive },
  fieldBg: { backgroundColor: tokens.fieldBg },
  accentBg: { backgroundColor: tokens.accent },
  accentHoverBg: { backgroundColor: tokens.accentHover },
  accentSoftBg: { backgroundColor: tokens.accentSoft },
  mentionBg: { backgroundColor: tokens.mentionBg },
  successBg: { backgroundColor: tokens.success },
  warningBg: { backgroundColor: tokens.warning },
  dangerBg: { backgroundColor: tokens.danger },
  transparent: { backgroundColor: "transparent" },
});

// ── Typography ──
export const type = stylex.create({
  fontDisplay: { fontFamily: tokens.fontDisplay },
  fontBody: { fontFamily: tokens.fontBody },
  fontMono: { fontFamily: tokens.fontMono },

  text10: { fontSize: "10px" },
  text11: { fontSize: "11px" },
  text12: { fontSize: "12px" },
  text13: { fontSize: "13px" },
  text13_5: { fontSize: "13.5px" },
  text14: { fontSize: "14px" },
  text14_5: { fontSize: "14.5px" },
  text15: { fontSize: "15px" },
  text16: { fontSize: "16px" },
  text18: { fontSize: "18px" },
  text20: { fontSize: "20px" },
  text22: { fontSize: "22px" },

  normal: { fontWeight: 400 },
  medium: { fontWeight: 500 },
  semibold: { fontWeight: 600 },
  bold: { fontWeight: 700 },
  extrabold: { fontWeight: 800 },
  black: { fontWeight: 900 },

  leadingTight: { lineHeight: "1.15" },
  leadingSnug: { lineHeight: "1.3" },
  leadingNormal: { lineHeight: "1.375" },
  leadingRelaxed: { lineHeight: "1.45" },
  leadingLoose: { lineHeight: "1.5" },

  uppercase: { textTransform: "uppercase" },
  lowercase: { textTransform: "lowercase" },
  capitalize: { textTransform: "capitalize" },

  trackingNone: { letterSpacing: 0 },
  trackingWide: { letterSpacing: "0.08em" },
  trackingWider: { letterSpacing: "0.06em" },

  noUnderline: { textDecoration: "none" },
  italic: { fontStyle: "italic" },
});

// ── Interactive ──
export const interactive = stylex.create({
  pointer: { cursor: "pointer" },
  notAllowed: { cursor: "not-allowed" },

  resetButton: {
    border: 0,
    background: "transparent",
    cursor: "pointer",
  },

  transitionFast: { transition: "background 140ms, color 140ms" },
  transitionBase: { transition: "background 160ms, color 160ms" },

  hoverPanel: {
    ":hover": {
      backgroundColor: tokens.panelHover,
      color: tokens.fg,
    },
  },
  hoverText: {
    ":hover": {
      color: tokens.fg,
    },
  },
  hoverDanger: {
    ":hover": {
      backgroundColor: "oklch(0.68 0.18 25 / 0.16)",
      color: tokens.danger,
    },
  },

  focusOutline: {
    ":focus": {
      outline: "none",
    },
  },

  activePanel: {
    backgroundColor: tokens.panelActive,
    color: tokens.fg,
  },

  disabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
});

// ── Effects ──
export const effect = stylex.create({
  elevCtrl: { boxShadow: tokens.elevCtrl },
  elevPanel: { boxShadow: tokens.elevPanel },

  scrollbar: {
    "::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    "::-webkit-scrollbar-thumb": {
      background: "oklch(0.30 0.01 250)",
      borderRadius: "999px",
    },
    "::-webkit-scrollbar-track": {
      background: "transparent",
    },
  },

  backdropBlur: {
    backdropFilter: "blur(4px)",
  },
});

// ── Common composed patterns ──
export const patterns = stylex.create({
  sidebarRow: {
    width: "100%",
    minHeight: "34px",
    padding: "0 8px",
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    backgroundColor: "transparent",
    textAlign: "left",
    fontSize: "14.5px",
    display: "grid",
    gridTemplateColumns: "20px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "8px",
    border: 0,
    cursor: "pointer",
    transition: "background 140ms, color 140ms",
    ":hover": {
      backgroundColor: tokens.panelHover,
      color: tokens.fg,
    },
  },
  sidebarRowActive: {
    backgroundColor: tokens.panelActive,
    color: tokens.fg,
  },

  sectionHeading: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 8px 6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: tokens.quiet,
  },

  badge: {
    fontSize: "10px",
    fontWeight: 700,
    minWidth: "17px",
    height: "17px",
    padding: "0 5px",
    borderRadius: "999px",
    display: "inline-grid",
    placeItems: "center",
    backgroundColor: tokens.accent,
    color: "oklch(0.18 0.05 40)",
  },

  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "999px",
    backgroundColor: tokens.quiet,
    flex: "0 0 auto",
  },

  iconButton: {
    width: "30px",
    height: "30px",
    display: "grid",
    placeItems: "center",
    borderRadius: tokens.radiusItem,
    color: tokens.quiet,
    backgroundColor: "transparent",
    border: 0,
    cursor: "pointer",
    transition: "background 140ms, color 140ms",
    ":hover": {
      backgroundColor: tokens.panelHover,
      color: tokens.fg,
    },
  },

  headerButton: {
    width: "34px",
    height: "34px",
    display: "grid",
    placeItems: "center",
    borderRadius: tokens.radiusItem,
    color: tokens.quiet,
    backgroundColor: "transparent",
    border: 0,
    cursor: "pointer",
    ":hover": {
      backgroundColor: tokens.panelHover,
      color: tokens.fg,
    },
  },

  panelInput: {
    width: "100%",
    color: tokens.fg,
    backgroundColor: tokens.fieldBg,
    border: "1px solid transparent",
    borderRadius: tokens.radiusItem,
    outline: "none",
    ":focus": {
      borderColor: tokens.accent,
    },
  },

  avatarWrap: {
    position: "relative",
    width: "32px",
    height: "32px",
    flex: "0 0 auto",
  },

  avatarStatus: {
    position: "absolute",
    right: "-2px",
    bottom: "-2px",
    width: "11px",
    height: "11px",
    borderRadius: "999px",
    border: `2.5px solid ${tokens.surface}`,
  },

  // Etched/dual-border control
  etched: {
    border: "1px solid",
    borderLeftColor: tokens.dualLight,
    borderTopColor: tokens.dualLight,
    borderRightColor: tokens.dualDark,
    borderBottomColor: tokens.dualDark,
  },
});
