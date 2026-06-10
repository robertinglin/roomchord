import React from "react";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { Avatar } from "@shared/ui/Avatar";
import { VideoStream } from "@shared/ui/CallMedia";
import { MicIcon, MicOffIcon, ScreenIcon, SpeakerIcon, VideoIcon, VideoOffIcon } from "@shared/ui/Icons";
import { MemberContextMenu, type MemberContextMenuAction } from "@shared/ui/MemberContextMenu";
import type { VoiceParticipant } from "@features/voice-room/model/types";
import { audioOn, cameraOn, cameraStream, isVoiceParticipantMuted, mediaLabel, participantGridClass, screenOn } from "@features/voice-room/model/voiceParticipants";
import type { ScreenPreviewSnapshot } from "roomkit-sdk/browser/types";

export function VoiceParticipantGrid({
  actorId,
  mutedVoiceParticipantIds,
  onDirectMessage,
  onToggleVoiceParticipantMute,
  participants,
  roomName,
  voicePreferences,
  inlinedShares,
  onWatchScreenShare
}: {
  actorId: string;
  mutedVoiceParticipantIds?: Record<string, boolean>;
  onDirectMessage?: (memberId: string) => void;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
  participants: VoiceParticipant[];
  roomName: string;
  voicePreferences: VoicePreferences;
  inlinedShares?: Array<{ participant: VoiceParticipant; preview: ScreenPreviewSnapshot | undefined; stream?: MediaStream }>;
  onWatchScreenShare?: (participantId: string) => void;
}) {
  function voiceParticipantActions(participant: VoiceParticipant): MemberContextMenuAction[] {
    if (participant.isLocal || !onToggleVoiceParticipantMute) return [];
    const muted = isVoiceParticipantMuted(participant, mutedVoiceParticipantIds);
    return [{
      id: "voice-mute",
      label: muted ? "Unmute" : "Mute",
      onSelect: () => onToggleVoiceParticipantMute(participant.id)
    }];
  }

  const totalTilesCount = participants.length + (inlinedShares?.length || 0);

  return (
    <div className={`voice-video-grid ${participantGridClass(totalTilesCount)}`} aria-label={`${roomName} participants`}>
      {totalTilesCount === 0 ? (
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
            <MemberContextMenu
              additionalActions={voiceParticipantActions(participant)}
              currentUserId={actorId}
              memberId={participant.memberId}
              memberName={participant.name}
              onDirectMessage={onDirectMessage}
            >
              {hasVideo ? (
                <VideoStream label={label} muted={participant.isLocal || voicePreferences.deafened} stream={participantCameraStream} />
              ) : (
                <div className="voice-video-placeholder">
                  <Avatar name={participant.name} avatar={participant.avatar} />
                </div>
              )}
            </MemberContextMenu>
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
      {inlinedShares?.map(({ participant, preview, stream }) => {
        const isLocalShare = participant.isLocal;
        const key = `${participant.id}-screen`;
        
        if (isLocalShare) {
          return (
            <article
              className="voice-video-tile has-video local-screen-share-tile"
              aria-label="Your screen share"
              key={key}
            >
              {stream ? (
                <VideoStream
                  label="Your screen share"
                  muted={true}
                  stream={stream}
                />
              ) : (
                <div className="screen-share-preview-placeholder" aria-label="Your screen share preview" />
              )}
              <div className="screen-share-card-overlay">
                <span>
                  <strong>Your screen</strong>
                  <small>Sharing now</small>
                </span>
              </div>
            </article>
          );
        } else {
          return (
            <article
              className="voice-video-tile screen-share-preview-tile"
              aria-label={`${participant.name} screen share preview`}
              key={key}
            >
              {preview?.dataUrl ? (
                <img
                  alt=""
                  aria-label={`${participant.name} screen share preview`}
                  className="screen-share-preview-image"
                  src={preview.dataUrl}
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
                  aria-label={`Watch ${participant.name} screen share`}
                  onClick={() => onWatchScreenShare?.(participant.id)}
                >
                  Watch
                </button>
              </div>
            </article>
          );
        }
      })}
    </div>
  );
}
