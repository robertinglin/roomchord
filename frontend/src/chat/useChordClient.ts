import { useCallback, useEffect, useMemo, useRef } from "react";
import { getDirectMessageThreads } from "roomkit-sdk/browser/directMessages";
import { createRoomKitConnector, type RoomKitLiveHost } from "roomkit-sdk/browser/liveRoomConnector";
import { useLiveRoom } from "roomkit-sdk/react";
import type { Chord } from "../../../src/types";
import { emptyChatState } from "./state";
import type { Actor, ChatActionName, ChatActionPayload, ChatCore, ChatDispatchResult, ChatProps, ChatState, DirectMessageThread } from "./types";

const chordConnector = createRoomKitConnector<ChatState>({
  bridgeName: "ROOMKIT_CHORD_HOST",
  appName: "Chord",
  defaultBackendPort: 43732,
  emptyState: emptyChatState,
  fallbackBridgeNames: ["ROOMKIT_HOST", "ROOMKIT_EXAMPLE_HOST", "ROOMKIT_CHAT_HOST"],
  offlineMessage: "Chord backend offline - run pnpm run dev from the app package."
});

type ChordCoreHost = {
  sendPresence?: (presence: { status?: string; activity?: string; at?: number }) => boolean | Promise<boolean>;
};
type ChordDirectHost = {
  getDMs?: (topicPattern?: RegExp) => DirectMessageThread[];
  subscribeDMs?: {
    (listener: (threads: DirectMessageThread[]) => void): () => void;
    (topicPattern: RegExp, listener: (threads: DirectMessageThread[]) => void): () => void;
  };
};
type ChordHost = Omit<RoomKitLiveHost<ChatState>, "getDMs" | "subscribeDMs"> & ChordCoreHost & ChordDirectHost;

type DirectSubscription = {
  topicPattern?: RegExp;
  listener: (threads: DirectMessageThread[]) => void;
};

export type ChordLiveClient = Omit<Chord.Client, "actor" | "core" | "dispatch" | "getDMs" | "query" | "state" | "subscribeDMs"> & {
  actor: Actor;
  core: ChatCore;
  dispatch<K extends ChatActionName>(action: K, payload: ChatActionPayload<K>): Promise<ChatDispatchResult>;
  envelope: Chord.LaunchEnvelope;
  getDMs(topicPattern?: RegExp): DirectMessageThread[];
  lastOperation?: string;
  mediaHost?: unknown;
  message: string;
  query<K extends Chord.QueryName>(name: K, ...input: Chord.QueryInput[K] extends void ? [] : [Chord.QueryInput[K]]): Chord.Queries[K];
  refresh: () => Promise<ChatState | undefined>;
  state: ChatState;
  subscribeDMs(listener: (threads: DirectMessageThread[]) => void): () => void;
  subscribeDMs(topicPattern: RegExp, listener: (threads: DirectMessageThread[]) => void): () => void;
};

export function useChordClient(props: ChatProps): ChordLiveClient {
  const live = useLiveRoom(chordConnector, {
    envelope: props.envelope,
    initialState: props.initialState
  });
  const stateRef = useRef(live.state);
  const directSubscriptions = useRef(new Set<DirectSubscription>());
  stateRef.current = live.state;

  const resultWithState = useCallback(async (result: { ok: boolean; state?: ChatState; reason?: string } | undefined, fallbackReason: string): Promise<ChatDispatchResult> => {
    if (!result) return { ok: false, reason: fallbackReason };
    if (result.ok === false) return { ok: false, reason: result.reason || fallbackReason, state: result.state };
    if (result.state) return { ok: true, state: result.state };
    const refreshed = await live.refresh();
    if (refreshed) return { ok: true, state: refreshed };
    return { ok: false, reason: fallbackReason };
  }, [live.refresh]);

  const dispatch = useCallback(async <K extends ChatActionName>(action: K, payload: ChatActionPayload<K>) => {
    const result = await live.dispatch(action, payload as Record<string, unknown>);
    return resultWithState(result, `${action} rejected`);
  }, [live.dispatch, resultWithState]);

  const core = useMemo<ChatCore>(() => ({
    async sendPresence(input) {
      try {
        return Boolean(await (live.host as ChordHost | undefined)?.sendPresence?.(input));
      } catch {
        return false;
      }
    }
  }), [live.host]);

  const getDMs = useCallback((topicPattern?: RegExp) => {
    const host = live.host as ChordHost | undefined;
    if (host?.getDMs) return host.getDMs(topicPattern);
    return getDirectMessageThreads(stateRef.current, topicPattern) as DirectMessageThread[];
  }, [live.host]);

  const subscribeDMs = useCallback((first: RegExp | ((threads: DirectMessageThread[]) => void), second?: (threads: DirectMessageThread[]) => void) => {
    const topicPattern = first instanceof RegExp ? first : undefined;
    const listener = first instanceof RegExp ? second : first;
    if (!listener) return () => undefined;
    const host = live.host as ChordHost | undefined;
    if (host?.subscribeDMs) {
      return topicPattern ? host.subscribeDMs(topicPattern, listener) : host.subscribeDMs(listener);
    }
    const subscription = { topicPattern, listener };
    directSubscriptions.current.add(subscription);
    listener(getDirectMessageThreads(stateRef.current, topicPattern) as DirectMessageThread[]);
    return () => {
      directSubscriptions.current.delete(subscription);
    };
  }, [live.host]);

  useEffect(() => {
    for (const subscription of directSubscriptions.current) {
      subscription.listener(getDirectMessageThreads(live.state, subscription.topicPattern) as DirectMessageThread[]);
    }
  }, [live.state]);

  const query = useCallback(<K extends Chord.QueryName>(
    name: K,
    ..._input: Chord.QueryInput[K] extends void ? [] : [Chord.QueryInput[K]]
  ): Chord.Queries[K] => {
    if (name === "channelSummary") return live.state.channels as Chord.Queries[K];
    if (name === "roomDirectory") return live.state.rooms as Chord.Queries[K];
    return Object.values(live.state.presence || {}).filter((member) => member.status !== "offline") as Chord.Queries[K];
  }, [live.state.channels, live.state.presence, live.state.rooms]);

  return {
    actor: live.actor as Actor,
    core,
    dispatch,
    envelope: live.envelope as Chord.LaunchEnvelope,
    getDMs,
    lastOperation: live.lastOperation,
    mediaHost: live.host,
    message: live.message,
    query,
    ready: live.ready,
    refresh: live.refresh,
    state: live.state,
    status: live.status as Chord.ConnectionStatus,
    subscribeDMs
  };
}
