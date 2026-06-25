import * as stylex from "@stylexjs/stylex";
import { tokens } from "../../../shared/ui/theme.stylex";

/**
 * Settings/management dialog vocabulary, transcribed from settings.html into
 * StyleX. These styles are shared by the room management dialog and the voice
 * settings dialog — one coherent set of primitives (shell, rail, panels,
 * fields, rows, switches, sliders, buttons).
 *
 * Compound/interactive states that StyleX can't express declaratively
 * (checked switches, disabled rows) are driven by React via small variant
 * keys instead of pseudo-selectors.
 */

/* ───────────────────────────── shell ───────────────────────────── */

export const shell = stylex.create({
  shroud: {
    position: "fixed",
    inset: 0,
    zIndex: 70,
    display: "grid",
    placeItems: "center",
    padding: "24px",
    backgroundColor: "rgb(6 8 11 / 0.74)",
  },
  dialog: {
    width: "min(1040px, calc(100vw - 48px))",
    height: "min(720px, calc(100vh - 48px))",
    display: "grid",
    gridTemplateColumns: "236px minmax(0, 1fr)",
    gridTemplateRows: "minmax(0, 1fr)",
    overflow: "hidden",
    border: 0,
    borderRadius: "14px",
    color: tokens.fg,
    backgroundColor: "#15171a",
    boxShadow: tokens.elevPanel,
  },
});

/* ───────────────────────────── nav rail ───────────────────────────── */

export const rail = stylex.create({
  rail: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    padding: "20px 12px 16px",
    borderRight: "1px solid oklch(0.11 0.006 250 / 0.72)",
    backgroundColor: "#0e1013",
  },
  head: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr)",
    gap: "11px",
    alignItems: "center",
    padding: "0 6px 22px",
  },
  mark: {
    width: "34px",
    height: "34px",
    display: "grid",
    placeItems: "center",
    borderRadius: "9px",
    color: tokens.accent,
    backgroundColor: tokens.accentSoft,
  },
  id: { minWidth: 0, display: "grid", gap: "2px" },
  idTitle: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.fg,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontFamily: tokens.fontDisplay,
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  idSub: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.quiet,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },
  group: {
    display: "grid",
    gap: 0,
    marginTop: "14px",
  },
  groupFirst: { marginTop: 0 },
  groupLabel: {
    padding: "6px 8px 7px",
    color: tokens.quiet,
    fontSize: "10.5px",
    fontWeight: 700,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
  },
  item: {
    width: "100%",
    minHeight: "40px",
    display: "grid",
    gridTemplateColumns: "22px minmax(0, 1fr) auto",
    gap: "10px",
    alignItems: "center",
    padding: "0 11px",
    border: 0,
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    backgroundColor: "transparent",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14.5px",
    fontWeight: 600,
    transition: "background 140ms ease, color 140ms ease",
    ":hover": { background: tokens.panelHover, color: tokens.fg },
    ":focus-visible": { outline: `2px solid ${tokens.accent}`, outlineOffset: "2px" },
  },
  itemActive: {
    backgroundColor: tokens.panelActive,
    color: tokens.fg,
    ":hover": { background: tokens.panelActive, color: tokens.fg },
  },
  itemIcon: { width: "18px", height: "18px", color: tokens.quiet },
  itemIconActive: { color: tokens.accent },
  itemLabel: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemCount: {
    color: tokens.quiet,
    fontFamily: tokens.fontMono,
    fontSize: "11.5px",
    fontWeight: 500,
  },
});

/* ───────────────────────────── content ───────────────────────────── */

export const content = stylex.create({
  content: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    backgroundColor: "#15171a",
  },
  head: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "14px",
    alignItems: "center",
    padding: "22px 28px 18px",
    borderBottom: `1px solid ${tokens.borderSoft}`,
    backgroundColor: "#15171a",
  },
  title: { minWidth: 0 },
  h2: {
    margin: 0,
    fontFamily: tokens.fontDisplay,
    fontSize: "21px",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  desc: {
    marginTop: "4px",
    color: tokens.muted,
    fontSize: "13.5px",
  },
  close: {
    width: "34px",
    height: "34px",
    display: "grid",
    placeItems: "center",
    border: 0,
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    backgroundColor: "#1b1e22",
    cursor: "pointer",
    ":hover": { color: tokens.fg, background: tokens.panelHover },
  },
  body: {
    minHeight: 0,
    overflowY: "auto",
    padding: "24px 28px 32px",
  },
});

/* ───────────────────────────── panel ───────────────────────────── */

export const panel = stylex.create({
  panel: {
    minWidth: 0,
    overflow: "hidden",
    marginBottom: "18px",
    borderRadius: tokens.radiusPanel,
    backgroundColor: "#202428",
    boxShadow: tokens.elevCtrl,
  },
  panelLast: { marginBottom: 0 },
  head: {
    minHeight: "50px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px 18px",
    borderBottom: `1px solid ${tokens.borderSoft}`,
  },
  h3: {
    flex: 1,
    minWidth: 0,
    margin: 0,
    color: tokens.fg,
    fontFamily: tokens.fontDisplay,
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  meta: {
    flex: "0 0 auto",
    color: tokens.quiet,
    fontFamily: tokens.fontMono,
    fontSize: "12px",
  },
  body: { padding: "18px" },
  bodyFlush: { padding: "8px" },
});

/* ───────────────────────────── section label ───────────────────────────── */

export const section = stylex.create({
  label: {
    margin: "18px 0 9px",
    color: tokens.quiet,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  labelFirst: { marginTop: 0 },
});

/* ───────────────────────────── field ───────────────────────────── */

export const field = stylex.create({
  field: {
    minWidth: 0,
    display: "block",
    margin: "0 0 16px",
  },
  fieldLast: { marginBottom: 0 },
  label: {
    display: "block",
    marginBottom: "7px",
    color: tokens.quiet,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    minHeight: "40px",
    padding: "9px 13px",
    border: "1px solid",
    borderLeftColor: tokens.dualLight,
    borderTopColor: tokens.dualLight,
    borderRightColor: tokens.dualDark,
    borderBottomColor: tokens.dualDark,
    borderRadius: tokens.radiusItem,
    background: tokens.fieldBg,
    color: tokens.fg,
    fontSize: "14.5px",
    outline: "none",
    "::placeholder": { color: tokens.quiet },
    ":focus": {
      borderLeftColor: tokens.accent,
      borderTopColor: tokens.accent,
      borderRightColor: tokens.accent,
      borderBottomColor: tokens.accent,
    },
  },
  select: {
    width: "100%",
    minHeight: "40px",
    padding: "9px 34px 9px 13px",
    border: "1px solid",
    borderLeftColor: tokens.dualLight,
    borderTopColor: tokens.dualLight,
    borderRightColor: tokens.dualDark,
    borderBottomColor: tokens.dualDark,
    borderRadius: tokens.radiusItem,
    background: tokens.fieldBg,
    color: tokens.fg,
    fontSize: "14.5px",
    cursor: "pointer",
    appearance: "none",
    outline: "none",
    ":focus": {
      borderLeftColor: tokens.accent,
      borderTopColor: tokens.accent,
      borderRightColor: tokens.accent,
      borderBottomColor: tokens.accent,
    },
  },
  colorRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  colorSwatch: {
    width: "42px",
    height: "40px",
    flex: "0 0 auto",
    padding: "3px",
    border: 0,
    borderRadius: tokens.radiusItem,
    background: tokens.fieldBg,
    cursor: "pointer",
  },
  colorHex: {
    flex: 1,
    fontFamily: tokens.fontMono,
  },
});

/* ───────────────────────────── buttons ───────────────────────────── */

export const button = stylex.create({
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    height: "38px",
    padding: "0 16px",
    border: 0,
    borderRadius: tokens.radiusItem,
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 130ms, filter 130ms",
  },
  primary: {
    background: tokens.accent,
    color: tokens.accentInk,
    ":hover": { background: tokens.accentHover },
  },
  secondary: {
    background: tokens.fieldBg,
    color: tokens.fg,
    ":hover": { background: tokens.panelHover },
  },
  ghost: {
    background: tokens.fieldBg,
    color: tokens.fg,
    ":hover": { background: tokens.panelHover },
  },
  danger: {
    background: tokens.fieldBg,
    color: "oklch(0.78 0.12 25)",
    ":hover": { background: tokens.dangerSoft },
  },
  sm: { height: "32px", padding: "0 13px", fontSize: "13px" },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.45, cursor: "not-allowed" },
  actions: {
    display: "flex",
    gap: "9px",
    marginTop: "18px",
  },
  actionsEnd: { justifyContent: "flex-end" },
  actionsPlain: { marginTop: 0 },
});

/* ───────────────────────────── row (reusable list item) ───────────────────────────── */

export const row = stylex.create({
  row: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "13px",
    alignItems: "center",
    minHeight: "60px",
    padding: "11px 14px",
    borderRadius: tokens.radiusItem,
    background: tokens.surface,
    boxShadow: tokens.elevCtrl,
  },
  rowLead: { flex: "0 0 auto", display: "flex", alignItems: "center" },
  rowLeadGrow: { flex: "0 0 auto", display: "flex", alignItems: "center", gap: "13px", minWidth: 0 },
  rowLeadIcon: { color: tokens.quiet, display: "inline-flex", alignItems: "center" },
  rowMain: { minWidth: 0, flex: 1 },
  rowTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: tokens.fg,
    fontSize: "14.5px",
    fontWeight: 600,
  },
  rowSub: {
    marginTop: "2px",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: tokens.muted,
    fontSize: "12.5px",
    lineHeight: 1.35,
  },
  rowEnd: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  roleDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    flex: "0 0 auto",
  },
  tap: {
    cursor: "pointer",
    transition: "background 130ms",
    ":hover": { background: tokens.panelHover },
  },
  sel: {
    background: tokens.panelActive,
    boxShadow: `inset 0 0 0 1px ${tokens.accent}, ${tokens.elevCtrl}`,
    ":hover": { background: tokens.panelActive },
  },
});

/* ───────────────────────────── option line (label/desc left, control right) ───────────────────────────── */

export const option = stylex.create({
  opt: {
    minWidth: 0,
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    padding: "14px 0",
  },
  optFirst: { paddingTop: 0 },
  optLast: { paddingBottom: 0 },
  optDivider: { borderTop: `1px solid ${tokens.borderSoft}` },
  optMain: { flex: 1, minWidth: 0 },
  optTitle: {
    display: "block",
    color: tokens.fg,
    fontSize: "14.5px",
    fontWeight: 600,
  },
  optDesc: {
    display: "block",
    marginTop: "3px",
    color: tokens.muted,
    fontSize: "13px",
    lineHeight: 1.45,
  },
  optEnd: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    paddingTop: "1px",
  },
});

/* ───────────────────────────── switch ───────────────────────────── */

export const switchStyle = stylex.create({
  switch: {
    position: "relative",
    display: "inline-block",
    width: "42px",
    height: "24px",
    flex: "0 0 auto",
    cursor: "pointer",
  },
  switchDisabled: {
    cursor: "not-allowed",
    opacity: 0.5,
  },
  input: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
  },
  track: {
    position: "absolute",
    inset: 0,
    borderRadius: "999px",
    backgroundColor: "#1b1e22",
    transition: "background 150ms ease",
  },
  trackOn: { backgroundColor: "#ec8a67" },
  knob: {
    position: "absolute",
    top: "3px",
    left: "3px",
    width: "18px",
    height: "18px",
    borderRadius: "999px",
    backgroundColor: "#aeb2b7",
    transition: "transform 150ms ease, background 150ms ease",
  },
  knobOn: { transform: "translateX(18px)", backgroundColor: "#230802" },
});

/* ───────────────────────────── custom checkbox ───────────────────────────── */

export const checkboxStyle = stylex.create({
  chk: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
    userSelect: "none",
    flex: "0 0 auto",
  },
  box: {
    width: "20px",
    height: "20px",
    borderRadius: "5px",
    display: "grid",
    placeItems: "center",
    backgroundColor: "#1b1e22",
    transition: "background 120ms",
  },
  boxOn: { backgroundColor: "#ec8a67" },
  check: {
    width: "13px",
    height: "13px",
    color: tokens.accentInk,
    opacity: 0,
    transform: "scale(.6)",
    transition: "all 130ms",
  },
  checkOn: { opacity: 1, transform: "none" },
});

/* ───────────────────────────── range slider ───────────────────────────── */
export const range = stylex.create({
  rangeRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginTop: "11px",
  },
  range: {
    flex: 1,
    height: "5px",
    borderRadius: "999px",
    outline: "none",
    appearance: "none",
    // Track + fill: the accent fill is a no-repeat gradient whose size is
    // driven by the `--fill` custom property (0–100%) set inline per input.
    backgroundImage: `linear-gradient(${tokens.accent}, ${tokens.accent})`,
    backgroundRepeat: "no-repeat",
    backgroundColor: tokens.fieldBg,
    backgroundSize: "var(--fill, 50%) 100%",
  },
  rangeVal: {
    fontFamily: tokens.fontMono,
    fontSize: "13px",
    color: tokens.muted,
    minWidth: "46px",
    textAlign: "right",
  },
});

/* ───────────────────────────── overview stats ───────────────────────────── */

export const stats = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    marginBottom: "18px",
  },
  stat: {
    padding: "15px 16px",
    borderRadius: tokens.radiusItem,
    background: tokens.surface,
    boxShadow: tokens.elevCtrl,
    border: 0,
    cursor: "pointer",
    textAlign: "left",
    ":hover": { background: tokens.panelHover },
  },
  num: {
    fontFamily: tokens.fontDisplay,
    fontSize: "26px",
    fontWeight: 700,
    lineHeight: 1,
    color: tokens.fg,
    display: "block",
  },
  numAccent: { color: tokens.accent },
  lbl: {
    marginTop: "6px",
    fontSize: "12px",
    color: tokens.muted,
    display: "block",
  },
});

/* ───────────────────────────── misc ───────────────────────────── */

export const misc = stylex.create({
  hint: {
    margin: 0,
    padding: "18px",
    fontSize: "13.5px",
    color: tokens.quiet,
    textAlign: "center",
  },
  kbd: {
    fontFamily: tokens.fontMono,
    fontSize: "12px",
    padding: "4px 9px",
    borderRadius: "5px",
    background: tokens.fieldBg,
    color: tokens.fg,
    boxShadow: tokens.elevCtrl,
  },
  textMuted: { color: tokens.muted },
  textQuiet: { color: tokens.quiet },
  textSmall: { fontSize: "12px" },
  note: { fontSize: "13px", lineHeight: 1.45, color: tokens.muted, marginTop: 0 },
  diagPass: { fontSize: "13px", color: tokens.success },
  diagFail: { fontSize: "13px", color: tokens.danger },
  emptyList: {
    padding: "18px",
    borderRadius: tokens.radiusPanel,
    color: tokens.quiet,
    background: tokens.bg,
    boxShadow: tokens.elevCtrl,
    textAlign: "center",
    fontSize: "13.5px",
  },
});

/* ───────────────────────────── layout splits ───────────────────────────── */

export const layout = stylex.create({
  section: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "18px",
  },
  rowStack: {
    display: "grid",
    gap: "8px",
  },
  split: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
    gap: "18px",
    alignItems: "start",
  },
  col: { minWidth: 0 },
  accessGrid: {
    display: "grid",
    gap: "8px",
  },
});
