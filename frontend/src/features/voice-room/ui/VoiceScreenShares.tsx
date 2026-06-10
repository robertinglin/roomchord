import React from "react";
import type { ScreenPreviewSnapshot } from "roomkit-sdk/browser/types";
import { VideoStream } from "@shared/ui/CallMedia";
import type { VoiceParticipant } from "@features/voice-room/model/types";

export type ActiveScreenShare = {
  participant: VoiceParticipant;
  preview: ScreenPreviewSnapshot | undefined;
  stream: MediaStream;
};

export function VoiceScreenShares({
  activeShares,
  onStopWatching,
  voiceDeafened
}: {
  activeShares: ActiveScreenShare[];
  onStopWatching: (participantId: string) => void;
  voiceDeafened: boolean;
}) {
  if (!activeShares.length) return null;

  return (
    <div className="voice-shares-wrap">
      <div className="screen-share-stage" aria-label="Active screen shares">
        {activeShares.map(({ participant, stream }) => (
          <article className={`screen-share-card${participant.isLocal ? " local" : ""}`} key={participant.id}>
            <VideoStream
              label={participant.isLocal ? "Your screen share" : `${participant.name} screen share`}
              muted={participant.isLocal || voiceDeafened}
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
                  onClick={() => onStopWatching(participant.id)}
                >
                  Stop
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
