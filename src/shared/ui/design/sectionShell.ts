import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

/**
 * Structural shell styles shared by the composed sections (Sidebar,
 * ChatColumn, MemberRail, AppShell). These are layout-only — column backdrops,
 * borders, scroll containers, and the app grid. They never restyle atoms.
 */
export const sectionShell = stylex.create({
  sidebar: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: tokens.surface,
    borderRight: "1px solid oklch(0.11 0.006 250 / 0.72)",
  },
  sidebarScroll: { flex: 1, overflowY: "auto", padding: "12px 10px 24px" },
  chat: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: tokens.bg,
    position: "relative",
  },
  chatScroll: { flex: 1, overflowY: "auto", padding: "16px 0 8px", scrollBehavior: "smooth" },
  rail: {
    minWidth: 0,
    overflowY: "auto",
    backgroundColor: tokens.surface,
    borderLeft: "1px solid oklch(0.11 0.006 250 / 0.72)",
    padding: "16px 8px 24px",
  },
  shell: {
    display: "grid",
    gridTemplateColumns: `${tokens.sidebarWidth} minmax(0, 1fr) ${tokens.railWidth}`,
    height: ["100vh", "100svh"],
    overflow: "hidden",
    backgroundColor: tokens.bg,
    color: tokens.fg,
  },
});
