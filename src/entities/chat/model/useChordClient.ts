import { useMemo } from "react";
import { getDirectMessageThreads } from "matterhorn-sdk/browser/directMessages";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import { useRoom } from "matterhorn-sdk/react";
import type { Chord } from "../../../../types";
import type { Actor, Channel, ChatEmbed, ChatState } from "@entities/chat/model/types";
import type { ChatProps } from "@entities/chat/model/types";

type ChordRoom = MatterhornRoom<Chord>;

export type ChordLiveClient = Omit<ChordRoom, "actor" | "can" | "state" | "subscribe"> & {
  readonly actor: Actor;
  readonly state: ChatState;
  readonly ready: boolean;
  readonly message: string;
  readonly mediaHost: ChordRoom["media"];
  readonly permissions: {
    roleIds(): string[];
    canViewScope(input: { scopeType: string; scopeId: string }): boolean;
    canEditScope(input: { scopeType: string; scopeId: string }): boolean;
    records<T = unknown>(collection: string): T[];
    record<T = unknown>(collection: string, id: string): T | undefined;
    roomAccessLevel(room: unknown): "hidden" | "readonly" | "editor";
  };
  readonly core: { sendPresence(input?: { status?: string; activity?: string; at?: number }): Promise<boolean> };
  readonly select: {
    records<T = unknown>(collection: string): T[];
    record<T = unknown>(collection: string, id: string): T | undefined;
    channels(): Channel[];
    canViewScope(input: { scopeType: string; scopeId: string }): boolean;
    canEditScope(input: { scopeType: string; scopeId: string }): boolean;
    embedsByScope(input: { scopeType: string; scopeId: string }): ChatEmbed[];
    messagesByChannel(channelId: string): Chord.Message[];
  };
  can(action: Chord.ActionName | string): boolean;
  getDMs(topicPattern?: RegExp): ReturnType<typeof getDirectMessageThreads<Chord.DirectThread, Chord.DirectMessage>>;
  subscribe(listener: (client: ChordLiveClient) => void): () => void;
};

export function useChordClient(_props: ChatProps = {}): ChordLiveClient {
  const room = useRoom<Chord>();
  return useMemo(() => {
    const rawRoom = room as ChordRoom & Record<string, any>;
    const sdkSelect = rawRoom.select || {};
    const client = {
      get state() {
        return room.state as ChatState;
      },
      get envelope() {
        return room.envelope;
      },
      get actions() {
        return room.actions;
      },
      get queries() {
        return room.queries;
      },
      get actor() {
        return room.actor as Actor;
      },
      get status() {
        return room.status;
      },
      get crypto() {
        return room.crypto;
      },
      get media() {
        return room.media;
      },
      get presence() {
        return room.presence;
      },
      get notifications() {
        return room.notifications;
      },
      get membership() {
        return room.membership;
      },
      get permissions() {
        return rawRoom.permissions || {
          roleIds: () => [],
          canViewScope: () => true,
          canEditScope: () => true,
          records: (collection: string) => Object.values((room.state as any)[collection] || {}),
          record: (collection: string, id: string) => (room.state as any)[collection]?.[id],
          roomAccessLevel: () => "editor"
        };
      },
      get ready() {
        return room.status !== "connecting";
      },
      get message() {
        return room.status;
      },
      get mediaHost() {
        return room.media;
      },
      core: {
        sendPresence(input?: { status?: string; activity?: string; at?: number }) {
          return room.presence.send(input);
        }
      },
      select: {
        records<T = unknown>(collection: string): T[] {
          return sdkSelect.records?.(collection) || Object.values((room.state as any)[collection] || {});
        },
        record<T = unknown>(collection: string, id: string): T | undefined {
          return sdkSelect.record?.(collection, id) || (room.state as any)[collection]?.[id];
        },
        channels() {
          return sdkSelect.channels?.() || room.state.channels || [];
        },
        canViewScope(input: { scopeType: string; scopeId: string }) {
          return sdkSelect.canViewScope?.(input) ?? rawRoom.permissions?.canViewScope?.(input) ?? true;
        },
        canEditScope(input: { scopeType: string; scopeId: string }) {
          return sdkSelect.canEditScope?.(input) ?? rawRoom.permissions?.canEditScope?.(input) ?? true;
        },
        embedsByScope(input: { scopeType: string; scopeId: string }) {
          return sdkSelect.embedsByScope?.(input) || Object.values(room.state.embeds || {})
            .filter((embed) => embed.scopeType === input.scopeType && embed.scopeId === input.scopeId) as ChatEmbed[];
        },
        messagesByChannel(channelId: string) {
          return sdkSelect.messagesByChannel?.(channelId) || Object.values(room.state.messages || {}).filter((message) => message.channelId === channelId);
        }
      },
      can(action: Chord.ActionName | string) {
        const canApi = (room as any).can;
        if (typeof canApi === "function") return Boolean(canApi(action));
        const gate = canApi?.[action];
        return typeof gate === "function" ? gate().status === "allowed" : false;
      },
      dispatch(action: string, payload?: Record<string, unknown>) {
        return room.dispatch(action, payload);
      },
      getDMs(topicPattern?: RegExp) {
        return rawRoom.getDMs?.(topicPattern) || getDirectMessageThreads(room.state, topicPattern, { currentUserId: room.actor.memberId });
      },
      refresh() {
        return room.refresh();
      },
      subscribe(listener: (client: ChordLiveClient) => void) {
        return room.subscribe(() => listener(client as ChordLiveClient));
      },
      close() {
        room.close();
      }
    };
    return client as ChordLiveClient;
  }, [room]);
}
