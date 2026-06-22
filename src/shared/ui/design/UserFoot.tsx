import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar } from "./Avatar";
import { Button, type VoiceState } from "./Button";
import { MicGlyph, MicOffGlyph, GearGlyph, HeadphonesGlyph } from "./icons";

const styles = stylex.create({
  foot: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderTop: "1px solid oklch(0.11 0.006 250 / 0.72)",
    backgroundColor: tokens.surface,
    flex: "0 0 auto",
  },
  // The profile area: clickable (opens status menu) when onProfile given.
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
    flex: 1,
    border: 0,
    background: "transparent",
    cursor: "pointer",
    color: tokens.fg,
    textAlign: "left",
    padding: 0,
    borderRadius: tokens.radiusItem,
    ":hover": { backgroundColor: tokens.panelHover },
  },
  info: { minWidth: 0, flex: 1 },
  name: {
    display: "block",
    fontSize: "13.5px",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sub: { display: "block", fontSize: "11px", color: tokens.quiet },
  btns: { display: "flex", gap: "4px", flex: "0 0 auto" },
});

/**
 * Current-user footer. The profile (avatar + name + sub) is a button when
 * `onProfile` is provided (status menu); otherwise it's static. The trailing
 * buttons are: mute, deafen, settings — driven by the live voice state.
 */
export function UserFoot({
  avatar,
  name,
  sub,
  onProfile,
  profileExpanded,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onSettings,
}: {
  avatar?: string;
  name: string;
  sub: string;
  onProfile?: () => void;
  profileExpanded?: boolean;
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  onSettings?: () => void;
}) {
  const profileInner = (
    <>
      <Avatar avatar={avatar} name={name} size="md" status="on" alt={name} />
      <span {...stylex.props(styles.info)}>
        <span {...stylex.props(styles.name)}>{name}</span>
        <span {...stylex.props(styles.sub)}>{sub}</span>
      </span>
    </>
  );

  return (
    <div {...stylex.props(styles.foot)}>
      {onProfile ? (
        <button
          {...stylex.props(styles.profile)}
          type="button"
          aria-haspopup="menu"
          aria-expanded={profileExpanded}
          aria-label="Open status menu"
          onClick={onProfile}
        >
          {profileInner}
        </button>
      ) : (
        profileInner
      )}
      <span {...stylex.props(styles.btns)}>
        <Button
          variant="etched"
          size="sm"
          tone={muted ? "danger" : "quiet"}
          state={muted ? ("off" as VoiceState) : undefined}
          title={muted ? "Unmute mic" : "Mute mic"}
          aria-label={muted ? "Unmute mic" : "Mute mic"}
          onClick={onToggleMute}
        >
          {muted || deafened ? <MicOffGlyph size={16} /> : <MicGlyph size={16} />}
        </Button>
        <Button
          variant="etched"
          size="sm"
          tone={deafened ? "danger" : "quiet"}
          state={deafened ? ("off" as VoiceState) : undefined}
          title={deafened ? "Undeafen" : "Deafen"}
          aria-label={deafened ? "Undeafen" : "Deafen"}
          onClick={onToggleDeafen}
        >
          <HeadphonesGlyph size={16} />
        </Button>
        <Button
          variant="etched"
          size="sm"
          tone="quiet"
          title="Voice settings"
          aria-label="Open voice settings"
          onClick={onSettings}
        >
          <GearGlyph size={16} />
        </Button>
      </span>
    </div>
  );
}

export default UserFoot;
