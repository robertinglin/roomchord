import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MeshRoomCallController, type MeshRoomParticipant } from "matterhorn-sdk/browser/meshRoomCalls";
import { SfuCallController } from "matterhorn-sdk/browser/sfuCalls";
import { mediaStreamForTrackRole, mediaTrackRole, normalizeCallMediaSettings, publicCallMediaSettings, startScreenPreviewSnapshots } from "matterhorn-sdk/browser/mediaCapture";
import type { CallMediaSettings, PeerJsMediaConnection, SfuCallState, ScreenPreviewSnapshot } from "matterhorn-sdk/browser/types";
import type { MatterhornEphemeralToken, MatterhornEphemeralTokenHandle } from "matterhorn-sdk/browser/liveRoomConnector";
import { mediaBridgeFromHost } from "@entities/chat/api/callBridge";
import { logMatterhornCall } from "@entities/chat/model/callLogger";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { Actor, MediaRoom } from "@entities/chat/model/types";
import type { MatterhornMedia } from "matterhorn-sdk/client";

type LiveInput = {
  actor: Actor;
  media: MatterhornMedia;
};

type Input = {
  live: LiveInput;
  roomName: string;
  voicePreferences: VoicePreferences;
};

function removePeerCallListener(peer: unknown, handler: (call: PeerJsMediaConnection) => void) {
  if (!peer || typeof peer !== "object") return;
  const target = peer as { off?: (event: string, listener: (call: PeerJsMediaConnection) => void) => void; removeListener?: (event: string, listener: (call: PeerJsMediaConnection) => void) => void };
  target.off?.("call", handler);
  target.removeListener?.("call", handler);
}

function actorAvatar(actor: Actor) {
  return actor.profileImageUrl || actor.avatarUrl || actor.avatar || (actor.displayName || actor.memberId).slice(0, 1).toUpperCase() || "M";
}

export function useChatMediaRooms(input: Input) {
  const bridge = useMemo(() => mediaBridgeFromHost(input.live.media), [input.live.media]);
  const clientId = bridge?.clientId || input.live.actor.memberId;
  const [sfuState, setSfuState] = useState<SfuCallState>({ status: "unavailable", remoteStreams: [] });
  const [meshState, setMeshState] = useState<SfuCallState>({ status: "idle", remoteStreams: [] });
  const [voiceTokens, setVoiceTokens] = useState<MatterhornEphemeralToken[]>(() => bridge?.getEphemeralTokens?.().filter((token) => token.kind === "media-room.join") || []);
  const [error, setError] = useState("");
  const sfuRef = useRef<SfuCallController | undefined>(undefined);
  const meshRef = useRef<MeshRoomCallController | undefined>(undefined);
  const voiceTokenRef = useRef<MatterhornEphemeralTokenHandle | undefined>(undefined);
  const activeRoomRef = useRef<MediaRoom | undefined>(undefined);
  const screenPreviewRef = useRef<ScreenPreviewSnapshot | undefined>(undefined);

  function relayHasSfu() {
    const info = bridge?.getRelaySfuInfo?.();
    return Boolean(info?.enabled && info.peerId);
  }

  function activeRoomState() {
    if (sfuState.mediaRoomId === activeRoomRef.current?.id) return sfuState;
    if (meshState.mediaRoomId === activeRoomRef.current?.id) return meshState;
    return null;
  }

  function localCameraTrack(state: SfuCallState) {
    if (!state.localStream) return undefined;
    const tracks = state.localStream.getVideoTracks();
    if (!tracks.length) return undefined;
    const mediaTracks = state.localMediaTracks;
    if (mediaTracks) {
      const cameraTrack = tracks.find((track, index) => mediaTrackRole(track, index, mediaTracks) === "camera");
      if (cameraTrack) return cameraTrack;
    }
    return tracks.find((track) => !track.label.toLowerCase().includes("screen")) || tracks[0];
  }

  function isFacingModeSwappable(state: SfuCallState) {
    const track = localCameraTrack(state);
    const capabilities = track?.getCapabilities?.();
    const facingMode = capabilities?.facingMode;
    if (!Array.isArray(facingMode) || !facingMode.length) return false;
    return facingMode.includes("user") && facingMode.includes("environment");
  }

  function nextFacingMode(track: MediaStreamTrack, facingMode?: string) {
    const capabilities = track.getCapabilities?.();
    const modes = capabilities?.facingMode;
    if (!Array.isArray(modes)) return undefined;
    const normalized = modes.map((mode) => String(mode).toLowerCase());
    if (normalized.includes("user") && normalized.includes("environment")) {
      return normalized.includes(facingMode === "environment" ? "user" : "environment") ? (facingMode === "environment" ? "user" : "environment") : undefined;
    }
    return normalized.find((mode) => mode !== facingMode);
  }

  function activeCallState() {
    if (sfuState.mediaRoomId) return sfuState;
    if (meshState.mediaRoomId) return meshState;
    return sfuState.status !== "unavailable" ? sfuState : meshState;
  }

  function meshParticipantFromToken(token: MatterhornEphemeralToken): MeshRoomParticipant | undefined {
    const payload = token.payload || {};
    if (typeof payload.roomId !== "string" || payload.roomId !== activeCallState().mediaRoomId) return undefined;
    if (typeof payload.clientId !== "string" || typeof payload.callPubkey !== "string") return undefined;
    return {
      clientId: payload.clientId,
      roomId: payload.roomId,
      name: typeof payload.name === "string" ? payload.name : token.ownerName,
      avatar: typeof payload.avatar === "string" ? payload.avatar : token.ownerName.slice(0, 1).toUpperCase(),
      peerId: typeof payload.peerId === "string" ? payload.peerId : undefined,
      peerAddress: typeof payload.peerAddress === "string" ? payload.peerAddress : undefined,
      callPubkey: payload.callPubkey,
      media: payload.media && typeof payload.media === "object" ? payload.media as CallMediaSettings : undefined,
      mediaTracks: Array.isArray(payload.mediaTracks) ? payload.mediaTracks as MeshRoomParticipant["mediaTracks"] : undefined
    };
  }

  useEffect(() => {
    if (!bridge) {
      logMatterhornCall("media.bridge.unavailable", { roomName: input.roomName, actorId: input.live.actor.memberId });
      return undefined;
    }
    logMatterhornCall("media.bridge.ready", {
      roomName: input.roomName,
      actorId: input.live.actor.memberId,
      clientId,
      hasPeer: Boolean(bridge.getMediaPeer?.()?.id),
      peerId: bridge.getMediaPeer?.()?.id,
      peerAddress: bridge.getMediaPeerAddress?.(),
      sfu: bridge.getRelaySfuInfo?.()
    });
    const profile = { id: clientId, name: input.live.actor.displayName || input.live.actor.memberId, avatar: actorAvatar(input.live.actor) };
    const sfu = new SfuCallController({
      roomName: input.roomName,
      profile,
      getPeer: () => bridge.getMediaPeer?.(),
      getPeerAddress: () => bridge.getMediaPeerAddress?.(),
      createPeer: bridge.createMediaPeer,
      encryptRoomPayload: bridge.encryptRoomPayload,
      decryptRoomPayload: bridge.decryptRoomPayload,
      sendSignal: (targetClientId, targetPeerId, signal, auth) => {
        logMatterhornCall("media.sfu.signal.send", { roomName: input.roomName, clientId, targetClientId, targetPeerId, signalType: signal.type, sessionId: signal.sessionId, hasAuth: Boolean(auth) });
        return bridge.sendPeerSignal?.(targetClientId, targetPeerId, signal, auth) ?? false;
      },
      onState: setSfuState,
      onError: (message, code) => {
        logMatterhornCall("media.sfu.error", { roomName: input.roomName, clientId, message, code });
        setError(message);
      }
    });
    const mesh = new MeshRoomCallController({
      roomName: input.roomName,
      profile,
      getPeer: () => bridge.getMediaPeer?.(),
      getPeerAddress: () => bridge.getMediaPeerAddress?.(),
      createPeer: bridge.createMediaPeer,
      sendSignal: (targetClientId, targetPeerId, signal, auth) => {
        logMatterhornCall("media.mesh.signal.send", { roomName: input.roomName, clientId, targetClientId, targetPeerId, signalType: signal.type, sessionId: signal.sessionId, hasAuth: Boolean(auth) });
        return bridge.sendPeerSignal?.(targetClientId, targetPeerId, signal, auth) ?? false;
      },
      onState: setMeshState,
      onError: (message, code) => {
        logMatterhornCall("media.mesh.error", { roomName: input.roomName, clientId, message, code });
        setError(message);
      }
    });
    sfuRef.current = sfu;
    meshRef.current = mesh;
    sfu.setRelaySfu(bridge.getRelaySfuInfo?.());

    const onCall = (call: PeerJsMediaConnection) => {
      logMatterhornCall("media.peer-call.received", { roomName: input.roomName, clientId, peer: call.peer, metadata: call.metadata });
      if (mesh.handleMediaCall(call)) {
        logMatterhornCall("media.peer-call.handled.mesh", { roomName: input.roomName, clientId, peer: call.peer });
        return;
      }
      const handledBySfu = sfu.handleMediaCall(call);
      logMatterhornCall("media.peer-call.handled.sfu", { roomName: input.roomName, clientId, peer: call.peer, handled: handledBySfu });
    };
    const peer = bridge.getMediaPeer?.();
    peer?.on("call", onCall);
    const unsubscribe = bridge.subscribeRelayMessage?.((message) => {
      const signal = typeof message === "object" && message ? (message as { signal?: { type?: string; sessionId?: string }; type?: string; sourceClientId?: string; targetClientId?: string }).signal : undefined;
      logMatterhornCall("media.relay-message", {
        roomName: input.roomName,
        clientId,
        type: typeof message === "object" && message ? (message as { type?: string }).type : typeof message,
        sourceClientId: typeof message === "object" && message ? (message as { sourceClientId?: string }).sourceClientId : undefined,
        targetClientId: typeof message === "object" && message ? (message as { targetClientId?: string }).targetClientId : undefined,
        signalType: signal?.type,
        sessionId: signal?.sessionId
      });
      const handledByMesh = mesh.handlePeerSignal(message);
      const handledBySfu = sfu.handleRelayMessage(message);
      logMatterhornCall("media.relay-message.handled", { roomName: input.roomName, clientId, handledByMesh, handledBySfu });
    });

    return () => {
      unsubscribe?.();
      removePeerCallListener(peer, onCall);
      voiceTokenRef.current?.release();
      voiceTokenRef.current = undefined;
      mesh.destroy();
      sfu.destroy();
      meshRef.current = undefined;
      sfuRef.current = undefined;
      setMeshState({ status: "idle", remoteStreams: [] });
      setSfuState({ status: "unavailable", remoteStreams: [] });
    };
  }, [bridge, clientId, input.live.actor, input.roomName]);

  useEffect(() => {
    const nextTokens = () => bridge?.getEphemeralTokens?.().filter((token) => token.kind === "media-room.join") || [];
    setVoiceTokens(nextTokens());
    return bridge?.subscribeEphemeralTokens?.((tokens) => {
      setVoiceTokens(tokens.filter((token) => token.kind === "media-room.join"));
    });
  }, [bridge, meshState.mediaRoomId, meshState.status, sfuState.mediaRoomId, sfuState.status]);

  useEffect(() => {
    meshRef.current?.setParticipants(voiceTokens.map(meshParticipantFromToken).filter((participant): participant is MeshRoomParticipant => Boolean(participant)));
  }, [voiceTokens, meshState.mediaRoomId, sfuState.mediaRoomId]);

  function claimVoiceToken(room: MediaRoom, media: CallMediaSettings) {
    const announcedMedia = publicCallMediaSettings(media);
    const meshParticipant = meshRef.current?.localParticipant(room.id, announcedMedia);
    const activeState = activeCallState();
    const payload = {
      roomId: room.id,
      media: announcedMedia,
      voiceStatus: {
        deafened: input.voicePreferences.deafened,
        muted: input.voicePreferences.muted
      },
      mediaTracks: activeState.mediaRoomId === room.id ? activeState.localMediaTracks : undefined,
      screenPreview: media.screen ? screenPreviewRef.current : undefined,
      transport: relayHasSfu() ? "sfu" : "mesh",
      ...(meshParticipant ? {
        clientId: meshParticipant.clientId,
        peerId: meshParticipant.peerId,
        peerAddress: meshParticipant.peerAddress,
        callPubkey: meshParticipant.callPubkey,
        name: meshParticipant.name,
        avatar: meshParticipant.avatar
      } : {})
    };
    logMatterhornCall("media.voice-token.claim", {
      roomName: input.roomName,
      clientId,
      roomId: room.id,
      media: announcedMedia,
      transport: payload.transport,
      peerId: meshParticipant?.peerId,
      peerAddress: meshParticipant?.peerAddress,
      hasCallPubkey: Boolean(meshParticipant?.callPubkey)
    });
    if (voiceTokenRef.current?.token()?.scope === room.id) {
      voiceTokenRef.current.update(payload);
      return;
    }
    voiceTokenRef.current?.release();
    voiceTokenRef.current = bridge?.claimEphemeralToken?.({
      kind: "media-room.join",
      scope: room.id,
      payload
    });
  }

  function releaseVoiceToken() {
    logMatterhornCall("media.voice-token.release", { roomName: input.roomName, clientId, scope: voiceTokenRef.current?.token()?.scope });
    voiceTokenRef.current?.release();
    voiceTokenRef.current = undefined;
  }

  useEffect(() => {
    const room = activeRoomRef.current;
    const state = activeCallState();
    if (!room || state.mediaRoomId !== room.id || state.status !== "connected" || !state.media) return;
    claimVoiceToken(room, state.media);
  }, [input.voicePreferences.deafened, input.voicePreferences.muted, meshState.status, meshState.media, meshState.mediaRoomId, sfuState.status, sfuState.media, sfuState.mediaRoomId]);

  useEffect(() => {
    const state = activeCallState();
    const room = activeRoomRef.current;
    if (state.status !== "connected" || !state.media?.screen || !state.localStream || !room || state.mediaRoomId !== room.id) {
      const hadPreview = Boolean(screenPreviewRef.current);
      screenPreviewRef.current = undefined;
      if (hadPreview && room && state.mediaRoomId === room.id && state.media) claimVoiceToken(room, state.media);
      return undefined;
    }
    const screenStream = mediaStreamForTrackRole(state.localStream, "screen", state.localMediaTracks);
    if (!screenStream) return undefined;
    return startScreenPreviewSnapshots(screenStream, (snapshot) => {
      screenPreviewRef.current = snapshot;
      const currentRoom = activeRoomRef.current;
      const currentState = activeCallState();
      if (currentRoom && currentState.mediaRoomId === currentRoom.id && currentState.media) {
        claimVoiceToken(currentRoom, currentState.media);
      }
    }, { intervalMs: 5_000, maxBytes: 24_000, maxWidth: 320, maxHeight: 180, quality: 0.38 });
  }, [meshState.status, meshState.localStream, meshState.localMediaTracks, meshState.media?.screen, meshState.mediaRoomId, sfuState.status, sfuState.localStream, sfuState.localMediaTracks, sfuState.media?.screen, sfuState.mediaRoomId]);

  const joinRoom = useCallback((room: MediaRoom, media: CallMediaSettings = { audio: true, video: false }) => {
    setError("");
    const nextMedia = normalizeCallMediaSettings(media);
    nextMedia.video = Boolean(room.allowsVideo !== false && nextMedia.video);
    const currentState = activeCallState();
    if (currentState.mediaRoomId === room.id && (currentState.status === "connecting" || currentState.status === "connected")) {
      activeRoomRef.current = room;
      return true;
    }
    if (currentState.mediaRoomId && currentState.mediaRoomId !== room.id) releaseVoiceToken();
    activeRoomRef.current = room;
    logMatterhornCall("media.room.join", { roomName: input.roomName, clientId, roomId: room.id, media: nextMedia, currentStatus: currentState.status, currentMediaRoomId: currentState.mediaRoomId, relayHasSfu: relayHasSfu() });
    if (!bridge) {
      logMatterhornCall("media.room.join.blocked.no-bridge", { roomName: input.roomName, clientId, roomId: room.id });
      return false;
    }
    sfuRef.current?.setRelaySfu(bridge.getRelaySfuInfo?.());
    if (relayHasSfu()) {
      meshRef.current?.end();
      sfuRef.current?.start(nextMedia, room.id);
    } else {
      sfuRef.current?.end();
      meshRef.current?.start(nextMedia, room.id);
    }
    return true;
  }, [bridge]);

  const updateRoomMedia = useCallback((room: MediaRoom, media: CallMediaSettings) => {
    setError("");
    const nextMedia = normalizeCallMediaSettings(media);
    nextMedia.video = Boolean(room.allowsVideo !== false && nextMedia.video);
    activeRoomRef.current = room;
    logMatterhornCall("media.room.update", { roomName: input.roomName, clientId, roomId: room.id, media: nextMedia, meshRoomId: meshState.mediaRoomId, sfuRoomId: sfuState.mediaRoomId, relayHasSfu: relayHasSfu() });
    if (!bridge) {
      logMatterhornCall("media.room.update.blocked.no-bridge", { roomName: input.roomName, clientId, roomId: room.id });
      return false;
    }
    if (sfuState.mediaRoomId === room.id) {
      sfuRef.current?.setRelaySfu(bridge.getRelaySfuInfo?.());
      sfuRef.current?.updateMedia(nextMedia);
    } else if (meshState.mediaRoomId === room.id) {
      meshRef.current?.updateMedia(nextMedia);
    } else if (relayHasSfu()) {
      releaseVoiceToken();
      meshRef.current?.end();
      sfuRef.current?.setRelaySfu(bridge.getRelaySfuInfo?.());
      sfuRef.current?.start(nextMedia, room.id);
    } else {
      releaseVoiceToken();
      sfuRef.current?.end();
      meshRef.current?.start(nextMedia, room.id);
    }
    return true;
  }, [bridge, meshState.mediaRoomId, sfuState.mediaRoomId]);

  const toggleCameraFacing = useCallback(async () => {
    const room = activeRoomRef.current;
    const state = activeRoomState();
    const roomId = room?.id;
    if (!roomId || !state || state.mediaRoomId !== roomId || !state.localStream) return false;
    const track = localCameraTrack(state);
    if (!track) return false;
    const settings = track.getSettings?.();
    const nextFacing = nextFacingMode(track, settings?.facingMode);
    if (!nextFacing) return false;
    setError("");
    try {
      await track.applyConstraints({ facingMode: nextFacing });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to switch camera";
      setError(message);
      return false;
    }
  }, [sfuState, meshState]);

  const leaveRoom = useCallback(() => {
    logMatterhornCall("media.room.leave", { roomName: input.roomName, clientId, activeRoomId: activeRoomRef.current?.id, meshRoomId: meshState.mediaRoomId, sfuRoomId: sfuState.mediaRoomId });
    voiceTokenRef.current?.release();
    voiceTokenRef.current = undefined;
    activeRoomRef.current = undefined;
    meshRef.current?.end();
    sfuRef.current?.end();
  }, []);

  const watchScreenShare = useCallback((clientId: string) => {
    if (meshState.mediaRoomId) meshRef.current?.watchScreen(clientId);
  }, [meshState.mediaRoomId]);

  const stopWatchingScreenShare = useCallback((clientId: string) => {
    if (meshState.mediaRoomId) meshRef.current?.stopWatchingScreen(clientId);
  }, [meshState.mediaRoomId]);

  const roomCallState = activeCallState();
  const roomState = activeRoomState();

  return {
    error,
    sfu: roomCallState,
    voiceTokens,
    joinRoom,
    updateRoomMedia,
    leaveRoom,
    watchScreenShare,
    stopWatchingScreenShare,
    toggleCameraFacing,
    canSwapCamera: Boolean(roomState && isFacingModeSwappable(roomState))
  };
}

export type ChatMediaRooms = ReturnType<typeof useChatMediaRooms>;
