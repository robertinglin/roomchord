import React from "react";
import { Avatar } from "@shared/ui/Avatar";
import { GearIcon, HeadphonesIcon, HeadphonesOffIcon, MicIcon, MicOffIcon } from "@shared/ui/Icons";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";

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
    <div className="user-foot">
      <button
        className="uf-profile"
        type="button"
        aria-haspopup="menu"
        aria-expanded={statusMenuOpen}
        aria-label="Open status menu"
        onClick={onToggleStatusMenu}
      >
        <span className="uf-av">
          <Avatar name={actorName} avatar={actorAvatar} />
          <span className="uf-stat" aria-hidden="true" />
        </span>
        <span className="uf-info">
          <span className="uf-name">{actorName}</span>
          <span className="uf-sub">{actorRole}</span>
        </span>
      </button>
      <div className="uf-btns" aria-label="Local voice preferences">
        <button
          className={`uf-btn etch${voicePreferences.muted ? " active" : ""}`}
          type="button"
          aria-label={voicePreferences.muted ? "Unmute mic" : "Mute mic"}
          title={voicePreferences.muted ? "Unmute mic" : "Mute mic"}
          onClick={onToggleMute}
        >
          {voicePreferences.muted || voicePreferences.deafened ? <MicOffIcon className="ico" /> : <MicIcon className="ico" />}
        </button>
        <button
          className={`uf-btn etch${voicePreferences.deafened ? " active" : ""}`}
          type="button"
          aria-label={voicePreferences.deafened ? "Undeafen" : "Deafen"}
          title={voicePreferences.deafened ? "Undeafen" : "Deafen"}
          onClick={onToggleDeafen}
        >
          {voicePreferences.deafened ? <HeadphonesOffIcon className="ico" /> : <HeadphonesIcon className="ico" />}
        </button>
        <button
          className="uf-btn etch"
          type="button"
          aria-label="Open voice settings"
          title="Voice settings"
          onClick={onOpenVoiceSettings}
        >
          <GearIcon className="ico" />
        </button>
      </div>
    </div>
  );
}
