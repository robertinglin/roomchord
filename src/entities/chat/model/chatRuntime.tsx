import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { DirectCallDockOptions } from "matterhorn-sdk/browser/directCallDock";
import { createMatterhornMediaDeviceController, type MatterhornMediaDeviceController, type MatterhornMediaDeviceState } from "matterhorn-sdk/browser/mediaDevices";
import { chatActionHandlers, type ChatActionHandlers } from "@entities/chat/model/chatActions";
import type { CallSwitchDecision, CallSwitchPromptInput } from "@entities/chat/model/actions/types";
import { useChatDirectCalls, type ChatDirectCalls } from "@entities/chat/model/useChatDirectCalls";
import { useChatMediaRooms, type ChatMediaRooms } from "@entities/chat/model/useChatMediaRooms";
import { useChatNotifications } from "@entities/chat/model/useChatNotifications";
import { useChatSyncEffects } from "@entities/chat/model/useChatSyncEffects";
import { useChatViewData, type ChatViewData } from "@entities/chat/model/useChatViewData";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { useVoiceModerationState } from "@entities/chat/model/voiceModeration";
import { usePersonalProductivity, type PersonalProductivityController } from "@entities/chat/model/personalProductivity";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh} from "../../../../types";
import { CallSwitchDialog } from "@shared/ui/CallSwitchDialog";

type ChatRuntime = {
  actions: ChatActionHandlers;
  directCalls: ChatDirectCalls;
  live: MatterhornRoom<Mosh>;
  media: ChatMediaRooms;
  mediaDevices: MatterhornMediaDeviceController;
  mediaDeviceState: MatterhornMediaDeviceState;
  productivity: PersonalProductivityController;
  roomName: string;
  view: ChatViewData;
};

const ChatRuntimeContext = createContext<ChatRuntime | undefined>(undefined);

export function ChatRuntimeProvider({ children, live, roomName }: { children: ReactNode; live: MatterhornRoom<Mosh>; roomName: string }) {
  const state = live.state;
  const ui = useChatUiActions();
  const activeChannelId = useChatUiStore((value) => value.activeChannelId);
  const activeThreadId = useChatUiStore((value) => value.activeThreadId);
  const activeView = useChatUiStore((value) => value.activeView);
  const closedDirectThreads = useChatUiStore((value) => value.closedDirectThreads);
  const draftDirectThread = useChatUiStore((value) => value.draftDirectThread);
  const heldDirectCallRoomId = useChatUiStore((value) => value.heldDirectCallRoomId);
  const heldMediaRoomIds = useChatUiStore((value) => value.heldMediaRoomIds);
  const joinedMediaRoomId = useChatUiStore((value) => value.joinedMediaRoomId);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const memberPreferences = useChatUiStore((value) => value.memberPreferences);
  const pendingScrollMessageId = useChatUiStore((value) => value.pendingScrollMessageId);
  const readAtByThread = useChatUiStore((value) => value.readAtByThread);
  const recentVoiceJoin = useChatUiStore((value) => value.recentVoiceJoin);
  const selectedMediaRoomId = useChatUiStore((value) => value.selectedMediaRoomId);
  const voicePreferences = useChatUiStore((value) => value.voicePreferences);
  const voiceSettingsOpen = useChatUiStore((value) => value.voiceSettingsOpen);
  const mediaDevices = React.useMemo(() => createMatterhornMediaDeviceController(), []);
  const [mediaDeviceState, setMediaDeviceState] = useState<MatterhornMediaDeviceState>(() => mediaDevices.state());
  useEffect(() => {
    const unsubscribe = mediaDevices.subscribe(setMediaDeviceState);
    return () => {
      unsubscribe();
      mediaDevices.close();
    };
  }, [mediaDevices]);
  const [callSwitchPrompt, setCallSwitchPrompt] = useState<(CallSwitchPromptInput & { resolve: (decision: CallSwitchDecision) => void }) | undefined>();
  const skipNextDirectAcceptPrompt = useRef(false);
  const requestCallSwitch = useCallback((input: CallSwitchPromptInput) => new Promise<CallSwitchDecision>((resolve) => {
    setCallSwitchPrompt({ ...input, resolve });
  }), []);
  const media = useChatMediaRooms({
    heldMediaRoomIds,
    live,
    mediaDeviceController: mediaDevices,
    onVoiceConnected: (roomId, mediaSettings) => ui.rememberVoiceJoin(roomId, mediaSettings),
    roomName,
    voicePreferences
  });
  const voiceModerationState = useVoiceModerationState(live.media);
  const productivity = usePersonalProductivity(live);
  const activeListedRoom = useCallback(() => {
    const roomId = media.sfu.mediaRoomId || joinedMediaRoomId;
    const room = state.rooms.find((item) => item.id === roomId);
    if (!room || media.sfu.status === "idle" || media.sfu.status === "unavailable") return undefined;
    return room;
  }, [joinedMediaRoomId, media.sfu.mediaRoomId, media.sfu.status, state.rooms]);
  const holdListedRoom = useCallback((room: typeof state.rooms[number]) => {
    media.updateRoomMedia(room, { audio: false, video: false, screen: false });
    ui.holdMediaRoom(room.id);
  }, [media, ui]);
  const leaveListedRoom = useCallback((room: typeof state.rooms[number]) => {
    media.leaveRoom();
    if (joinedMediaRoomId === room.id) ui.setJoinedMediaRoomId(undefined);
    ui.clearVoiceJoin();
  }, [joinedMediaRoomId, media, ui]);
  const handleBeforeAcceptDirectCall = useCallback(async () => {
    if (skipNextDirectAcceptPrompt.current) {
      skipNextDirectAcceptPrompt.current = false;
      return true;
    }
    const room = activeListedRoom();
    if (!room) return true;
    const decision = await requestCallSwitch({
      currentLabel: room.name,
      targetLabel: "Direct call"
    });
    if (decision === "cancel") return false;
    if (decision === "hold") {
      holdListedRoom(room);
      return true;
    }
    leaveListedRoom(room);
    return true;
  }, [activeListedRoom, holdListedRoom, leaveListedRoom, requestCallSwitch]);
  const incomingDirectCallActions = useCallback<NonNullable<DirectCallDockOptions["incomingActions"]>>(() => {
    const room = activeListedRoom();
    if (!room) return undefined;
    return [
      {
        ariaLabel: `Accept call and hold ${room.name}`,
        label: "Accept + Hold",
        tone: "accept" as const,
        onSelect: (_call, actions) => {
          holdListedRoom(room);
          skipNextDirectAcceptPrompt.current = true;
          void actions.accept();
        }
      },
      {
        ariaLabel: `Accept call and leave ${room.name}`,
        label: "Accept + Leave",
        tone: "accept" as const,
        onSelect: (_call, actions) => {
          leaveListedRoom(room);
          skipNextDirectAcceptPrompt.current = true;
          void actions.accept();
        }
      },
      {
        ariaLabel: "Decline call",
        label: "Decline",
        tone: "danger" as const,
        onSelect: (_call, actions) => actions.decline()
      }
    ];
  }, [activeListedRoom, holdListedRoom, leaveListedRoom]);
  const directCalls = useChatDirectCalls({
    actor: live.actor,
    incomingActions: incomingDirectCallActions,
    live,
    onBeforeAccept: handleBeforeAcceptDirectCall,
    mediaDeviceController: mediaDevices,
    roomName,
    state
  });
  const view = useChatViewData({
    activeChannelId,
    activeDirectCallMemberIds: directCalls.memberIds,
    activeThreadId,
    activeView,
    closedDirectThreads,
    draftDirectThread,
    joinedMediaRoomId,
    live,
    media,
    memberPreferences,
    recentVoiceJoin,
    readAtByThread,
    selectedMediaRoomId,
    voicePreferences,
    voiceSettingsOpen
  });
  const actions = chatActionHandlers({
    heldDirectCallRoomId,
    heldMediaRoomIds,
    joinedMediaRoomId,
    live,
    localMediaSettings,
    localVoicePreferences: voicePreferences,
    directCalls,
    media,
    recentVoiceJoin,
    requestCallSwitch,
    ui,
    view,
    voiceModerationState
  });

  useEffect(() => {
    if (heldDirectCallRoomId && directCalls.state.directRoomId !== heldDirectCallRoomId) {
      ui.clearDirectCallHold(heldDirectCallRoomId);
    }
  }, [directCalls.state.directRoomId, heldDirectCallRoomId, ui]);

  useChatNotifications({ actions, live, ui });

  useChatSyncEffects({
    live,
    channels: view.channels,
    currentChannelId: view.currentChannelId,
    currentThreadId: view.currentThreadId,
    draftDirectThread,
    feedMessages: view.feedMessages,
    joinedMediaRoomId,
    pendingScrollMessageId,
    recentVoiceJoin,
    showingDm: view.showingDm,
    state,
    threads: view.threads,
    ui
  });

  return (
    <ChatRuntimeContext.Provider value={{ actions, directCalls, live, media, mediaDevices, mediaDeviceState, productivity, roomName, view }}>
      {children}
      {callSwitchPrompt ? (
        <CallSwitchDialog
          currentLabel={callSwitchPrompt.currentLabel}
          targetLabel={callSwitchPrompt.targetLabel}
          onCancel={() => {
            callSwitchPrompt.resolve("cancel");
            setCallSwitchPrompt(undefined);
          }}
          onEnd={() => {
            callSwitchPrompt.resolve("end");
            setCallSwitchPrompt(undefined);
          }}
          onHold={() => {
            callSwitchPrompt.resolve("hold");
            setCallSwitchPrompt(undefined);
          }}
        />
      ) : null}
    </ChatRuntimeContext.Provider>
  );
}

export function useChatRuntime() {
  const runtime = useContext(ChatRuntimeContext);
  if (!runtime) throw new Error("useChatRuntime must be used inside ChatRuntimeProvider");
  return runtime;
}
