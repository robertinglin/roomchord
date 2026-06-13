import type { CallSignal, CallSignalAuth, PeerJsPeer, RelaySfuInfo } from "matterhorn-sdk/browser/types";
import type { PeerJsSignalingConfig } from "matterhorn-sdk/browser/relayAddress";
import type { MatterhornEphemeralToken, MatterhornEphemeralTokenHandle } from "matterhorn-sdk/browser/liveRoomConnector";
import { EncryptedRoomPayload } from "matterhorn-sdk/browser/crypto";

export type ChatMediaBridge = {
  available?: boolean;
  clientId?: string;
  getMediaPeer?: () => PeerJsPeer | undefined;
  getMediaPeerAddress?: () => string | undefined;
  getRelaySfuInfo?: () => RelaySfuInfo | undefined;
  createMediaPeer?: (signaling: PeerJsSignalingConfig) => Promise<PeerJsPeer>;
  encryptRoomPayload?: <T>(kind: string, value: T) => Promise<EncryptedRoomPayload>;
  decryptRoomPayload?: <T>(kind: string, payload: EncryptedRoomPayload) => Promise<T>;
  sendPeerSignal?: (targetClientId: string, targetPeerId: string | undefined, signal: CallSignal, auth: CallSignalAuth) => boolean | Promise<boolean>;
  claimEphemeralToken?: (claim: { id?: string; kind: string; scope: string; payload?: Record<string, unknown>; ttlMs?: number }) => MatterhornEphemeralTokenHandle;
  getEphemeralTokens?: () => MatterhornEphemeralToken[];
  subscribeEphemeralTokens?: (listener: (tokens: MatterhornEphemeralToken[]) => void) => () => void;
  subscribeRelayMessage?: (listener: (message: unknown) => void) => () => void;
};

export function mediaBridgeFromHost(host: unknown): ChatMediaBridge | undefined {
  const bridge = host as ChatMediaBridge | undefined;
  if (bridge?.available === false) return undefined;
  if (!bridge?.getMediaPeer || !bridge.sendPeerSignal || !bridge.subscribeRelayMessage) return undefined;
  return bridge;
}
