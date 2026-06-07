import React from "react";
import { ChatContent } from "@widgets/chat-shell/ui/ChatContent";
import { ChatManageDialog } from "@widgets/chat-shell/ui/ChatManageDialog";
import { ChatPresenceRail } from "@widgets/chat-shell/ui/ChatPresenceRail";
import { ChatSidebar } from "@widgets/chat-shell/ui/ChatSidebar";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";

export function ChatShell() {
  const sidebarOpen = useChatUiStore((value) => value.sidebarOpen);
  const ui = useChatUiActions();

  return (
    <main className={`chat-shell${sidebarOpen ? " mobile-sidebar-open" : ""}`}>
      <ChatSidebar onClose={() => ui.closeSidebar()} onNavigate={() => ui.closeSidebar()} />
      <div className="chat-sidebar-shroud" role="presentation" onClick={() => ui.closeSidebar()} />
      <ChatContent />
      <ChatManageDialog />
      <ChatPresenceRail />
    </main>
  );
}
