import React from "react";
import { Avatar } from "../Avatar";
import { GearIcon, HeadphonesIcon, HeadphonesOffIcon, MicIcon, MicOffIcon } from "../Icons";
import type { VoicePreferences } from "../../localVoicePreferences";

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
    <div className="self-account-row">
      <button
        className="self-identity"
        type="button"
        aria-haspopup="menu"
        aria-expanded={statusMenuOpen}
        aria-label="Open status menu"
        onClick={onToggleStatusMenu}
      >
        <Avatar name={actorName} avatar={actorAvatar} />
        <span>
          <strong>{actorName}</strong>
          <small>{actorRole}</small>
        </span>
      </button>
      <div className="self-audio-controls" aria-label="Local voice preferences">
        <button
          className={`self-icon-button${voicePreferences.muted ? " active" : ""}`}
          type="button"
          aria-label={voicePreferences.muted ? "Unmute mic" : "Mute mic"}
          title={voicePreferences.muted ? "Unmute mic" : "Mute mic"}
          onClick={onToggleMute}
        >
          {voicePreferences.muted || voicePreferences.deafened ? <MicOffIcon /> : <MicIcon />}
        </button>
        <button
          className={`self-icon-button${voicePreferences.deafened ? " active" : ""}`}
          type="button"
          aria-label={voicePreferences.deafened ? "Undeafen" : "Deafen"}
          title={voicePreferences.deafened ? "Undeafen" : "Deafen"}
          onClick={onToggleDeafen}
        >
          {voicePreferences.deafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
        </button>
        <button
          className="self-icon-button"
          type="button"
          aria-label="Open voice settings"
          title="Voice settings"
          onClick={onOpenVoiceSettings}
        >
          <GearIcon />
        </button>
      </div>
    </div>
  );
}
