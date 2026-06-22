import React from "react";
import { UserFoot } from "@shared/ui/design";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";

/**
 * Thin adapter: maps the live app's voice-preference state onto the UserFoot
 * atom's props. No local styling — UserFoot owns the whole footer.
 */
export function SelfAccountRow({
  actorAvatar,
  actorName,
  actorRole,
  statusMenuOpen,
  voicePreferences,
  onOpenVoiceSettings,
  onToggleDeafen,
  onToggleMute,
  onToggleStatusMenu
}: {
  actorAvatar?: string;
  actorName: string;
  actorRole: string;
  statusMenuOpen: boolean;
  voicePreferences: VoicePreferences;
  onOpenVoiceSettings: () => void;
  onToggleDeafen: () => void;
  onToggleMute: () => void;
  onToggleStatusMenu: () => void;
}) {
  return (
    <UserFoot
      avatar={actorAvatar}
      name={actorName}
      sub={actorRole}
      onProfile={onToggleStatusMenu}
      profileExpanded={statusMenuOpen}
      muted={voicePreferences.muted}
      deafened={voicePreferences.deafened}
      onToggleMute={onToggleMute}
      onToggleDeafen={onToggleDeafen}
      onSettings={onOpenVoiceSettings}
    />
  );
}
