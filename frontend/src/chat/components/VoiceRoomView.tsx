import React, { useState } from "react";
import { mediaStreamForTrackRole, mediaTrackRole } from "roomkit-sdk/browser/mediaCapture";
import type { CallMediaSettings, CallMediaTrackInfo, ScreenPreviewSnapshot, SfuCallState } from "roomkit-sdk/browser/types";
import type { RoomKitEphemeralToken } from "../../../../shared/frontend/liveHost";
import type { VoicePreferences } from "../localVoicePreferences";
import type { MediaRoom } from "../types";
import { Avatar } from "./Avatar";
import { VideoStream } from "./CallMedia";
import { MicIcon, MicOffIcon, ScreenIcon, SpeakerIcon, VideoIcon, VideoOffIcon } from "./Icons";
import { MemberContextMenu, type MemberContextMenuAction } from "./MemberContextMenu";
import { RemoteAudioSink } from "./RemoteAudioSink";

type VoiceParticipant = {
  avatar: string;
  id: string;
  isLocal?: boolean;
  memberId?: string;
  media?: CallMediaSettings;
  mediaTracks?: CallMediaTrackInfo[];
  name: string;
  screenPreview?: ScreenPreviewSnapshot;
  screenStream?: MediaStream;
  stream?: MediaStream;
};

type Props = {
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  joinedRoomId?: string;
  localMedia?: CallMediaSettings;
  room: MediaRoom;
  sfu: SfuCallState;
  voicePreferences: VoicePreferences;
  voiceTokens: RoomKitEphemeralToken[];
  mutedVoiceParticipantIds?: Record<string, boolean>;
  onDirectMessage?: (memberId: string) => void;
  onStopWatchingScreenShare?: (participantId: string) => void;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
  onWatchScreenShare?: (participantId: string) => void;
};

function tokenMedia(token: RoomKitEphemeralToken): CallMediaSettings | undefined {
  const media = token.payload?.media;
  if (!media || typeof media !== "object") return undefined;
  return media as CallMediaSettings;
}

function tokenMediaTracks(token: RoomKitEphemeralToken): CallMediaTrackInfo[] | undefined {
  const mediaTracks = token.payload?.mediaTracks;
  return Array.isArray(mediaTracks) ? mediaTracks as CallMediaTrackInfo[] : undefined;
}

function tokenScreenPreview(token: RoomKitEphemeralToken): ScreenPreviewSnapshot | undefined {
  const preview = token.payload?.screenPreview;
  if (!preview || typeof preview !== "object") return undefined;
  const snapshot = preview as ScreenPreviewSnapshot;
  if (snapshot.kind !== "screen-preview" || typeof snapshot.dataUrl !== "string") return undefined;
  if (!snapshot.dataUrl.startsWith("data:image/")) return undefined;
  return snapshot;
}

function tokenAvatar(token: RoomKitEphemeralToken) {
  return typeof token.payload?.avatar === "string" ? token.payload.avatar : undefined;
}

function initialFor(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}

function roomParticipants({ actorAvatar, actorId, actorName, joinedRoomId, localMedia, room, sfu, voiceTokens }: Props): VoiceParticipant[] {
  const participants = new Map<string, VoiceParticipant>();
  if (joinedRoomId === room.id) {
    participants.set(actorId, {
      avatar: actorAvatar || initialFor(actorName),
      id: actorId,
      isLocal: true,
      memberId: actorId,
      media: sfu.mediaRoomId === room.id ? sfu.media : localMedia,
      mediaTracks: sfu.mediaRoomId === room.id ? sfu.localMediaTracks : undefined,
      name: actorName,
      stream: sfu.mediaRoomId === room.id ? sfu.localStream : undefined
    });
  }
  for (const token of voiceTokens.filter((item) => item.scope === room.id)) {
    const id = token.clientId || token.ownerId || token.id;
    const current = participants.get(id);
    participants.set(id, {
      avatar: current?.avatar || tokenAvatar(token) || initialFor(token.ownerName || id),
      id,
      isLocal: current?.isLocal,
      memberId: current?.memberId || token.ownerId,
      media: tokenMedia(token) || current?.media,
      mediaTracks: tokenMediaTracks(token) || current?.mediaTracks,
      name: token.ownerName || current?.name || id,
      screenPreview: tokenScreenPreview(token) || current?.screenPreview,
      stream: current?.stream
    });
  }
  for (const remote of sfu.mediaRoomId === room.id ? sfu.remoteStreams : []) {
    const current = participants.get(remote.clientId);
    participants.set(remote.clientId, {
      avatar: remote.avatar || initialFor(remote.name),
      id: remote.clientId,
      memberId: current?.memberId,
      media: remote.media || current?.media,
      mediaTracks: current?.mediaTracks || remote.mediaTracks,
      name: remote.name,
      screenPreview: current?.screenPreview,
      screenStream: current?.screenStream,
      stream: remote.stream
    });
  }
  for (const remote of sfu.mediaRoomId === room.id ? sfu.remoteScreenStreams || [] : []) {
    const current = participants.get(remote.clientId);
    participants.set(remote.clientId, {
      avatar: current?.avatar || remote.avatar || initialFor(remote.name),
      id: remote.clientId,
      isLocal: current?.isLocal,
      memberId: current?.memberId,
      media: current?.media || remote.media,
      mediaTracks: current?.mediaTracks,
      name: current?.name || remote.name,
      screenPreview: current?.screenPreview,
      screenStream: remote.stream,
      stream: current?.stream
    });
  }
  return Array.from(participants.values());
}

function streamHasTrack(stream: MediaStream | undefined, kind: "audio" | "video") {
  return Boolean(stream?.getTracks().some((track) => track.kind === kind && track.readyState === "live"));
}

function liveVideoTracks(stream: MediaStream | undefined) {
  return stream?.getVideoTracks().filter((track) => track.readyState === "live") || [];
}

function streamFromTracks(tracks: MediaStreamTrack[]) {
  return tracks.length ? new MediaStream(tracks) : undefined;
}

function cameraStream(participant: VoiceParticipant): MediaStream | undefined {
  const declaredCamera = mediaStreamForTrackRole(participant.stream, "camera", participant.mediaTracks);
  if (declaredCamera) return declaredCamera;
  const tracks = liveVideoTracks(participant.stream);
  if (participant.media?.video === false) return undefined;
  if (participant.media?.screen && !participant.media.video) return undefined;
  const nonScreenTracks = tracks.filter((track, index) => mediaTrackRole(track, index, participant.mediaTracks) !== "screen");
  if (participant.media?.video && nonScreenTracks.length) return streamFromTracks(nonScreenTracks.slice(0, 1));
  if (participant.media?.video) return streamFromTracks(tracks.slice(0, 1));
  return streamFromTracks(tracks);
}

function screenShareStream(participant: VoiceParticipant): MediaStream | undefined {
  if (!participant.media?.screen) return undefined;
  if (participant.screenStream) return participant.screenStream;
  const declaredScreen = mediaStreamForTrackRole(participant.stream, "screen", participant.mediaTracks);
  if (declaredScreen) return declaredScreen;
  const tracks = liveVideoTracks(participant.stream);
  if (participant.media.video && tracks.length > 1) return streamFromTracks(tracks.slice(1));
  if (!participant.media.video) return streamFromTracks(tracks.slice(0, 1));
  return undefined;
}

function audioOn(participant: VoiceParticipant) {
  if (participant.media?.audio !== undefined) return participant.media.audio !== false;
  return streamHasTrack(participant.stream, "audio");
}

function cameraOn(participant: VoiceParticipant) {
  if (participant.media?.video !== undefined) return Boolean(participant.media.video);
  return Boolean(cameraStream(participant));
}

function screenOn(participant: VoiceParticipant) {
  return Boolean(participant.media?.screen);
}

function mediaLabel(participant: VoiceParticipant) {
  const audio = audioOn(participant) ? "Mic on" : "Muted";
  const video = cameraOn(participant) ? "Camera on" : "Camera off";
  return screenOn(participant) ? `${audio} · ${video} · Sharing` : `${audio} · ${video}`;
}

function isVoiceParticipantMuted(participant: VoiceParticipant, mutedVoiceParticipantIds: Record<string, boolean> = {}) {
  return Boolean(mutedVoiceParticipantIds[participant.id] || (participant.memberId && mutedVoiceParticipantIds[participant.memberId]));
}

function participantGridClass(count: number) {
  if (count >= 9) return "participant-count-many";
  return `participant-count-${Math.max(1, count)}`;
}

export function VoiceRoomView(props: Props) {
  const [watchedShares, setWatchedShares] = useState<Record<string, boolean>>({});
  const participants = roomParticipants(props);
  const joined = props.joinedRoomId === props.room.id;
  const status = props.sfu.mediaRoomId === props.room.id ? props.sfu.status : joined ? "joined" : "idle";
  const screenShares = participants
    .filter((participant) => screenOn(participant))
    .map((participant) => ({ participant, preview: participant.screenPreview, stream: screenShareStream(participant) }));
  const activeShares = screenShares.filter((
    share
  ): share is { participant: VoiceParticipant; preview: ScreenPreviewSnapshot | undefined; stream: MediaStream } => Boolean(
    share.stream && (share.participant.isLocal || watchedShares[share.participant.id])
  ));
  const previewShares = screenShares.filter((share) => !share.participant.isLocal && (!watchedShares[share.participant.id] || !share.stream));
  const remoteAudioStreams = participants
    .filter((participant) => !participant.isLocal && !isVoiceParticipantMuted(participant, props.mutedVoiceParticipantIds) && participant.stream && audioOn(participant) && streamHasTrack(participant.stream, "audio"))
    .map((participant) => ({
      id: participant.id,
      label: `${participant.name} room audio`,
      stream: participant.stream!
    }));

  function voiceParticipantActions(participant: VoiceParticipant): MemberContextMenuAction[] {
    if (participant.isLocal || !props.onToggleVoiceParticipantMute) return [];
    const muted = isVoiceParticipantMuted(participant, props.mutedVoiceParticipantIds);
    return [{
      id: "voice-mute",
      label: muted ? "Unmute" : "Mute",
      onSelect: () => props.onToggleVoiceParticipantMute?.(participant.id)
    }];
  }
  const layoutClass = activeShares.length ? "voice-room-layout has-active-share" : "voice-room-layout";
  return (
    <section className="chat-main voice-room-main" aria-labelledby="active-room-heading">
      <RemoteAudioSink muted={props.voicePreferences.deafened} streams={remoteAudioStreams} />
      <header className="chat-main-header">
        <div>
          <h1 id="active-room-heading">{props.room.name}</h1>
          <p>{participants.length} {participants.length === 1 ? "participant" : "participants"} · {props.room.allowsVideo === false ? "Audio only" : "Camera allowed"}</p>
        </div>
        <span className={`voice-room-status ${status}`}>{status}</span>
      </header>

      <div className="voice-room-body">
        <div className={layoutClass}>
          {activeShares.length ? (
            <div className="screen-share-stage" aria-label="Active screen shares">
              {activeShares.map(({ participant, stream }) => (
                <article className={`screen-share-card${participant.isLocal ? " local" : ""}`} key={participant.id}>
                  <VideoStream
                    label={participant.isLocal ? "Your screen share" : `${participant.name} screen share`}
                    muted={participant.isLocal || props.voicePreferences.deafened}
                    stream={stream}
                  />
                  <div className="screen-share-card-overlay">
                    <span>
                      <strong>{participant.isLocal ? "Your screen" : `${participant.name}'s screen`}</strong>
                      <small>{participant.isLocal ? "Sharing now" : "Watching"}</small>
                    </span>
                    {!participant.isLocal ? (
                      <button
                        className="screen-share-watch-button"
                        type="button"
                        aria-label={`Stop watching ${participant.name} screen share`}
                        onClick={() => {
                          props.onStopWatchingScreenShare?.(participant.id);
                          setWatchedShares((current) => ({ ...current, [participant.id]: false }));
                        }}
                      >
                        Stop
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {previewShares.length ? (
            <div className="screen-share-preview-row" aria-label="Available screen shares">
              {previewShares.map(({ participant, stream }) => (
                <article className="screen-share-preview-card" key={participant.id}>
                  {participant.screenPreview ? (
                    <img
                      alt=""
                      aria-label={`${participant.name} screen share preview`}
                      className="screen-share-preview-image"
                      src={participant.screenPreview.dataUrl}
                    />
                  ) : (
                    <div className="screen-share-preview-placeholder" aria-label={`${participant.name} screen share preview`} />
                  )}
                  <div className="screen-share-preview-overlay">
                    <span>
                      <strong>{participant.name}</strong>
                      <small>Screen share</small>
                    </span>
                    <button
                      className="screen-share-watch-button"
                      type="button"
                      disabled={!stream && !props.onWatchScreenShare}
                      aria-label={`Watch ${participant.name} screen share`}
                      onClick={() => {
                        props.onWatchScreenShare?.(participant.id);
                        setWatchedShares((current) => ({ ...current, [participant.id]: true }));
                      }}
                    >
                      Watch
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className={`voice-video-grid ${participantGridClass(participants.length)}`} aria-label={`${props.room.name} participants`}>
            {participants.length === 0 ? (
              <div className="empty-thread">
                <strong>No one is in this room</strong>
                <span>No active voice participants.</span>
              </div>
            ) : null}
            {participants.map((participant) => {
              const label = participant.isLocal ? "Your room video" : `${participant.name} room video`;
              const participantCameraStream = cameraStream(participant);
              const hasVideo = Boolean(participantCameraStream);
              return (
                <article className={`voice-video-tile${hasVideo ? " has-video" : ""}`} aria-label={`${participant.name} participant`} key={participant.id}>
                  {hasVideo ? (
                    <VideoStream label={label} muted={participant.isLocal || props.voicePreferences.deafened} stream={participantCameraStream} />
                  ) : (
                    <>
                      <div className="voice-video-placeholder">
                        <MemberContextMenu
                          additionalActions={voiceParticipantActions(participant)}
                          currentUserId={props.actorId}
                          memberId={participant.memberId}
                          memberName={participant.name}
                          onDirectMessage={props.onDirectMessage}
                        >
                          <Avatar name={participant.name} avatar={participant.avatar} />
                        </MemberContextMenu>
                      </div>
                    </>
                  )}
                  <span className="voice-video-overlay">
                    <SpeakerIcon className="ui-icon voice-video-speaker" />
                    <span className="voice-video-name">{participant.name}</span>
                    <span className="voice-video-media" aria-label={mediaLabel(participant)}>
                      {audioOn(participant) ? <MicIcon /> : <MicOffIcon />}
                      {cameraOn(participant) ? <VideoIcon /> : <VideoOffIcon />}
                      {screenOn(participant) ? <ScreenIcon /> : null}
                    </span>
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
