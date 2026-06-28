import React, { useEffect, useRef } from "react";
import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { Avatar, Button } from "@shared/ui/design";
import { LeaveGlyph } from "@shared/ui/design/icons";
import { tokens } from "../../../shared/ui/theme.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  dock: {
    position: "fixed",
    left: "50%",
    bottom: "22px",
    zIndex: 60,
    width: "min(460px, calc(100vw - 28px))",
    minWidth: 0,
    display: "grid",
    gap: "12px",
    padding: "14px",
    borderRadius: "14px",
    color: tokens.fg,
    backgroundColor: "#171a1e",
    boxShadow: tokens.elevPanel,
    transform: "translateX(-50%)",
  },
  main: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "40px minmax(0, 1fr) auto",
    gap: "12px",
    alignItems: "center",
  },
  id: {
    minWidth: 0,
    display: "grid",
    gap: "2px",
  },
  title: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "14.5px",
    fontWeight: 700,
  },
  sub: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.muted,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12.5px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  media: {
    display: "grid",
    gridTemplateColumns: "1fr 92px",
    gap: "8px",
  },
  video: {
    width: "100%",
    minHeight: "150px",
    maxHeight: "260px",
    objectFit: "cover",
    borderRadius: tokens.radiusItem,
    backgroundColor: tokens.bg,
  },
  localVideo: {
    minHeight: "68px",
    maxHeight: "92px",
  },
  hiddenMedia: {
    display: "none",
  },
  error: {
    color: tokens.danger,
    fontSize: "12.5px",
  },
});

function callStatusText(status: string) {
  if (status === "incoming") return "Incoming call";
  if (status === "outgoing") return "Calling";
  if (status === "connecting") return "Connecting";
  if (status === "connected") return "Connected";
  return "Call";
}

function hasVideo(media?: CallMediaSettings) {
  return Boolean(media?.video || media?.screen);
}

function StreamMedia({
  "aria-label": ariaLabel,
  className,
  muted,
  playsInline = true,
  stream,
  video
}: {
  "aria-label": string;
  className?: string;
  muted?: boolean;
  playsInline?: boolean;
  stream?: MediaStream;
  video: boolean;
}) {
  const ref = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const setMediaRef = (node: HTMLAudioElement | HTMLVideoElement | null) => {
    ref.current = node;
    if (node) node.srcObject = stream || null;
  };
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  if (!stream) return null;
  if (video) {
    return <video ref={setMediaRef} aria-label={ariaLabel} autoPlay muted={muted} playsInline={playsInline} className={className} />;
  }
  return <audio ref={setMediaRef} aria-label={ariaLabel} autoPlay muted={muted} className={className} />;
}

export function ChatDirectCallDock() {
  const { directCalls } = useChatRuntime();
  const call = directCalls.state;
  const active = call.status !== "idle";
  const remoteName = call.remoteName || "Member";
  if (!active && !directCalls.error) return null;
  const remoteHasVideo = hasVideo(call.remoteMedia);
  const localHasVideo = hasVideo(call.media);
  return (
    <aside {...stylex.props(styles.dock)} aria-label="Direct call">
      <div {...stylex.props(styles.main)}>
        <Avatar name={remoteName} src={call.remoteAvatar} size="md" alt={remoteName} />
        <span {...stylex.props(styles.id)}>
          <strong {...stylex.props(styles.title)}>{remoteName}</strong>
          <span {...stylex.props(styles.sub)}>{active ? callStatusText(call.status) : directCalls.error}</span>
        </span>
        <span {...stylex.props(styles.actions)}>
          {call.status === "incoming" ? (
            <>
              <Button tone="accent" onClick={directCalls.acceptCall}>Accept</Button>
              <Button tone="danger" onClick={directCalls.declineCall}>Decline</Button>
            </>
          ) : null}
          {call.status === "outgoing" || call.status === "connecting" || call.status === "connected" ? (
            <Button tone="danger" aria-label="End call" title="End call" onClick={directCalls.endCall}>
              <LeaveGlyph size={16} />
            </Button>
          ) : null}
        </span>
      </div>
      {directCalls.error && active ? <div {...stylex.props(styles.error)}>{directCalls.error}</div> : null}
      {call.remoteStream || call.localStream ? (
        <div {...stylex.props(styles.media)}>
          <StreamMedia
            aria-label="Remote call media"
            className={remoteHasVideo ? stylex.props(styles.video).className : stylex.props(styles.hiddenMedia).className}
            stream={call.remoteStream}
            video={remoteHasVideo}
          />
          <StreamMedia
            aria-label="Your call media"
            className={localHasVideo ? stylex.props(styles.video, styles.localVideo).className : stylex.props(styles.hiddenMedia).className}
            muted={true}
            stream={call.localStream}
            video={localHasVideo}
          />
        </div>
      ) : null}
    </aside>
  );
}
