import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DirectCallOrchestrator } from "matterhorn-sdk/browser/directCalls";
import type { DirectCallDockOptions } from "matterhorn-sdk/browser/directCallDock";
import { MeshRoomCallController } from "matterhorn-sdk/browser/meshRoomCalls";
import type { MatterhornMediaDeviceController } from "matterhorn-sdk/browser/mediaDevices";
import type { CallMediaSettings, CallMode, DirectCallState, PeerJsMediaConnection, RoomParticipant } from "matterhorn-sdk/browser/types";
import { mediaBridgeFromHost } from "@entities/chat/api/callBridge";
import { avatarForActor } from "@entities/chat/model/chatViewModel";
import type { Actor, AvatarSource, ChatState, MemberModeration, RoomMember } from "@entities/chat/model/types";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh } from "../../../../types";

type Input = {
  actor: Actor;
  live: MatterhornRoom<Mosh>;
  mediaDeviceController?: MatterhornMediaDeviceController;
  incomingActions?: DirectCallDockOptions["incomingActions"];
  onBeforeAccept?: (call: DirectCallState) => boolean | void | Promise<boolean | void>;
  roomName: string;
  state: ChatState;
};

type MemberCallRoute = MemberModeration & {
  callClientId?: string;
  callPubkey?: string;
  memberId?: string;
  peerAddress?: string;
  peerId?: string;
};

function actorName(actor: Actor) {
  return actor.displayName || actor.memberId || "Member";
}

function actorAvatar(actor: Actor) {
  return avatarForActor(actor) || actorName(actor).slice(0, 1).toUpperCase();
}

function callRoutesForState(state: ChatState): Record<string, MemberCallRoute> {
  const routedState = state as ChatState & { callRoutes?: Record<string, MemberCallRoute> };
  return { ...(state.guests || {}), ...(routedState.callRoutes || {}) };
}

function participantForRoute(memberId: string, route: MemberCallRoute | undefined, state: ChatState): RoomParticipant | undefined {
  if (!route?.callClientId || !route.callPubkey) {
    return undefined;
  }
  const member = state.members?.[memberId as keyof typeof state.members] as RoomMember | undefined;
  const presence = state.presence?.[memberId as keyof typeof state.presence];
  const presenceAvatar = presence as (typeof presence & AvatarSource) | undefined;
  const presenceName = (presence as (typeof presence & { name?: string }) | undefined)?.name;
  const name = route.name || member?.displayName || member?.name || presenceName || memberId;
  return {
    id: route.callClientId,
    name,
    avatar: route.avatar || member?.avatar || member?.avatarUrl || member?.profileImageUrl || presenceAvatar?.avatar || presenceAvatar?.avatarUrl || presenceAvatar?.profileImageUrl || name.slice(0, 1).toUpperCase(),
    peerAddress: route.peerAddress,
    peerId: route.peerId,
    callPubkey: route.callPubkey,
    bannedAt: route.bannedAt ? Number(route.bannedAt) : undefined
  };
}

function participantResolverForState(state: ChatState) {
  const routes = callRoutesForState(state);
  return (id: string): RoomParticipant | undefined => {
    const direct = participantForRoute(id, routes[id], state);
    if (direct) return direct;
    for (const [memberId, route] of Object.entries(routes)) {
      if (route?.memberId === id || route?.callClientId === id) {
        const participant = participantForRoute(memberId, route, state);
        if (participant) return participant;
      }
    }
    return undefined;
  };
}

function memberIdForCallClientId(state: ChatState, id: string) {
  const routes = callRoutesForState(state);
  for (const [memberId, route] of Object.entries(routes)) {
    if (route?.memberId === id || route?.callClientId === id) return memberId;
  }
  return id;
}

function activeDirectCallMemberIds(state: ChatState, actorMemberId: string, call: DirectCallState) {
  if (call.status === "idle") return [];
  const ids = [
    actorMemberId,
    call.remoteClientId,
    ...(call.invitedMemberIds || []),
    ...(call.room?.remoteStreams || []).map((stream) => stream.clientId),
    ...(call.room?.peers || []).map((peer) => peer.clientId)
  ].filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids.map((id) => memberIdForCallClientId(state, id))));
}

function removePeerCallListener(peer: unknown, handler: (call: PeerJsMediaConnection) => void) {
  if (!peer || typeof peer !== "object") return;
  const target = peer as { off?: (event: string, listener: (call: PeerJsMediaConnection) => void) => void; removeListener?: (event: string, listener: (call: PeerJsMediaConnection) => void) => void };
  target.off?.("call", handler);
  target.removeListener?.("call", handler);
}

export function useChatDirectCalls(input: Input) {
  const bridge = useMemo(() => mediaBridgeFromHost(input.live.media), [input.live.media]);
  const canPublishCallRoute = input.live.can("updateMemberCall");
  const actorMemberId = input.actor.memberId;
  const actorDisplayName = actorName(input.actor);
  const actorProfileAvatar = actorAvatar(input.actor);
  const clientId = bridge?.clientId || actorMemberId;
  const [state, setState] = useState<DirectCallState>({ status: "idle" });
  const [error, setError] = useState("");
  const directRef = useRef<DirectCallOrchestrator | undefined>(undefined);
  const incomingActionsRef = useRef(input.incomingActions);
  const onBeforeAcceptRef = useRef(input.onBeforeAccept);
  const publishedKeyRef = useRef("");
  const getParticipantRef = useRef(participantResolverForState(input.state));

  useEffect(() => {
    onBeforeAcceptRef.current = input.onBeforeAccept;
  }, [input.onBeforeAccept]);

  useEffect(() => {
    incomingActionsRef.current = input.incomingActions;
  }, [input.incomingActions]);

  useEffect(() => {
    getParticipantRef.current = participantResolverForState(input.state);
  }, [input.state]);

  useEffect(() => {
    if (!bridge) {
      return undefined;
    }
    const profile = { id: clientId, name: actorDisplayName, avatar: actorProfileAvatar };
    const direct = new DirectCallOrchestrator({
      roomName: input.roomName,
      profile,
      getPeer: () => bridge.getMediaPeer?.(),
      getPeerAddress: () => bridge.getMediaPeerAddress?.(),
      sendSignal: (targetClientId, targetPeerId, signal, auth) => {
        return bridge.sendPeerSignal?.(targetClientId, targetPeerId, signal, auth) ?? false;
      },
      subscribeRelayMessage: bridge.subscribeRelayMessage,
      getParticipant: (id) => getParticipantRef.current(id),
      renderDefaultCallDock: {
        theme: "dark",
        shouldRender: (call) => call.status === "incoming",
        incomingActions: (call) => incomingActionsRef.current?.(call),
        onBeforeAccept: (call) => onBeforeAcceptRef.current?.(call)
      },
      createMeshController: ({ onState, onError }) => new MeshRoomCallController({
        roomName: input.roomName,
        profile,
        getPeer: () => bridge.getMediaPeer?.(),
        getPeerAddress: () => bridge.getMediaPeerAddress?.(),
        createPeer: bridge.createMediaPeer,
        mediaDeviceController: input.mediaDeviceController,
        sendSignal: (targetClientId, targetPeerId, signal, auth) => {
          return bridge.sendPeerSignal?.(targetClientId, targetPeerId, signal, auth) ?? false;
        },
        onState,
        onError: (message, code) => {
          onError(message, code);
        }
      }),
      onCallState: (nextState) => {
        setState(nextState);
      },
      onError: (message, code) => {
        setError(message);
      }
    });
    directRef.current = direct;
    const onCall = (call: PeerJsMediaConnection) => {
      direct.handleMediaCall(call);
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
    return () => {
      removeMediaPeerListener?.();
      removePeerCallListener(peer, onCall);
      direct.destroy();
      directRef.current = undefined;
      setState({ status: "idle" });
    };
  }, [actorDisplayName, actorProfileAvatar, bridge, clientId, input.roomName]);

  const publishLocalCallRoute = useCallback(() => {
    const direct = directRef.current;
    if (!bridge || !canPublishCallRoute || !direct) return;
    const peerId = bridge.getMediaPeer?.()?.id;
    if (!peerId) {
      return;
    }
    const peerAddress = bridge.getMediaPeerAddress?.() || "";
    const callPubkey = direct.callPubkey();
    const nextKey = `${clientId}:${peerId}:${peerAddress}:${callPubkey}`;
    const current = callRoutesForState(input.state)[actorMemberId];
    if (
      current?.callClientId === clientId
      && current?.peerId === peerId
      && current?.peerAddress === peerAddress
      && current?.callPubkey === callPubkey
    ) {
      return;
    }
    if (publishedKeyRef.current === nextKey) {
      return;
    }
    publishedKeyRef.current = nextKey;
    void input.live.actions.updateMemberCall({
      clientId,
      peerId,
      peerAddress,
      callPubkey,
      name: actorDisplayName,
      avatar: actorProfileAvatar
    }).catch((publishError: unknown) => {
      publishedKeyRef.current = "";
      setError(publishError instanceof Error ? publishError.message : "Could not publish call route.");
    });
  }, [actorDisplayName, actorMemberId, actorProfileAvatar, bridge, canPublishCallRoute, clientId, input.live.actions, input.state]);

  useEffect(() => {
    if (!bridge) return undefined;
    publishLocalCallRoute();
    const timer = window.setInterval(publishLocalCallRoute, 1000);
    return () => window.clearInterval(timer);
  }, [bridge, publishLocalCallRoute]);

  const callMember = useCallback((memberId: string, mode: CallMode = "voice") => {
    setError("");
    publishLocalCallRoute();
    const directRoomId = directRef.current?.startDirectCall(memberId, mode);
    return Boolean(directRoomId);
  }, [publishLocalCallRoute]);

  const acceptCall = useCallback(() => {
    if (state.status !== "incoming" || !state.directRoomId) return;
    setError("");
    directRef.current?.acceptInvite(state.directRoomId, { audio: true, video: false });
  }, [state]);

  const declineCall = useCallback(() => {
    if (state.status !== "incoming" || !state.directRoomId) return;
    directRef.current?.declineInvite(state.directRoomId);
  }, [state]);

  const endCall = useCallback(() => {
    directRef.current?.endDirectCall();
  }, [state]);

  const updateMedia = useCallback((media: CallMediaSettings) => {
    directRef.current?.updateMedia(media);
  }, [state]);

  const watchScreenShare = useCallback((clientId: string) => {
    directRef.current?.watchScreen(clientId);
  }, []);

  const stopWatchingScreenShare = useCallback((clientId: string) => {
    directRef.current?.stopWatchingScreen(clientId);
  }, []);

  return {
    acceptCall,
    canCallMember: (memberId: string) => Boolean(getParticipantRef.current(memberId)),
    callMember,
    clientId,
    declineCall,
    endCall,
    error,
    memberIds: activeDirectCallMemberIds(input.state, actorMemberId, state),
    stopWatchingScreenShare,
    state,
    updateMedia,
    watchScreenShare
  };
}

export type ChatDirectCalls = ReturnType<typeof useChatDirectCalls>;
