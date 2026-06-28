import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DirectCallOrchestrator } from "matterhorn-sdk/browser/directCalls";
import { MeshRoomCallController } from "matterhorn-sdk/browser/meshRoomCalls";
import type { CallMediaSettings, CallMode, DirectCallState, PeerJsMediaConnection, RoomParticipant } from "matterhorn-sdk/browser/types";
import { mediaBridgeFromHost } from "@entities/chat/api/callBridge";
import { logMatterhornCall } from "@entities/chat/model/callLogger";
import { avatarForActor } from "@entities/chat/model/chatViewModel";
import type { Actor, AvatarSource, ChatState, MemberModeration, RoomMember } from "@entities/chat/model/types";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh } from "../../../../types";

type Input = {
  actor: Actor;
  live: MatterhornRoom<Mosh>;
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
    logMatterhornCall("direct.participant.missing-route", {
      memberId,
      hasRoute: Boolean(route),
      callClientId: route?.callClientId,
      hasCallPubkey: Boolean(route?.callPubkey),
      peerId: route?.peerId,
      peerAddress: route?.peerAddress
    });
    return undefined;
  }
  const member = state.members?.[memberId as keyof typeof state.members] as RoomMember | undefined;
  const presence = state.presence?.[memberId as keyof typeof state.presence];
  const presenceAvatar = presence as (typeof presence & AvatarSource) | undefined;
  const name = route.name || member?.displayName || member?.name || presence?.name || memberId;
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

function removePeerCallListener(peer: unknown, handler: (call: PeerJsMediaConnection) => void) {
  if (!peer || typeof peer !== "object") return;
  const target = peer as { off?: (event: string, listener: (call: PeerJsMediaConnection) => void) => void; removeListener?: (event: string, listener: (call: PeerJsMediaConnection) => void) => void };
  target.off?.("call", handler);
  target.removeListener?.("call", handler);
}

export function useChatDirectCalls(input: Input) {
  const bridge = useMemo(() => mediaBridgeFromHost(input.live.media), [input.live.media]);
  const actorMemberId = input.actor.memberId;
  const actorDisplayName = actorName(input.actor);
  const actorProfileAvatar = actorAvatar(input.actor);
  const clientId = bridge?.clientId || actorMemberId;
  const [state, setState] = useState<DirectCallState>({ status: "idle" });
  const [error, setError] = useState("");
  const directRef = useRef<DirectCallOrchestrator | undefined>(undefined);
  const publishedKeyRef = useRef("");
  const getParticipantRef = useRef(participantResolverForState(input.state));

  useEffect(() => {
    getParticipantRef.current = participantResolverForState(input.state);
  }, [input.state]);

  useEffect(() => {
    if (!bridge) {
      logMatterhornCall("direct.bridge.unavailable", { roomName: input.roomName, actorId: actorMemberId });
      return undefined;
    }
    logMatterhornCall("direct.bridge.ready", {
      roomName: input.roomName,
      actorId: actorMemberId,
      clientId,
      hasPeer: Boolean(bridge.getMediaPeer?.()?.id),
      peerId: bridge.getMediaPeer?.()?.id,
      peerAddress: bridge.getMediaPeerAddress?.()
    });
    const profile = { id: clientId, name: actorDisplayName, avatar: actorProfileAvatar };
    const direct = new DirectCallOrchestrator({
      roomName: input.roomName,
      profile,
      getPeer: () => bridge.getMediaPeer?.(),
      getPeerAddress: () => bridge.getMediaPeerAddress?.(),
      sendSignal: (targetClientId, targetPeerId, signal, auth) => {
        logMatterhornCall("direct.signal.send", { roomName: input.roomName, clientId, targetClientId, targetPeerId, signalType: signal.type, sessionId: signal.sessionId, hasAuth: Boolean(auth) });
        return bridge.sendPeerSignal?.(targetClientId, targetPeerId, signal, auth) ?? false;
      },
      subscribeRelayMessage: bridge.subscribeRelayMessage,
      getParticipant: (id) => getParticipantRef.current(id),
      createMeshController: ({ onState, onError }) => new MeshRoomCallController({
        roomName: input.roomName,
        profile,
        getPeer: () => bridge.getMediaPeer?.(),
        getPeerAddress: () => bridge.getMediaPeerAddress?.(),
        createPeer: bridge.createMediaPeer,
        sendSignal: (targetClientId, targetPeerId, signal, auth) => {
          logMatterhornCall("direct.mesh.signal.send", { roomName: input.roomName, clientId, targetClientId, targetPeerId, signalType: signal.type, sessionId: signal.sessionId, hasAuth: Boolean(auth) });
          return bridge.sendPeerSignal?.(targetClientId, targetPeerId, signal, auth) ?? false;
        },
        onState,
        onError: (message, code) => {
          logMatterhornCall("direct.mesh.error", { roomName: input.roomName, clientId, message, code });
          onError(message, code);
        }
      }),
      onCallState: (nextState) => {
        logMatterhornCall("direct.state", {
          roomName: input.roomName,
          clientId,
          status: nextState.status,
          directRoomId: nextState.directRoomId,
          sessionId: nextState.sessionId,
          remoteClientId: nextState.remoteClientId,
          invitedMemberIds: nextState.invitedMemberIds,
          roomStatus: nextState.room?.status,
          roomPeers: nextState.room?.peers,
          remoteStreams: nextState.room?.remoteStreams.length
        });
        setState(nextState);
      },
      onError: (message, code) => {
        logMatterhornCall("direct.error", { roomName: input.roomName, clientId, message, code });
        setError(message);
      }
    });
    directRef.current = direct;
    const onCall = (call: PeerJsMediaConnection) => {
      logMatterhornCall("direct.peer-call.received", { roomName: input.roomName, clientId, peer: call.peer, metadata: call.metadata });
      const handled = direct.handleMediaCall(call);
      logMatterhornCall("direct.peer-call.handled", { roomName: input.roomName, clientId, peer: call.peer, handled });
    };
    const peer = bridge.getMediaPeer?.();
    peer?.on("call", onCall);
    return () => {
      removePeerCallListener(peer, onCall);
      direct.destroy();
      directRef.current = undefined;
      setState({ status: "idle" });
    };
  }, [actorDisplayName, actorProfileAvatar, bridge, clientId, input.roomName]);

  const publishLocalCallRoute = useCallback(() => {
    const direct = directRef.current;
    if (!bridge || !direct) return;
    const peerId = bridge.getMediaPeer?.()?.id;
    if (!peerId) {
      logMatterhornCall("direct.route.publish.blocked.no-peer", { roomName: input.roomName, actorMemberId, clientId });
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
      logMatterhornCall("direct.route.publish.skip.current", { roomName: input.roomName, actorMemberId, clientId, peerId, peerAddress });
      return;
    }
    if (publishedKeyRef.current === nextKey) {
      logMatterhornCall("direct.route.publish.skip.pending", { roomName: input.roomName, actorMemberId, clientId, peerId, peerAddress });
      return;
    }
    publishedKeyRef.current = nextKey;
    logMatterhornCall("direct.route.publish", { roomName: input.roomName, actorMemberId, clientId, peerId, peerAddress, hasCallPubkey: Boolean(callPubkey) });
    void input.live.actions.updateMemberCall({
      clientId,
      peerId,
      peerAddress,
      callPubkey,
      name: actorDisplayName,
      avatar: actorProfileAvatar
    }).catch((publishError: unknown) => {
      publishedKeyRef.current = "";
      logMatterhornCall("direct.route.publish.failed", { roomName: input.roomName, actorMemberId, clientId, message: publishError instanceof Error ? publishError.message : String(publishError) });
      setError(publishError instanceof Error ? publishError.message : "Could not publish call route.");
    });
  }, [actorDisplayName, actorMemberId, actorProfileAvatar, bridge, clientId, input.live.actions, input.state]);

  useEffect(() => {
    if (!bridge) return undefined;
    publishLocalCallRoute();
    const timer = window.setInterval(publishLocalCallRoute, 1000);
    return () => window.clearInterval(timer);
  }, [bridge, publishLocalCallRoute]);

  const callMember = useCallback((memberId: string, mode: CallMode = "voice") => {
    setError("");
    publishLocalCallRoute();
    const route = getParticipantRef.current(memberId);
    logMatterhornCall("direct.call-member", { roomName: input.roomName, clientId, memberId, mode, hasRoute: Boolean(route), route });
    const directRoomId = directRef.current?.startDirectCall(memberId, mode);
    logMatterhornCall("direct.call-member.started", { roomName: input.roomName, clientId, memberId, mode, directRoomId });
    return Boolean(directRoomId);
  }, [publishLocalCallRoute]);

  const acceptCall = useCallback(() => {
    if (state.status !== "incoming" || !state.directRoomId) return;
    setError("");
    logMatterhornCall("direct.accept-click", { roomName: input.roomName, clientId, directRoomId: state.directRoomId, sessionId: state.sessionId, remoteClientId: state.remoteClientId });
    directRef.current?.acceptInvite(state.directRoomId, { audio: true, video: false });
  }, [state]);

  const declineCall = useCallback(() => {
    if (state.status !== "incoming" || !state.directRoomId) return;
    logMatterhornCall("direct.decline-click", { roomName: input.roomName, clientId, directRoomId: state.directRoomId, sessionId: state.sessionId, remoteClientId: state.remoteClientId });
    directRef.current?.declineInvite(state.directRoomId);
  }, [state]);

  const endCall = useCallback(() => {
    logMatterhornCall("direct.end-click", { roomName: input.roomName, clientId, status: state.status, directRoomId: state.directRoomId, sessionId: state.sessionId, remoteClientId: state.remoteClientId });
    directRef.current?.endDirectCall();
  }, [state]);

  const updateMedia = useCallback((media: CallMediaSettings) => {
    logMatterhornCall("direct.update-media", { roomName: input.roomName, clientId, status: state.status, directRoomId: state.directRoomId, sessionId: state.sessionId, media });
    directRef.current?.updateMedia(media);
  }, [state]);

  return {
    acceptCall,
    canCallMember: (memberId: string) => Boolean(getParticipantRef.current(memberId)),
    callMember,
    declineCall,
    endCall,
    error,
    state,
    updateMedia
  };
}

export type ChatDirectCalls = ReturnType<typeof useChatDirectCalls>;
