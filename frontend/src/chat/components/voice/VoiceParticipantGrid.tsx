import React from "react";
import type { VoicePreferences } from "../../localVoicePreferences";
import { Avatar } from "../Avatar";
import { VideoStream } from "../CallMedia";
import { MicIcon, MicOffIcon, ScreenIcon, SpeakerIcon, VideoIcon, VideoOffIcon } from "../Icons";
import { MemberContextMenu, type MemberContextMenuAction } from "../MemberContextMenu";
import type { VoiceParticipant } from "./types";
import { audioOn, cameraOn, cameraStream, isVoiceParticipantMuted, mediaLabel, participantGridClass, screenOn } from "./voiceParticipants";

export function VoiceParticipantGrid({
  actorId,
  mutedVoiceParticipantIds,
  onDirectMessage,
  onToggleVoiceParticipantMute,
  participants,
  roomName,
  voicePreferences
}: {
  actorId: string;
  mutedVoiceParticipantIds?: Record<string, boolean>;
  onDirectMessage?: (memberId: string) => void;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
  participants: VoiceParticipant[];
  roomName: string;
  voicePreferences: VoicePreferences;
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

  return (
    <div className={`voice-video-grid ${participantGridClass(participants.length)}`} aria-label={`${roomName} participants`}>
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
              <VideoStream label={label} muted={participant.isLocal || voicePreferences.deafened} stream={participantCameraStream} />
            ) : (
              <div className="voice-video-placeholder">
                <MemberContextMenu
                  additionalActions={voiceParticipantActions(participant)}
                  currentUserId={actorId}
                  memberId={participant.memberId}
                  memberName={participant.name}
                  onDirectMessage={onDirectMessage}
                >
                  <Avatar name={participant.name} avatar={participant.avatar} />
                </MemberContextMenu>
              </div>
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
  );
}
