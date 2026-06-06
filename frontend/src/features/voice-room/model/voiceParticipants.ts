import { mediaStreamForTrackRole, mediaTrackRole } from "roomkit-sdk/browser/mediaCapture";
import type { CallMediaSettings, CallMediaTrackInfo, ScreenPreviewSnapshot } from "roomkit-sdk/browser/types";
import type { RoomKitEphemeralToken } from "roomkit-sdk/browser/liveRoomConnector";
import type { VoiceParticipant, VoiceRoomViewProps } from "@features/voice-room/model/types";

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

function liveVideoTracks(stream: MediaStream | undefined) {
  return stream?.getVideoTracks().filter((track) => track.readyState === "live") || [];
}

function streamFromTracks(tracks: MediaStreamTrack[]) {
  return tracks.length ? new MediaStream(tracks) : undefined;
}

export function roomParticipants({ actorAvatar, actorId, actorName, joinedRoomId, localMedia, room, sfu, voiceTokens }: VoiceRoomViewProps): VoiceParticipant[] {
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

export function streamHasTrack(stream: MediaStream | undefined, kind: "audio" | "video") {
  return Boolean(stream?.getTracks().some((track) => track.kind === kind && track.readyState === "live"));
}

export function cameraStream(participant: VoiceParticipant): MediaStream | undefined {
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

export function screenShareStream(participant: VoiceParticipant): MediaStream | undefined {
  if (!participant.media?.screen) return undefined;
  if (participant.screenStream) return participant.screenStream;
  const declaredScreen = mediaStreamForTrackRole(participant.stream, "screen", participant.mediaTracks);
  if (declaredScreen) return declaredScreen;
  const tracks = liveVideoTracks(participant.stream);
  if (participant.media.video && tracks.length > 1) return streamFromTracks(tracks.slice(1));
  if (!participant.media.video) return streamFromTracks(tracks.slice(0, 1));
  return undefined;
}

export function audioOn(participant: VoiceParticipant) {
  if (participant.media?.audio !== undefined) return participant.media.audio !== false;
  return streamHasTrack(participant.stream, "audio");
}

export function cameraOn(participant: VoiceParticipant) {
  if (participant.media?.video !== undefined) return Boolean(participant.media.video);
  return Boolean(cameraStream(participant));
}

export function screenOn(participant: VoiceParticipant) {
  return Boolean(participant.media?.screen);
}

export function mediaLabel(participant: VoiceParticipant) {
  const audio = audioOn(participant) ? "Mic on" : "Muted";
  const video = cameraOn(participant) ? "Camera on" : "Camera off";
  return screenOn(participant) ? `${audio} · ${video} · Sharing` : `${audio} · ${video}`;
}

export function isVoiceParticipantMuted(participant: VoiceParticipant, mutedVoiceParticipantIds: Record<string, boolean> = {}) {
  return Boolean(mutedVoiceParticipantIds[participant.id] || (participant.memberId && mutedVoiceParticipantIds[participant.memberId]));
}

export function participantGridClass(count: number) {
  if (count >= 9) return "participant-count-many";
  return `participant-count-${Math.max(1, count)}`;
}
