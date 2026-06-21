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
  },
  mobileSidebarOpen: {
    // The sidebar itself is transformed; the shell does not change on desktop.
  },
  backdrop: {
    display: "none",
  },
});

export function ChatShell({ launchHome, onOpenLaunchHomeRoom }: Pick<ChatProps, "launchHome" | "onOpenLaunchHomeRoom">) {
  const sidebarOpen = useChatUiStore((value) => value.sidebarOpen);
  const ui = useChatUiActions();

  return (
    <main {...stylex.props(styles.shell, sidebarOpen && styles.mobileSidebarOpen)}>
      <ChatSidebar
        launchHome={launchHome}
        onClose={() => ui.closeSidebar()}
        onNavigate={() => ui.closeSidebar()}
        onOpenLaunchHomeRoom={onOpenLaunchHomeRoom}
      />
      <div className="sb-backdrop" role="presentation" onClick={() => ui.closeSidebar()} />
      <ChatContent />
      <ChatPresenceRail />
      <ChatManageDialog />
    </main>
  );
}
