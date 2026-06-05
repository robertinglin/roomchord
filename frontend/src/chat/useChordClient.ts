import { createRoomKitConnector, type RoomKitLiveClient } from "roomkit-sdk/browser/liveRoomConnector";
import { useLiveRoom } from "roomkit-sdk/react";
import type { Chord } from "../../../src/types";
import { emptyChatState } from "./state";
import type { ChatProps } from "./types";

const chordConnector = createRoomKitConnector<Chord>({
  bridgeName: "ROOMKIT_CHORD_HOST",
  appName: "Chord",
  defaultBackendPort: 43732,
  emptyState: emptyChatState,
  fallbackBridgeNames: ["ROOMKIT_HOST", "ROOMKIT_EXAMPLE_HOST", "ROOMKIT_CHAT_HOST"],
  offlineMessage: "Chord backend offline - run pnpm run dev from the app package.",
  queries: {
    channelSummary: (state) => state.channels,
    roomDirectory: (state) => state.rooms,
    onlineMembers: (state) => Object.values(state.presence || {}).filter((member) => member.status !== "offline")
  }
});

export type ChordLiveClient = RoomKitLiveClient<Chord>;

export function useChordClient(props: ChatProps): ChordLiveClient {
  return useLiveRoom<Chord>(chordConnector, {
    envelope: props.envelope,
    initialState: props.initialState
  });
}
