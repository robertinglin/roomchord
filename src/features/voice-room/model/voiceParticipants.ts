import { mediaStreamForTrackRole, mediaTrackRole } from "matterhorn-sdk/browser/mediaCapture";
import type { CallMediaSettings, CallMediaTrackInfo, ScreenPreviewSnapshot } from "matterhorn-sdk/browser/types";
import type { EphemeralToken } from "matterhorn-sdk/browser/liveRoomConnector";
import type { VoiceParticipant, VoiceRoomViewProps } from "@features/voice-room/model/types";

function projectedModeration(room: VoiceRoomViewProps["room"], memberId: string | undefined) {
  if (!memberId || !room.participants || Array.isArray(room.participants)) return {};
  const participant = room.participants[memberId];
  return {
    deafened: participant?.deafened === true,
    moderationSuppressed: participant?.suppressed === true || (room.kind === "stage" && room.stage?.open === false),
    muted: participant?.muted === true
  };
}

function projectedStage(room: VoiceRoomViewProps["room"], memberId: string | undefined) {
  return {
    stageRequest: Boolean(memberId && room.stage?.requests?.[memberId]),
    stageSpeaker: Boolean(memberId && room.stage?.speakers?.[memberId])
  };
}

function blockedByRoom(room: VoiceRoomViewProps["room"], memberId: string | undefined) {
  return Boolean(memberId && room.blockedMembers?.[memberId]);
}

function tokenMedia(token: EphemeralToken): CallMediaSettings | undefined {
  const media = token.payload?.media;
  if (!media || typeof media !== "object") return undefined;
  return media as CallMediaSettings;
}

function tokenMediaTracks(token: EphemeralToken): CallMediaTrackInfo[] | undefined {
  const mediaTracks = token.payload?.mediaTracks;
  return Array.isArray(mediaTracks) ? mediaTracks as CallMediaTrackInfo[] : undefined;
}

function tokenScreenPreview(token: EphemeralToken): ScreenPreviewSnapshot | undefined {
  const preview = token.payload?.screenPreview;
  if (!preview || typeof preview !== "object") return undefined;
  const snapshot = preview as ScreenPreviewSnapshot;
  if (snapshot.kind !== "screen-preview" || typeof snapshot.dataUrl !== "string") return undefined;
  if (!snapshot.dataUrl.startsWith("data:image/")) return undefined;
  return snapshot;
}

function tokenAvatar(token: EphemeralToken) {
  return typeof token.payload?.avatar === "string" ? token.payload.avatar : undefined;
}

function tokenVoiceStatus(token: EphemeralToken) {
  const status = token.payload?.voiceStatus;
  if (!status || typeof status !== "object") return {};
  const value = status as { deafened?: unknown; muted?: unknown };
  return {
    deafened: value.deafened === true,
    muted: value.muted === true
  };
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

export function roomParticipants({ actorAvatar, actorId, actorName, joinedRoomId, localMedia, room, sfu, voicePreferences, voiceTokens }: VoiceRoomViewProps): VoiceParticipant[] {
  const participants = new Map<string, VoiceParticipant>();
  const localClientIds = new Set(
    voiceTokens
      .filter((token) => token.scope === room.id && token.ownerId === actorId && token.clientId)
      .map((token) => token.clientId!)
  );
  if (joinedRoomId === room.id) {
    const moderation = projectedModeration(room, actorId);
    const stage = projectedStage(room, actorId);
    participants.set(actorId, {
      avatar: actorAvatar || initialFor(actorName),
      deafened: voicePreferences.deafened,
      id: actorId,
      isLocal: true,
      memberId: actorId,
      media: sfu.mediaRoomId === room.id ? sfu.media : localMedia,
      mediaTracks: sfu.mediaRoomId === room.id ? sfu.localMediaTracks : undefined,
      moderationSuppressed: moderation.moderationSuppressed,
      muted: moderation.muted || voicePreferences.muted,
      name: actorName,
      ...stage,
      stream: sfu.mediaRoomId === room.id ? sfu.localStream : undefined
    });
  }
  for (const token of voiceTokens.filter((item) => item.scope === room.id)) {
    const id = token.ownerId === actorId ? actorId : token.clientId || token.ownerId || token.id;
    const memberId = token.ownerId || (id === actorId ? actorId : undefined);
    if (blockedByRoom(room, memberId || id)) continue;
    const current = participants.get(id);
    const voiceStatus = tokenVoiceStatus(token);
    const moderation = projectedModeration(room, memberId);
    const stage = projectedStage(room, memberId);
    participants.set(id, {
      avatar: current?.avatar || tokenAvatar(token) || initialFor(token.ownerName || id),
      deafened: moderation.deafened || voiceStatus.deafened || current?.deafened,
      id,
      isLocal: current?.isLocal,
      memberId: current?.memberId || memberId,
      media: tokenMedia(token) || current?.media,
      mediaTracks: tokenMediaTracks(token) || current?.mediaTracks,
      moderationSuppressed: moderation.moderationSuppressed || current?.moderationSuppressed,
      muted: moderation.muted || voiceStatus.muted || current?.muted,
      name: token.ownerName || current?.name || id,
      ...stage,
      screenPreview: tokenScreenPreview(token) || current?.screenPreview,
      stream: current?.stream
    });
  }
  for (const remote of sfu.mediaRoomId === room.id ? sfu.remoteStreams : []) {
    const id = localClientIds.has(remote.clientId) ? actorId : remote.clientId;
    const current = participants.get(id);
    const memberId = current?.memberId || (id === actorId ? actorId : undefined);
    if (blockedByRoom(room, memberId || id)) continue;
    const moderation = projectedModeration(room, memberId);
    const stage = projectedStage(room, memberId);
    participants.set(id, {
      avatar: remote.avatar || initialFor(remote.name),
      connecting: false,
      connectionError: undefined,
      connectionPhase: "streaming",
      deafened: moderation.deafened || current?.deafened,
      id,
      memberId: current?.memberId,
      media: remote.media || current?.media,
      mediaTracks: current?.mediaTracks || remote.mediaTracks,
      moderationSuppressed: moderation.moderationSuppressed || current?.moderationSuppressed,
      muted: moderation.muted || current?.muted,
      name: remote.name,
      ...stage,
      screenPreview: current?.screenPreview,
      screenStream: current?.screenStream,
      stream: remote.stream
    });
  }
  for (const peer of sfu.mediaRoomId === room.id ? sfu.peers || [] : []) {
    if (peer.clientId === actorId || localClientIds.has(peer.clientId)) continue;
    const current = participants.get(peer.clientId);
    const memberId = current?.memberId;
    if (blockedByRoom(room, memberId || peer.clientId)) continue;
    const moderation = projectedModeration(room, memberId);
    const stage = projectedStage(room, memberId);
    const isStreaming = peer.phase === "streaming" && Boolean(current?.stream);
    participants.set(peer.clientId, {
      avatar: current?.avatar || peer.avatar || initialFor(peer.name || peer.clientId),
      connecting: !isStreaming && peer.phase !== "failed",
      connectionError: peer.error,
      connectionPhase: peer.phase,
      deafened: moderation.deafened || current?.deafened,
      id: peer.clientId,
      isLocal: current?.isLocal,
      memberId: current?.memberId,
      media: current?.media,
      mediaTracks: current?.mediaTracks,
      moderationSuppressed: moderation.moderationSuppressed || current?.moderationSuppressed,
      muted: moderation.muted || current?.muted,
      name: current?.name || peer.name || peer.clientId,
      ...stage,
      screenPreview: current?.screenPreview,
      screenStream: current?.screenStream,
      stream: current?.stream
    });
  }
  for (const remote of sfu.mediaRoomId === room.id ? sfu.remoteScreenStreams || [] : []) {
    const id = localClientIds.has(remote.clientId) ? actorId : remote.clientId;
    const current = participants.get(id);
    const memberId = current?.memberId || (id === actorId ? actorId : undefined);
    if (blockedByRoom(room, memberId || id)) continue;
    const moderation = projectedModeration(room, memberId);
    const stage = projectedStage(room, memberId);
    participants.set(id, {
      avatar: current?.avatar || remote.avatar || initialFor(remote.name),
      deafened: moderation.deafened || current?.deafened,
      id,
      isLocal: current?.isLocal,
      memberId: current?.memberId,
      media: current?.media || remote.media,
      mediaTracks: current?.mediaTracks,
      moderationSuppressed: moderation.moderationSuppressed || current?.moderationSuppressed,
      name: current?.name || remote.name,
      ...stage,
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
  return Boolean(participant.muted || participant.moderationSuppressed || mutedVoiceParticipantIds[participant.id] || (participant.memberId && mutedVoiceParticipantIds[participant.memberId]));
}

export function participantGridClass(count: number) {
  if (count >= 9) return "participant-count-many";
  return `participant-count-${Math.max(1, count)}`;
}
