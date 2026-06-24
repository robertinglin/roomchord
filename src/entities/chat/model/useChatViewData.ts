import { useEffect, useMemo, useState } from "react";
import { matterhornDisplayName } from "matterhorn-sdk/browser/displayName";
import { channelReadTopic, unreadCountsByTopic, type MatterhornReadTopic, type TopicReadCursor, type TopicReadableItem } from "matterhorn-sdk/browser";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";
import type { ActiveView } from "@entities/chat/model/chatUiStore";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { RecentVoiceJoin } from "@entities/chat/model/localVoiceReconnect";
import { canEditRoom, canViewRoom, assignedRoleIds } from "@entities/chat/model/roles";
import { channelThreads, latestDirectMessageTime, memberChatDisabled, visibleChannelMessages } from "@entities/chat/model/state";
import type { ChatMediaRooms } from "@entities/chat/model/useChatMediaRooms";
import type { ChannelId, DirectThread, MediaRoom, ThreadId } from "@entities/chat/model/types";
import {
  forwardTargetsForState,
  hasDirectMessages,
  memberAvatarsForState,
  memberNamesForState
} from "@entities/chat/model/chatViewModel";
import { threadTitle } from "@entities/chat/model/directThreads";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh} from "../../../../types";

export type ChatViewDataInput = {
  activeChannelId?: string;
  activeThreadId?: string;
  activeView: ActiveView;
  closedDirectThreads: Record<string, number>;
  draftDirectThread?: DirectThread;
  joinedMediaRoomId?: string;
  live: MatterhornRoom<Mosh>;
  media: ChatMediaRooms;
  recentVoiceJoin?: RecentVoiceJoin;
  selectedMediaRoomId?: string;
  voicePreferences: VoicePreferences;
  voiceSettingsOpen: boolean;
};

export function useChatViewData(input: ChatViewDataInput) {
  const { live, media } = input;
  const state = live.state;
  const channels = useMemo(() => (live.select.channels?.() || state.channels).filter((channel) => !channel.archivedAt), [live.select, state.channels]);
  const [directGroups, setDirectGroups] = useState<Awaited<ReturnType<MatterhornRoom<Mosh>["getDMs"]>>>([]);
  useEffect(() => {
    let cancelled = false;
    void live.getDMs().then((groups) => {
      if (!cancelled) setDirectGroups(groups);
    });
    const unsubscribe = live.subscribeDMs((groups) => {
      if (!cancelled) setDirectGroups(groups);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [live, state.directMessages, state.directThreads]);
  const directGroupsByThreadId = useMemo(() => new Map(directGroups.map((group) => [group.thread.id, group])), [directGroups]);
  const threads = useMemo(() => {
    const visible = directGroups
      .filter((thread) => {
        if (thread.thread.archivedAt || thread.messages.length === 0) return false;
        const closedAt = input.closedDirectThreads[thread.thread.id];
        return closedAt === undefined || latestDirectMessageTime(state, thread.thread.id) > closedAt;
      })
      .map((group) => group.thread);
    if (input.draftDirectThread && !visible.some((thread) => thread.id === input.draftDirectThread?.id)) {
      const draftUserIds = input.draftDirectThread.userIds;
      const hasRealThread = draftUserIds && visible.some((thread) =>
        !thread.topicKey &&
        thread.userIds?.length === draftUserIds.length &&
        thread.userIds?.every((id, i) => id === draftUserIds[i])
      );
      if (!hasRealThread) visible.push(input.draftDirectThread);
    }
    return visible;
  }, [directGroups, input.closedDirectThreads, input.draftDirectThread, state]);
  const memberNamesById = useMemo(() => memberNamesForState(state, live.actor), [live.actor, state.members, state.presence]);
  const memberAvatarsById = useMemo(() => memberAvatarsForState(state, live.actor), [live.actor, state.members, state.presence]);
  const topicUnreadCounts = useMemo(() => {
    const readTags = state.members?.[live.actor.memberId]?.readTags || {};
    const items: TopicReadableItem<MatterhornReadTopic>[] = [
      ...Object.values(state.messages || {}).filter((message) => !message.deletedAt && message.channelId).map((message) => ({
        topic: channelReadTopic(String(message.channelId)),
        id: String(message.id),
        createdAt: Number(message.createdAt || 0),
        operationId: String(message.id),
        actorId: message.authorId
      })),
    ];
    return unreadCountsByTopic(items, (topic) => live.notifications?.getReadCursor(topic) || readTags[topic], { currentUserId: live.actor.memberId });
  }, [live.actor.memberId, live.notifications, state.members, state.messages]);
  const unreadCounts = useMemo(() => Object.fromEntries(directGroups.map((group) => {
    return [group.thread.id, group.unreadCount || 0];
  })), [directGroups]);
  const actorCanManageRooms = live.can("mediaRoomCreate");
  const actorCanCreateChannels = live.can("channelCreate");
  const actorCanManageRoles = live.can("roleCreate") || live.can("memberRoleAssign") || live.can("scopeRoleSet");
  const actorCanManageMembers = live.can("banMember") || live.can("moderateMember") || live.can("disableInvite") || live.can("approveJoinRequest");
  const actorCanManageAnything = actorCanManageRooms || actorCanCreateChannels || actorCanManageRoles || actorCanManageMembers;
  const actorChatDisabled = memberChatDisabled(state, live.actor.memberId);
  const actorRoleIds = useMemo(() => assignedRoleIds(live.actor.memberId, live.actor.role, state), [live.actor.memberId, live.actor.role, state]);
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
  const visibleRooms = useMemo(() => live.select.records("rooms").filter((room) => {
    if (room.archivedAt) return false;
    const access = live.permissions.roomAccessLevel?.(room);
    return access ? access !== "hidden" : canViewRoom(room, actorRoleIds, actorCanManageRooms);
  }), [actorCanManageRooms, actorRoleIds, live.permissions, live.select, state.rooms]);
  const selectedMediaRoom = visibleRooms.find((room) => room.id === input.selectedMediaRoomId)
    || visibleRooms.find((room) => room.id === joinedRoomId);
  const showingMediaRoom = input.activeView === "media" && Boolean(selectedMediaRoom);
  const reconnectRoom = !joinedRoomId && input.recentVoiceJoin
    ? visibleRooms.find((room) => {
      const access = live.permissions.roomAccessLevel?.(room);
      return (access ? access === "editor" : canEditRoom(room, actorRoleIds, actorCanManageRooms)) && room.id === input.recentVoiceJoin?.roomId;
    })
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
  const actorName = matterhornDisplayName({ actor: live.actor, fallbackId: live.actor.memberId });
  const roomLabel = live.envelope.room?.name || live.envelope.room?.id || "mosh";
  const roomName = live.envelope.room?.id || live.envelope.room?.name || "mosh";

  return {
    activeChannel,
    activeScreenShares,
    activeThread,
    actorCanCreateChannels,
    actorCanManageAnything,
    actorCanManageMembers,
    actorCanManageRoles,
    actorCanManageRooms,
    actorChatDisabled,
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
    topicUnreadCounts,
    unreadCounts,
    visibleRooms
  };
}

export type ChatViewData = ReturnType<typeof useChatViewData>;
