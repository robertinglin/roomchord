import React, { useState } from "react";
import { RemoteAudioSink } from "@features/voice-room/ui/RemoteAudioSink";
import { VoiceParticipantGrid } from "@features/voice-room/ui/VoiceParticipantGrid";
import { VoiceScreenShares, type ActiveScreenShare } from "@features/voice-room/ui/VoiceScreenShares";
import type { VoiceRoomViewProps } from "@features/voice-room/model/types";
import { MenuIcon } from "@shared/ui/Icons";
import { audioOn, isVoiceParticipantMuted, roomParticipants, screenOn, screenShareStream, streamHasTrack } from "@features/voice-room/model/voiceParticipants";
import { VoiceControlPanel } from "@shared/ui/VoiceControlPanel";

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
    share.stream && !share.participant.isLocal && watchedShares[share.participant.id]
  ));
  const inlinedShares = screenShares.filter((share) => {
    if (share.participant.isLocal) return true;
    return !watchedShares[share.participant.id] || !share.stream;
  });
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
        {props.showSidebarMenu ? (
          <button
            type="button"
            className="chat-mobile-nav-toggle"
            aria-label="Open navigation"
            onClick={props.onOpenMenu || (() => undefined)}
          >
            <MenuIcon />
          </button>
        ) : null}
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
            voiceDeafened={props.voicePreferences.deafened}
            onStopWatching={stopWatchingShare}
          />
          <VoiceParticipantGrid
            actorId={props.actorId}
            mutedVoiceParticipantIds={props.mutedVoiceParticipantIds}
            onDirectMessage={props.onDirectMessage}
            onToggleVoiceParticipantMute={props.onToggleVoiceParticipantMute}
            participants={participants}
            roomName={props.room.name}
            voicePreferences={props.voicePreferences}
            inlinedShares={inlinedShares}
            onWatchScreenShare={watchShare}
          />
        </div>
      </div>
      {props.joinedRoomId === props.room.id ? (
        <div className="voice-room-controls">
          <VoiceControlPanel
            canSwapCamera={Boolean(props.voiceControlCanSwapCamera)}
            canUseVideo={Boolean(props.voiceControlCanUseVideo)}
            error={props.voiceControlError}
            label="Voice room controls"
            onLeave={props.onLeaveVoiceRoom || (() => undefined)}
            onToggleCameraSwap={props.onToggleVoiceCameraSwap}
            onToggleScreenShare={props.onToggleVoiceScreenShare || (() => undefined)}
            onToggleVideo={props.onToggleVoiceVideo || (() => undefined)}
            roomName={props.room.name}
            sfuActive={Boolean(props.voiceControlSfuActive)}
            sfuStatus={props.voiceControlSfuStatus || "idle"}
            showScreenShare={props.voiceControlShowScreenShare ?? true}
            shareActive={Boolean(props.voiceControlShareActive)}
            videoOn={Boolean(props.voiceControlVideoOn)}
          />
        </div>
      ) : null}
    </section>
  );
}
