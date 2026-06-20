import { useMemo } from "react";
import { getDirectMessageThreads } from "matterhorn-sdk/browser/directMessages";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import { useRoom } from "matterhorn-sdk/react";
import type { Chord } from "../../../../../src/types";
import type { Actor, ChatEmbed, ChatState } from "@entities/chat/model/types";
import type { ChatProps } from "@entities/chat/model/types";

type ChordRoom = MatterhornRoom<Chord>;

export type ChordLiveClient = Omit<ChordRoom, "actor" | "can" | "state" | "subscribe"> & {
  readonly actor: Actor;
  readonly state: ChatState;
  readonly ready: boolean;
  readonly message: string;
  readonly mediaHost: ChordRoom["media"];
  readonly core: { sendPresence(input?: { status?: string; activity?: string; at?: number }): Promise<boolean> };
  readonly select: {
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
    const client = {
      get state() {
        return room.state;
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
        embedsByScope(input: { scopeType: string; scopeId: string }) {
          return Object.values(room.state.embeds || {})
            .filter((embed) => embed.scopeType === input.scopeType && embed.scopeId === input.scopeId) as ChatEmbed[];
        },
        messagesByChannel(channelId: string) {
          return Object.values(room.state.messages || {}).filter((message) => message.channelId === channelId);
        }
      },
      can(action: Chord.ActionName | string) {
        return room.can[action]?.().status === "allowed";
      },
      dispatch(action: string, payload?: Record<string, unknown>) {
        return room.dispatch(action, payload);
      },
      getDMs(topicPattern?: RegExp) {
        return getDirectMessageThreads(room.state, topicPattern);
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
