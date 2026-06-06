import { useMemo } from "react";
import { roomkitDisplayName } from "roomkit-sdk/browser/displayName";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";
import type { ActiveView } from "@entities/chat/model/chatUiStore";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { RecentVoiceJoin } from "@entities/chat/model/localVoiceReconnect";
import { canEditRoom, canViewRoom, assignedRoleIds } from "@entities/chat/model/roles";
import { channelThreads, directUnreadCounts, latestDirectMessageTime, visibleChannelMessages } from "@entities/chat/model/state";
import type { ChatMediaRooms } from "@entities/chat/model/useChatMediaRooms";
import type { ChordLiveClient } from "@entities/chat/model/useChordClient";
import type { ChannelId, DirectThread, ThreadId } from "@entities/chat/model/types";
import {
  forwardTargetsForState,
  hasDirectMessages,
  memberAvatarsForState,
  memberNamesForState
} from "@entities/chat/model/chatViewModel";
import { threadTitle } from "@entities/chat/model/directThreads";

export type ChatViewDataInput = {
  activeChannelId?: string;
  activeThreadId?: string;
  activeView: ActiveView;
  closedDirectThreads: Record<string, number>;
  draftDirectThread?: DirectThread;
  joinedMediaRoomId?: string;
  live: ChordLiveClient;
  media: ChatMediaRooms;
  readAtByThread: Record<string, number>;
  recentVoiceJoin?: RecentVoiceJoin;
  selectedMediaRoomId?: string;
  voicePreferences: VoicePreferences;
  voiceSettingsOpen: boolean;
};

export function useChatViewData(input: ChatViewDataInput) {
  const { live, media } = input;
  const state = live.state;
  const channels = useMemo(() => state.channels.filter((channel) => !channel.archivedAt), [state.channels]);
  const directGroups = useMemo(() => live.getDMs(), [live.getDMs, state.directMessages, state.directThreads]);
  const directGroupsByThreadId = useMemo(() => new Map(directGroups.map((group) => [group.thread.id, group])), [directGroups]);
  const threads = useMemo(() => {
    const visible = directGroups
      .filter((thread) => {
        if (thread.thread.archivedAt || thread.messages.length === 0) return false;
        const closedAt = input.closedDirectThreads[thread.thread.id];
        return closedAt === undefined || latestDirectMessageTime(state, thread.thread.id) > closedAt;
      })
      .map((group) => group.thread);
    if (input.draftDirectThread && !visible.some((thread) => thread.id === input.draftDirectThread?.id)) visible.push(input.draftDirectThread);
    return visible;
  }, [directGroups, input.closedDirectThreads, input.draftDirectThread, state]);
  const memberNamesById = useMemo(() => memberNamesForState(state, live.actor), [live.actor, state.members, state.presence]);
  const memberAvatarsById = useMemo(() => memberAvatarsForState(state, live.actor), [live.actor, state.members, state.presence]);
  const unreadCounts = useMemo(() => directUnreadCounts(state, live.actor.memberId, input.readAtByThread), [input.readAtByThread, live.actor.memberId, state]);
  const actorCanManageRooms = live.can("mediaRoomCreate");
  const actorCanCreateChannels = live.can("channelCreate");
  const actorCanManageRoles = live.can("roleCreate");
  const actorCanManageAnything = actorCanManageRooms || actorCanCreateChannels || actorCanManageRoles;
  const actorRoleIds = useMemo(() => assignedRoleIds(live.actor.memberId, live.actor.role, state.memberRoles), [live.actor.memberId, live.actor.role, state.memberRoles]);
  const effectiveVoicePreferences = useMemo(
    () => input.voiceSettingsOpen && !input.voicePreferences.deafened ? { ...input.voicePreferences, deafened: true } : input.voicePreferences,
    [input.voicePreferences, input.voiceSettingsOpen]
  );
  const currentChannelId = input.activeChannelId || channels[0]?.id;
  const currentThreadId = input.activeThreadId || threads[0]?.id;
  const activeChannel = channels.find((channel) => channel.id === currentChannelId);
  const activeThread = threads.find((thread) => thread.id === currentThreadId);
  const showingDm = input.activeView === "dm" && Boolean(activeThread);
  const feedTitle = showingDm ? threadTitle(activeThread!, memberNamesById, live.actor.memberId) : activeChannel ? `# ${activeChannel.name}` : "# channels";
  const feedSubtitle = showingDm ? activeThread?.topicKey || activeThread?.topic || "Direct message" : activeChannel?.topic || "Channel";
  const channel = useMemo(() => {
    if (!currentChannelId) return { embeds: [], messages: [], threads: [] };
    return {
      embeds: live.select.embedsByScope({ scopeType: "channel", scopeId: currentChannelId }),
      messages: visibleChannelMessages(live.select.messagesByChannel(currentChannelId as ChannelId)),
      threads: channelThreads(state, currentChannelId)
    };
  }, [currentChannelId, live.select, state]);
  const feedMessages = showingDm ? directGroupsByThreadId.get((currentThreadId || "") as ThreadId)?.messages || [] : channel.messages;
  const embeds = showingDm ? [] : channel.embeds;
  const threadsForChannel = showingDm ? [] : channel.threads;
  const activeScreenShares = Object.values(state.screenShares || {}).filter((share) => !share.stoppedAt);
  const joinedRoomId = media.sfu.mediaRoomId || input.joinedMediaRoomId;
  const visibleRooms = useMemo(() => state.rooms.filter((room) => !room.archivedAt && canViewRoom(room, actorRoleIds, actorCanManageRooms)), [actorCanManageRooms, actorRoleIds, state.rooms]);
  const selectedMediaRoom = visibleRooms.find((room) => room.id === input.selectedMediaRoomId)
    || visibleRooms.find((room) => room.id === joinedRoomId);
  const showingMediaRoom = input.activeView === "media" && Boolean(selectedMediaRoom);
  const reconnectRoom = !joinedRoomId && input.recentVoiceJoin
    ? visibleRooms.find((room) => canEditRoom(room, actorRoleIds, actorCanManageRooms) && room.id === input.recentVoiceJoin?.roomId)
    : undefined;
  const forwardTargets = useMemo<MessageForwardTarget[]>(() => forwardTargetsForState({
    activeChannelId: currentChannelId,
    activeThreadId: currentThreadId,
    activeView: input.activeView,
    actorId: live.actor.memberId,
    channels,
    memberNamesById,
    state
  }), [channels, currentChannelId, currentThreadId, input.activeView, live.actor.memberId, memberNamesById, state]);
  const actorName = roomkitDisplayName({ actor: live.actor, fallbackId: live.actor.memberId });
  const roomLabel = live.envelope.room?.name || live.envelope.room?.id || "roomkit-chord";
  const roomName = live.envelope.room?.id || live.envelope.room?.name || "roomkit-chord";

  return {
    activeChannel,
    activeScreenShares,
    activeThread,
    actorCanCreateChannels,
    actorCanManageAnything,
    actorCanManageRoles,
    actorCanManageRooms,
    actorName,
    actorRoleIds,
    channels,
    currentChannelId,
    currentThreadId,
    directGroups,
    effectiveVoicePreferences,
    embeds,
    feedMessages,
    feedSubtitle,
    feedTitle,
    forwardTargets,
    hasDraftDirectMessages: input.draftDirectThread ? hasDirectMessages(state, input.draftDirectThread.id) : false,
    joinedRoomId,
    memberAvatarsById,
    memberNamesById,
    reconnectRoom,
    roomLabel,
    roomName,
    selectedMediaRoom,
    showingDm,
    showingMediaRoom,
    threads,
    threadsForChannel,
    unreadCounts,
    visibleRooms
  };
}

export type ChatViewData = ReturnType<typeof useChatViewData>;
