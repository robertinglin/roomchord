import type { CallSignal, CallSignalAuth, PeerJsPeer, RelaySfuInfo } from "roomkit-sdk/browser/types";
import type { PeerJsSignalingConfig } from "roomkit-sdk/browser/relayAddress";
import type { RoomKitEphemeralToken, RoomKitEphemeralTokenHandle } from "../../../shared/frontend/liveHost";
import { EncryptedRoomPayload } from "roomkit-sdk/browser/crypto";

export type ChatMediaBridge = {
  clientId?: string;
  getMediaPeer?: () => PeerJsPeer | undefined;
  getMediaPeerAddress?: () => string | undefined;
  getRelaySfuInfo?: () => RelaySfuInfo | undefined;
  createMediaPeer?: (signaling: PeerJsSignalingConfig) => Promise<PeerJsPeer>;
  encryptRoomPayload?: <T>(kind: string, value: T) => Promise<EncryptedRoomPayload>;
  decryptRoomPayload?: <T>(kind: string, payload: EncryptedRoomPayload) => Promise<T>;
  sendPeerSignal?: (targetClientId: string, targetPeerId: string | undefined, signal: CallSignal, auth: CallSignalAuth) => boolean | Promise<boolean>;
  claimEphemeralToken?: (claim: { id?: string; kind: string; scope: string; payload?: Record<string, unknown>; ttlMs?: number }) => RoomKitEphemeralTokenHandle;
  getEphemeralTokens?: () => RoomKitEphemeralToken[];
  subscribeEphemeralTokens?: (listener: (tokens: RoomKitEphemeralToken[]) => void) => () => void;
  subscribeRelayMessage?: (listener: (message: unknown) => void) => () => void;
};

export function mediaBridgeFromHost(host: unknown): ChatMediaBridge | undefined {
  const bridge = host as ChatMediaBridge | undefined;
  if (!bridge?.getMediaPeer || !bridge.sendPeerSignal || !bridge.subscribeRelayMessage) return undefined;
  return bridge;
}
