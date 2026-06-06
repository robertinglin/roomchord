import React from "react";
import type { ScreenPreviewSnapshot } from "roomkit-sdk/browser/types";
import { VideoStream } from "@shared/ui/CallMedia";
import type { VoiceParticipant } from "@features/voice-room/model/types";

export type ActiveScreenShare = {
  participant: VoiceParticipant;
  preview: ScreenPreviewSnapshot | undefined;
  stream: MediaStream;
};

export type PreviewScreenShare = {
  participant: VoiceParticipant;
  preview: ScreenPreviewSnapshot | undefined;
  stream?: MediaStream;
};

export function VoiceScreenShares({
  activeShares,
  onStopWatching,
  onWatch,
  previewShares,
  voiceDeafened
}: {
  activeShares: ActiveScreenShare[];
  onStopWatching: (participantId: string) => void;
  onWatch: (participantId: string) => void;
  previewShares: PreviewScreenShare[];
  voiceDeafened: boolean;
}) {
  return (
    <>
      {activeShares.length ? (
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
                  disabled={!stream && !onWatch}
                  aria-label={`Watch ${participant.name} screen share`}
                  onClick={() => onWatch(participant.id)}
                >
                  Watch
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
