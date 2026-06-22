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
    "@media (min-width: 600px) and (max-width: 1024px)": {
      width: "175px",
    },
    "@media (max-width: 599px)": {
      position: "fixed",
      left: 0,
      top: 0,
      bottom: 0,
      width: "284px",
      zIndex: 40,
      transform: "translateX(-100%)",
      transition: "transform 200ms ease",
    },
  },
  sidebarOpen: {
    "@media (max-width: 599px)": {
      transform: "translateX(0)",
      boxShadow: tokens.elevPanel,
    },
  },
  sidebarScroll: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 10px 24px",
    "@media (min-width: 600px) and (max-width: 1024px)": {
      padding: "8px 10px 14px",
    },
  },
  chat: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: tokens.bg,
    position: "relative",
    "@media (max-width: 599px)": {
      height: "100svh",
    },
  },
  chatScroll: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 0 8px",
    scrollBehavior: "smooth",
    "@media (max-width: 599px)": {
      padding: "12px 0 calc(12px + env(safe-area-inset-bottom))",
    },
  },
  rail: {
    minWidth: 0,
    overflowY: "auto",
    backgroundColor: tokens.surface,
    borderLeft: "1px solid oklch(0.11 0.006 250 / 0.72)",
    padding: "16px 8px 24px",
    "@media (max-width: 1024px)": {
      display: "none",
    },
  },
  shell: {
    display: "grid",
    gridTemplateColumns: `${tokens.sidebarWidth} minmax(0, 1fr) ${tokens.railWidth}`,
    height: ["100vh", "100svh"],
    overflow: "hidden",
    backgroundColor: tokens.bg,
    color: tokens.fg,
    "@media (min-width: 600px) and (max-width: 1024px)": {
      gridTemplateColumns: "175px minmax(0, 1fr)",
    },
    "@media (max-width: 599px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});
