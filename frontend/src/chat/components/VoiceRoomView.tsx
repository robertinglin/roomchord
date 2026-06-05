import React, { useState } from "react";
import { RemoteAudioSink } from "./RemoteAudioSink";
import { VoiceParticipantGrid } from "./voice/VoiceParticipantGrid";
import { VoiceScreenShares, type ActiveScreenShare } from "./voice/VoiceScreenShares";
import type { VoiceRoomViewProps } from "./voice/types";
import { audioOn, isVoiceParticipantMuted, roomParticipants, screenOn, screenShareStream, streamHasTrack } from "./voice/voiceParticipants";

export type { VoiceRoomViewProps };

export function VoiceRoomView(props: VoiceRoomViewProps) {
  const [watchedShares, setWatchedShares] = useState<Record<string, boolean>>({});
  const participants = roomParticipants(props);
  const joined = props.joinedRoomId === props.room.id;
  const status = props.sfu.mediaRoomId === props.room.id ? props.sfu.status : joined ? "joined" : "idle";
  const screenShares = participants
    .filter((participant) => screenOn(participant))
    .map((participant) => ({ participant, preview: participant.screenPreview, stream: screenShareStream(participant) }));
  const activeShares = screenShares.filter((
    share
  ): share is ActiveScreenShare => Boolean(
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
  const layoutClass = activeShares.length ? "voice-room-layout has-active-share" : "voice-room-layout";

  function watchShare(participantId: string) {
    props.onWatchScreenShare?.(participantId);
    setWatchedShares((current) => ({ ...current, [participantId]: true }));
  }

  function stopWatchingShare(participantId: string) {
    props.onStopWatchingScreenShare?.(participantId);
    setWatchedShares((current) => ({ ...current, [participantId]: false }));
  }

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
          <VoiceScreenShares
            activeShares={activeShares}
            previewShares={previewShares}
            voiceDeafened={props.voicePreferences.deafened}
            onStopWatching={stopWatchingShare}
            onWatch={watchShare}
          />
          <VoiceParticipantGrid
            actorId={props.actorId}
            mutedVoiceParticipantIds={props.mutedVoiceParticipantIds}
            onDirectMessage={props.onDirectMessage}
            onToggleVoiceParticipantMute={props.onToggleVoiceParticipantMute}
            participants={participants}
            roomName={props.room.name}
            voicePreferences={props.voicePreferences}
          />
        </div>
      </div>
    </section>
  );
}
