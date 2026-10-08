import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MeshRoomCallController, type MeshRoomParticipant } from "matterhorn-sdk/browser/meshRoomCalls";
import { SfuCallController } from "matterhorn-sdk/browser/sfuCalls";
import { mediaStreamForTrackRole, mediaTrackRole, normalizeCallMediaSettings, publicCallMediaSettings, startScreenPreviewSnapshots } from "matterhorn-sdk/browser/mediaCapture";
import type { CallMediaSettings, PeerJsMediaConnection, SfuCallState, ScreenPreviewSnapshot } from "matterhorn-sdk/browser/types";
import type { MatterhornEphemeralToken, MatterhornEphemeralTokenHandle } from "matterhorn-sdk/browser/liveRoomConnector";
import { mediaBridgeFromHost } from "@entities/chat/api/callBridge";
import type { MatterhornMediaDeviceController } from "matterhorn-sdk/browser/mediaDevices";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { Actor, MediaRoom } from "@entities/chat/model/types";
import type { MatterhornMedia } from "matterhorn-sdk/client";

type LiveInput = {
  actor: Actor;
  media: MatterhornMedia;
};

type Input = {
  heldMediaRoomIds?: Record<string, boolean>;
  live: LiveInput;
  mediaDeviceController?: MatterhornMediaDeviceController;
  onVoiceConnected?: (roomId: string, media: CallMediaSettings) => void;
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
  const actorName = input.live.actor.displayName || input.live.actor.memberId;
  const actorProfileAvatar = actorAvatar(input.live.actor);
  const [sfuState, setSfuState] = useState<SfuCallState>({ status: "unavailable", remoteStreams: [] });
  const [meshState, setMeshState] = useState<SfuCallState>({ status: "idle", remoteStreams: [] });
  const [voiceTokens, setVoiceTokens] = useState<MatterhornEphemeralToken[]>(() => bridge?.getEphemeralTokens?.().filter((token) => token.kind === "media-room.join") || []);
  const [error, setError] = useState("");
  const sfuRef = useRef<SfuCallController | undefined>(undefined);
  const meshRef = useRef<MeshRoomCallController | undefined>(undefined);
  const voiceTokenRef = useRef<MatterhornEphemeralTokenHandle | undefined>(undefined);
  const activeRoomRef = useRef<MediaRoom | undefined>(undefined);
  const screenPreviewRef = useRef<ScreenPreviewSnapshot | undefined>(undefined);
  const connectedSessionRef = useRef<string | undefined>(undefined);

  function relayHasSfu() {
    const info = bridge?.getRelaySfuInfo?.();
    return Boolean(info?.enabled && info.peerId);
  }

  function logVoiceError(message: string, code?: string) {
    console.error("[mosh.voice] media connection failed", {
      roomName: input.roomName,
      message,
      code,
      transport: relayHasSfu() ? "sfu" : "p2p"
    });
    setError(message);
  }

  function logVoiceState(transport: "sfu" | "p2p", state: SfuCallState) {
    console.info("[mosh.voice] media state", {
      roomName: input.roomName,
      transport,
      status: state.status,
      mediaRoomId: state.mediaRoomId,
      sessionId: state.sessionId,
      peerCount: state.peers?.length || 0
    });
  }

  function notifyVoiceConnected(state: SfuCallState) {
    if (state.status !== "connected" || !state.mediaRoomId || !state.media || !state.sessionId) return;
    if (connectedSessionRef.current === state.sessionId) return;
    connectedSessionRef.current = state.sessionId;
    input.onVoiceConnected?.(state.mediaRoomId, state.media);
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
      return undefined;
    }
    let disposed = false;
    let disposeControllers = () => {};
    void Promise.resolve(bridge.getCallPublicKey?.()).then((callPubkey) => {
      if (disposed) return;
      const profile = {
        id: clientId,
        name: actorName,
        avatar: actorProfileAvatar,
        ...(callPubkey ? { callPubkey } : {})
      };
      const sfu = new SfuCallController({
        roomId: input.roomName,
        profile,
        skipLegacySignalSigning: true,
        getPeer: () => bridge.getMediaPeer?.(),
        getPeerAddress: () => bridge.getMediaPeerAddress?.(),
        createPeer: bridge.createMediaPeer,
        mediaDeviceController: input.mediaDeviceController,
        sendSignal: (targetClientId, targetPeerId, signal, auth) => {
          return bridge.sendPeerSignal?.(targetClientId, targetPeerId, signal, auth) ?? false;
        },
        onState: (state) => {
          logVoiceState("sfu", state);
          setSfuState(state);
          notifyVoiceConnected(state);
        },
        onError: logVoiceError
      });
      const mesh = new MeshRoomCallController({
        roomId: input.roomName,
        profile,
        skipLegacySignalSigning: true,
        getPeer: () => bridge.getMediaPeer?.(),
        getPeerAddress: () => bridge.getMediaPeerAddress?.(),
        createPeer: bridge.createMediaPeer,
        mediaDeviceController: input.mediaDeviceController,
        sendSignal: (targetClientId, targetPeerId, signal, auth) => {
          return bridge.sendPeerSignal?.(targetClientId, targetPeerId, signal, auth) ?? false;
        },
        onState: (state) => {
          logVoiceState("p2p", state);
          setMeshState(state);
          notifyVoiceConnected(state);
        },
        onError: logVoiceError
      });
      sfuRef.current = sfu;
      meshRef.current = mesh;
      sfu.setRelaySfu(bridge.getRelaySfuInfo?.());

      const onCall = (call: PeerJsMediaConnection) => {
        if (mesh.handleMediaCall(call)) {
          return;
        }
        sfu.handleMediaCall(call);
      };
      let peer = bridge.getMediaPeer?.();
      peer?.on("call", onCall);
      const removeMediaPeerListener = bridge.subscribeMediaPeer?.(() => {
        const nextPeer = bridge.getMediaPeer?.();
        if (!nextPeer || nextPeer === peer) return;
        removePeerCallListener(peer, onCall);
        peer = nextPeer;
        peer.on("call", onCall);
      });
      const unsubscribe = bridge.subscribeRelayMessage?.((message) => {
        mesh.handlePeerSignal(message);
        sfu.handleRelayMessage(message);
      });
      disposeControllers = () => {
        unsubscribe?.();
        removeMediaPeerListener?.();
        removePeerCallListener(peer, onCall);
        voiceTokenRef.current?.release();
        voiceTokenRef.current = undefined;
        mesh.destroy();
        sfu.destroy();
      };
    }).catch((error: unknown) => {
      if (!disposed) logVoiceError(error instanceof Error ? error.message : "Could not load the call identity.");
    });

    return () => {
      disposed = true;
      disposeControllers();
      meshRef.current = undefined;
      sfuRef.current = undefined;
      setMeshState({ status: "idle", remoteStreams: [] });
      setSfuState({ status: "unavailable", remoteStreams: [] });
    };
  }, [actorName, actorProfileAvatar, bridge, clientId, input.roomName]);

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
    const held = Boolean(input.heldMediaRoomIds?.[room.id]);
    const payload = {
      roomId: room.id,
      media: announcedMedia,
      voiceStatus: {
        deafened: input.voicePreferences.deafened || held,
        muted: input.voicePreferences.muted || held
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
    voiceTokenRef.current?.release();
    voiceTokenRef.current = undefined;
  }

  useEffect(() => {
    const room = activeRoomRef.current;
    const state = activeCallState();
    if (!room || state.mediaRoomId !== room.id || state.status !== "connected" || !state.media) return;
    claimVoiceToken(room, state.media);
  }, [input.heldMediaRoomIds, input.voicePreferences.deafened, input.voicePreferences.muted, meshState.status, meshState.media, meshState.mediaRoomId, sfuState.status, sfuState.media, sfuState.mediaRoomId]);

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
    if (!bridge) {
      logVoiceError("Voice media bridge is unavailable.");
      return false;
    }
    console.info("[mosh.voice] starting media connection", {
      roomName: input.roomName,
      roomId: room.id,
      transport: relayHasSfu() ? "sfu" : "p2p",
      peerId: bridge.getMediaPeer?.()?.id,
      peerAddress: bridge.getMediaPeerAddress?.()
    });
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
    if (!bridge) {
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
