import React from "react";
import { ChatContent } from "@widgets/chat-shell/ui/ChatContent";
import { ChatManageDialog } from "@widgets/chat-shell/ui/ChatManageDialog";
import { ChatPresenceRail } from "@widgets/chat-shell/ui/ChatPresenceRail";
import { ChatSidebar } from "@widgets/chat-shell/ui/ChatSidebar";

export function ChatShell() {
  return (
    <main className="chat-shell">
      <ChatSidebar />
      <ChatContent />
      <ChatManageDialog />
      <ChatPresenceRail />
    </main>
  );
}
