import React from "react";
import * as stylex from "@stylexjs/stylex";
import { ChatContent } from "@widgets/chat-shell/ui/ChatContent";
import { ChatManageDialog } from "@widgets/chat-shell/ui/ChatManageDialog";
import { ChatPresenceRail } from "@widgets/chat-shell/ui/ChatPresenceRail";
import { ChatSidebar } from "@widgets/chat-shell/ui/ChatSidebar";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { tokens } from "../../../shared/ui/theme.stylex";
import type { ChatProps } from "@entities/chat/model/types";

const styles = stylex.create({
  shell: {
    display: "grid",
    gridTemplateColumns: `${tokens.sidebarWidth} minmax(0, 1fr) ${tokens.railWidth}`,
    height: ["100vh", "100svh"],
    overflow: "hidden",
    color: tokens.fg,
    backgroundColor: tokens.bg,
    "@media (min-width: 600px) and (max-width: 1024px)": {
      gridTemplateColumns: "175px minmax(0, 1fr)",
    },
    "@media (max-width: 599px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  // Mobile sidebar backdrop — covers the viewport behind the open drawer.
  backdrop: {
    display: "none",
  },
  backdropShow: {
    "@media (max-width: 599px)": {
      display: "block",
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 35,
    },
  },
});

export function ChatShell({ launchHome, onOpenLaunchHomeRoom }: Pick<ChatProps, "launchHome" | "onOpenLaunchHomeRoom">) {
  const sidebarOpen = useChatUiStore((value) => value.sidebarOpen);
  const ui = useChatUiActions();
  const shell = stylex.props(styles.shell);
  const backdrop = stylex.props(styles.backdrop, sidebarOpen && styles.backdropShow);

  return (
    <main
      className={`shell${sidebarOpen ? " mobile-sidebar-open" : ""} ${shell.className}`}
      style={shell.style}
    >
      <ChatSidebar
        launchHome={launchHome}
        onClose={() => ui.closeSidebar()}
        onNavigate={() => ui.closeSidebar()}
        onOpenLaunchHomeRoom={onOpenLaunchHomeRoom}
      />
      <div
        className={`sb-backdrop ${backdrop.className}`}
        style={backdrop.style}
        role="presentation"
        onClick={() => ui.closeSidebar()}
      />
      <ChatContent />
      <ChatPresenceRail />
      <ChatManageDialog />
    </main>
  );
}
