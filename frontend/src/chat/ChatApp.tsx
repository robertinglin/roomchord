import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CallMediaSettings } from "roomkit-sdk/browser/types";
import { roomkitDisplayName } from "roomkit-sdk/browser/displayName";
import { parseRoomkitMarkdown, type RoomkitMarkdownEmbed } from "roomkit-sdk/browser/markdown";
import { useLiveRoom } from "../../../shared/reactLive/useLiveRoom";
import type { Actor, AvatarSource, ChatProps, ChatState, DirectThread, MediaRoom, Message, RoomMember, RoomRoleAccess } from "./types";
import { CHAT_DIRECT_PROTOCOL, channelEmbeds, channelMessages, channelThreads, directMessages, directThreadIdForUsers, directUnreadCounts, emptyChatState, isCoreDirectMessage, isCoreDirectThread, latestDirectMessageTime, normalizeUserIds } from "./state";
import { ChannelSidebar } from "./components/ChannelSidebar";
import { DirectMessages, threadTitle } from "./components/DirectMessages";
import { MessageFeed, type MessageForwardTarget } from "./components/MessageFeed";
import { PresencePanel } from "./components/PresencePanel";
import { ManageOverviewDialog, type ManagementTab } from "./components/ManageOverviewDialog";
import { UserControls } from "./components/UserControls";
import { VoiceRoomView } from "./components/VoiceRoomView";
import { assignedRoleIds, canEditRoom, canViewRoom } from "./roles";
import { messageAnchorId, messageIdFromHash } from "./messageLinks";
import { closedDirectThreadsStorageKey, loadClosedDirectThreads, saveClosedDirectThreads } from "./localClosedDirectThreads";
import { directReadStorageKey, loadDirectReadState, saveDirectReadState } from "./localReadState";
import { clearRecentVoiceJoin, loadRecentVoiceJoin, saveRecentVoiceJoin, voiceReconnectStorageKey, VOICE_RECONNECT_WINDOW_MS, type RecentVoiceJoin } from "./localVoiceReconnect";
import { loadVoicePreferences, mediaWithVoicePreferences, saveVoicePreferences, voicePreferencesStorageKey, type VoicePreferences } from "./localVoicePreferences";
import { useChatMediaRooms } from "./useChatMediaRooms";

type ActiveView = "channel" | "dm" | "media";
type ManageDialogState = { tab?: ManagementTab; memberId?: string };

type LinkedMessageLocation =
  | { messageId: string; view: "channel"; channelId: string }
  | { messageId: string; view: "dm"; threadId: string };

function currentHash() {
  return typeof window === "undefined" ? "" : window.location.hash;
}

function linkedMessageLocation(state: ChatState, hash: string): LinkedMessageLocation | undefined {
  const messageId = messageIdFromHash(hash);
  if (!messageId) return undefined;
  const channelMessage = state.messages?.[messageId];
  if (channelMessage?.channelId && !channelMessage.deletedAt) {
    return { messageId, view: "channel", channelId: channelMessage.channelId };
  }
  const directMessage = state.directMessages?.[messageId];
  if (directMessage?.threadId && !directMessage.deletedAt && isCoreDirectMessage(directMessage)) {
    return { messageId, view: "dm", threadId: directMessage.threadId };
  }
  return undefined;
}

function messageEmbeds(body: string): RoomkitMarkdownEmbed[] {
  try {
    const seen = new Set<string>();
    return parseRoomkitMarkdown(body).embeds.filter((embed) => {
      if (!embed?.url || seen.has(embed.url)) return false;
      seen.add(embed.url);
      return true;
    });
  } catch {
    return [];
  }
}

function totalMessages(state: ReturnType<typeof emptyChatState>) {
  return Object.keys(state.messages || {}).length + Object.keys(state.directMessages || {}).length;
}

function roomMemberName(member: RoomMember, id: string) {
  return roomkitDisplayName({ member, fallbackId: id });
}

function memberNamesForState(state: ChatState, actor: Actor): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [key, member] of Object.entries(state.members || {})) {
    const id = member.memberId || member.id || key;
    if (id) names[id] = roomMemberName(member, id);
  }
  for (const [key, item] of Object.entries(state.presence || {})) {
    const id = item.memberId || key;
    if (id) names[id] = roomkitDisplayName({ presence: item, member: state.members?.[id], fallback: names[id], fallbackId: id });
  }
  names[actor.memberId] = roomkitDisplayName({ actor, fallback: names[actor.memberId], fallbackId: actor.memberId });
  return names;
}

function avatarValue(source?: AvatarSource) {
  return source?.profileImageUrl || source?.avatarUrl || source?.avatar;
}

function memberAvatarsForState(state: ChatState, actor: Actor): Record<string, string> {
  const avatars: Record<string, string> = {};
  for (const [key, member] of Object.entries(state.members || {})) {
    const id = member.memberId || member.id || key;
    const avatar = avatarValue(member);
    if (id && avatar) avatars[id] = avatar;
  }
  for (const [key, item] of Object.entries(state.presence || {})) {
    const id = item.memberId || key;
    const avatar = avatarValue(item);
    if (id && avatar) avatars[id] = avatar;
  }
  const actorAvatar = avatarValue(actor);
  if (actorAvatar) avatars[actor.memberId] = actorAvatar;
  return avatars;
}

const ROOM_ROLE_RANKS: Record<string, number> = { guest: 0, member: 1, user: 1, moderator: 2, admin: 3, owner: 4 };

function roomRoleRank(role: string) {
  return ROOM_ROLE_RANKS[role] ?? ROOM_ROLE_RANKS.guest;
}

function canManageRooms(role: string) {
  return roomRoleRank(role) >= ROOM_ROLE_RANKS.moderator;
}

function canCreateChannels(role: string) {
  return roomRoleRank(role) >= ROOM_ROLE_RANKS.admin;
}

function canManageRoles(role: string) {
  return roomRoleRank(role) >= ROOM_ROLE_RANKS.admin;
}

function isMessageAuthor(actor: Actor, message: Message) {
  return Boolean(message.authorId && message.authorId === actor.memberId);
}

function canDeleteMessage(actor: Actor, message: Message) {
  return isMessageAuthor(actor, message) || canManageRooms(actor.role);
}

function hasDirectMessages(state: ChatState, threadId: string) {
  return directMessages(state, threadId).length > 0;
}

function sameParticipants(left: string[] | undefined, right: string[]) {
  const a = normalizeUserIds(left || []);
  const b = normalizeUserIds(right);
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function directThreadForUsers(state: ChatState, userIds: string[]) {
  return Object.values(state.directThreads || {}).find((thread) => isCoreDirectThread(thread) && sameParticipants(thread.userIds, userIds));
}

function forwardedMessageBody(message: Message, memberNamesById: Record<string, string>) {
  const name = message.authorName || (message.authorId ? memberNamesById[message.authorId] : undefined) || message.authorId || "Member";
  return `Forwarded from ${name}:\n${message.body}`;
}

function ChatLoading(props: { roomName: string; message: string; status: string }) {
  return (
    <main className="chat-loading-shell">
      <section className="chat-loading-panel" aria-live="polite">
        <span className={`connection-state ${props.status}`}>{props.status}</span>
        <h1>Chord</h1>
        <p>{props.roomName}</p>
        <p>{props.message}</p>
      </section>
    </main>
  );
}

export function ChatApp(props: ChatProps) {
  const live = useLiveRoom({ bridgeName: "ROOMKIT_CHORD_HOST", appName: "Chord", defaultBackendPort: 43732, emptyState: emptyChatState(), envelope: props.envelope, initialState: props.initialState });
  if (!live.ready) {
    return (
      <ChatLoading
        roomName={live.envelope.room?.name || live.envelope.room?.id || "roomkit-chord"}
        message={live.message}
        status={live.status}
      />
    );
  }
  return <ReadyChatApp live={live} />;
}

function ReadyChatApp({ live }: { live: ReturnType<typeof useLiveRoom<ChatState>> }) {
  const { state, dispatch } = live;
  const initialLinkedLocation = linkedMessageLocation(state, currentHash());
  const roomReadStorageKey = useMemo(() => directReadStorageKey(live.envelope.room?.id || live.envelope.room?.name || "roomkit-chord", live.actor.memberId), [live.actor.memberId, live.envelope.room?.id, live.envelope.room?.name]);
  const roomClosedDirectThreadsStorageKey = useMemo(() => closedDirectThreadsStorageKey(live.envelope.room?.id || live.envelope.room?.name || "roomkit-chord", live.actor.memberId), [live.actor.memberId, live.envelope.room?.id, live.envelope.room?.name]);
  const voicePreferencesKey = useMemo(() => voicePreferencesStorageKey(live.envelope.room?.id || live.envelope.room?.name || "roomkit-chord", live.actor.memberId), [live.actor.memberId, live.envelope.room?.id, live.envelope.room?.name]);
  const voiceReconnectKey = useMemo(() => voiceReconnectStorageKey(live.envelope.room?.id || live.envelope.room?.name || "roomkit-chord", live.actor.memberId), [live.actor.memberId, live.envelope.room?.id, live.envelope.room?.name]);
  const [activeView, setActiveView] = useState<ActiveView>(initialLinkedLocation?.view || "channel");
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>(initialLinkedLocation?.view === "channel" ? initialLinkedLocation.channelId : undefined);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(initialLinkedLocation?.view === "dm" ? initialLinkedLocation.threadId : undefined);
  const [readAtByThread, setReadAtByThread] = useState<Record<string, number>>(() => loadDirectReadState(roomReadStorageKey));
  const [voicePreferences, setVoicePreferences] = useState<VoicePreferences>(() => loadVoicePreferences(voicePreferencesKey));
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [recentVoiceJoin, setRecentVoiceJoin] = useState<RecentVoiceJoin | undefined>(() => loadRecentVoiceJoin(voiceReconnectKey));
  const [closedDirectThreads, setClosedDirectThreads] = useState<Record<string, number>>(() => loadClosedDirectThreads(roomClosedDirectThreadsStorageKey));
  const [draftDirectThread, setDraftDirectThread] = useState<DirectThread | undefined>();
  const [selectedMediaRoomId, setSelectedMediaRoomId] = useState<string | undefined>();
  const [joinedMediaRoomId, setJoinedMediaRoomId] = useState<string | undefined>();
  const [localMediaSettings, setLocalMediaSettings] = useState<CallMediaSettings>({ audio: true, video: false });
  const [mutedVoiceParticipantIds, setMutedVoiceParticipantIds] = useState<Record<string, boolean>>({});
  const [manageDialog, setManageDialog] = useState<ManageDialogState | undefined>();
  const [composerFocusKey, setComposerFocusKey] = useState(0);
  const routedHashRef = useRef(initialLinkedLocation ? currentHash() : "");
  const [pendingScrollMessageId, setPendingScrollMessageId] = useState<string | undefined>(initialLinkedLocation?.messageId);
  const channels = useMemo(() => state.channels.filter((channel) => !channel.archivedAt), [state.channels]);
  const threads = useMemo(() => {
    const visible = Object.values(state.directThreads || {})
      .filter((thread) => {
        if (!isCoreDirectThread(thread) || thread.archivedAt || !hasDirectMessages(state, thread.id)) return false;
        const closedAt = closedDirectThreads[thread.id];
        return closedAt === undefined || latestDirectMessageTime(state, thread.id) > closedAt;
      });
    if (draftDirectThread && !visible.some((thread) => thread.id === draftDirectThread.id)) visible.push(draftDirectThread);
    return visible;
  }, [closedDirectThreads, draftDirectThread, state]);
  const memberNamesById = useMemo(() => memberNamesForState(state, live.actor), [live.actor, state.members, state.presence]);
  const memberAvatarsById = useMemo(() => memberAvatarsForState(state, live.actor), [live.actor, state.members, state.presence]);
  const unreadCounts = useMemo(() => directUnreadCounts(state, live.actor.memberId, readAtByThread), [live.actor.memberId, readAtByThread, state]);
  const actorCanManageRooms = canManageRooms(live.actor.role);
  const actorCanCreateChannels = canCreateChannels(live.actor.role);
  const actorCanManageRoles = canManageRoles(live.actor.role);
  const actorCanManageAnything = actorCanManageRooms || actorCanCreateChannels || actorCanManageRoles;
  const actorRoleIds = useMemo(() => assignedRoleIds(live.actor.memberId, live.actor.role, state.memberRoles), [live.actor.memberId, live.actor.role, state.memberRoles]);
  const effectiveVoicePreferences = useMemo(
    () => voiceSettingsOpen && !voicePreferences.deafened ? { ...voicePreferences, deafened: true } : voicePreferences,
    [voicePreferences, voiceSettingsOpen]
  );

  useEffect(() => {
    if (!activeChannelId && channels[0]) setActiveChannelId(channels[0].id);
  }, [activeChannelId, channels]);

  useEffect(() => {
    if (!activeThreadId && threads[0]) setActiveThreadId(threads[0].id);
  }, [activeThreadId, threads]);

  useEffect(() => {
    if (activeView === "dm" && threads.length === 0) setActiveView("channel");
  }, [activeView, threads.length]);

  useEffect(() => {
    if (draftDirectThread && hasDirectMessages(state, draftDirectThread.id)) setDraftDirectThread(undefined);
  }, [draftDirectThread, state]);

  const currentChannelId = activeChannelId || channels[0]?.id;
  const currentThreadId = activeThreadId || threads[0]?.id;
  const activeChannel = channels.find((channel) => channel.id === currentChannelId);
  const activeThread = threads.find((thread) => thread.id === currentThreadId);
  const showingDm = activeView === "dm" && Boolean(activeThread);
  const feedTitle = showingDm ? threadTitle(activeThread!, memberNamesById, live.actor.memberId) : activeChannel ? `# ${activeChannel.name}` : "# channels";
  const feedSubtitle = showingDm ? activeThread?.topicKey || activeThread?.topic || "Direct message" : activeChannel?.topic || "Channel";
  const feedMessages = showingDm ? directMessages(state, currentThreadId) : channelMessages(state, currentChannelId);
  const embeds = showingDm ? [] : channelEmbeds(state, currentChannelId);
  const threadsForChannel = showingDm ? [] : channelThreads(state, currentChannelId);
  const activeScreenShares = Object.values(state.screenShares || {}).filter((share) => !share.stoppedAt);
  const media = useChatMediaRooms({
    live,
    roomName: live.envelope.room?.id || live.envelope.room?.name || "roomkit-chord"
  });
  const joinedRoomId = media.sfu.mediaRoomId || joinedMediaRoomId;
  const visibleRooms = useMemo(() => state.rooms.filter((room) => !room.archivedAt && canViewRoom(room, actorRoleIds, actorCanManageRooms)), [actorCanManageRooms, actorRoleIds, state.rooms]);
  const selectedMediaRoom = visibleRooms.find((room) => room.id === selectedMediaRoomId)
    || visibleRooms.find((room) => room.id === joinedRoomId);
  const showingMediaRoom = activeView === "media" && Boolean(selectedMediaRoom);
  const reconnectRoom = !joinedRoomId && recentVoiceJoin
    ? visibleRooms.find((room) => canEditRoom(room, actorRoleIds, actorCanManageRooms) && room.id === recentVoiceJoin.roomId)
    : undefined;
  const forwardTargets = useMemo<MessageForwardTarget[]>(() => {
    const targets: MessageForwardTarget[] = [];
    for (const channel of channels) {
      if (activeView === "channel" && channel.id === currentChannelId) continue;
      targets.push({ id: `channel:${channel.id}`, type: "channel", label: `# ${channel.name}`, channelId: channel.id });
    }
    const seenThreads = new Set<string>();
    const memberIds = new Set<string>();
    for (const [key, member] of Object.entries(state.members || {})) {
      const id = member.memberId || member.id || key;
      if (id && id !== live.actor.memberId && !member.revokedAt && !member.bannedAt) memberIds.add(id);
    }
    for (const [key, item] of Object.entries(state.presence || {})) {
      const id = item.memberId || key;
      if (id && id !== live.actor.memberId) memberIds.add(id);
    }
    for (const memberId of memberIds) {
      const userIds = normalizeUserIds([live.actor.memberId, memberId]);
      if (userIds.length < 2) continue;
      const threadId = directThreadIdForUsers(userIds);
      if (activeView === "dm" && threadId === currentThreadId) continue;
      if (seenThreads.has(threadId)) continue;
      seenThreads.add(threadId);
      targets.push({ id: `dm:${threadId}`, type: "dm", label: memberNamesById[memberId] || memberId, threadId, userIds });
    }
    return targets;
  }, [activeView, channels, currentChannelId, currentThreadId, live.actor.memberId, memberNamesById, state.members, state.presence]);

  useEffect(() => {
    function openLinkedMessage(hash = currentHash()) {
      if (!messageIdFromHash(hash)) {
        routedHashRef.current = "";
        return;
      }
      if (routedHashRef.current === hash) return;
      const location = linkedMessageLocation(state, hash);
      if (!location) return;
      routedHashRef.current = hash;
      setPendingScrollMessageId(location.messageId);
      if (location.view === "channel") {
        setActiveChannelId(location.channelId);
        setActiveView("channel");
        return;
      }
      showDirectThread(location.threadId);
      setActiveThreadId(location.threadId);
      setActiveView("dm");
    }

    const onHashChange = () => openLinkedMessage();
    openLinkedMessage();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [state.directMessages, state.messages]);

  useEffect(() => {
    if (!pendingScrollMessageId || !feedMessages.some((message) => message.id === pendingScrollMessageId)) return;
    window.requestAnimationFrame(() => {
      const target = document.getElementById(messageAnchorId(pendingScrollMessageId));
      target?.scrollIntoView?.({ block: "center" });
      target?.focus({ preventScroll: true });
      setPendingScrollMessageId(undefined);
    });
  }, [feedMessages, pendingScrollMessageId]);

  useEffect(() => {
    setReadAtByThread(loadDirectReadState(roomReadStorageKey));
  }, [roomReadStorageKey]);

  useEffect(() => {
    setClosedDirectThreads(loadClosedDirectThreads(roomClosedDirectThreadsStorageKey));
  }, [roomClosedDirectThreadsStorageKey]);

  useEffect(() => {
    setVoicePreferences(loadVoicePreferences(voicePreferencesKey));
  }, [voicePreferencesKey]);

  useEffect(() => {
    setRecentVoiceJoin(loadRecentVoiceJoin(voiceReconnectKey));
  }, [voiceReconnectKey]);

  useEffect(() => {
    if (!recentVoiceJoin) return undefined;
    const remaining = Math.max(0, VOICE_RECONNECT_WINDOW_MS - (Date.now() - recentVoiceJoin.joinedAt));
    const timer = window.setTimeout(() => {
      setRecentVoiceJoin(loadRecentVoiceJoin(voiceReconnectKey));
    }, remaining + 10);
    return () => window.clearTimeout(timer);
  }, [recentVoiceJoin, voiceReconnectKey]);

  useEffect(() => {
    if (joinedMediaRoomId && state.rooms.some((room) => room.id === joinedMediaRoomId && room.archivedAt)) setJoinedMediaRoomId(undefined);
  }, [joinedMediaRoomId, state.rooms]);

  useEffect(() => {
    if (!showingDm || !currentThreadId) return;
    const latest = latestDirectMessageTime(state, currentThreadId);
    setReadAtByThread((current) => {
      if (latest <= Number(current[currentThreadId] || 0)) return current;
      const next = { ...current, [currentThreadId]: latest };
      saveDirectReadState(roomReadStorageKey, next);
      return next;
    });
  }, [currentThreadId, roomReadStorageKey, showingDm, state]);

  async function sendChannelMessageToChannel(channelId: string, body: string) {
    const embeds = messageEmbeds(body);
    await dispatch("messageSend", { channelId, body, embeds });
    // Mirror rich embeds into the channel-scoped embed shelf shown in the presence panel.
    for (const embed of embeds) {
      if (embed.provider === "link") continue;
      await dispatch("embedAdd", { scopeType: "channel", scopeId: channelId, url: embed.url, title: embed.title, provider: embed.provider });
    }
  }

  async function sendChannelMessage(body: string) {
    if (!currentChannelId) return;
    await sendChannelMessageToChannel(currentChannelId, body);
  }

  async function sendDirectMessageToThread(threadId: string, userIds: string[], body: string) {
    const bridge = live.host as { sendDirectMessage?: (message: { userIds: string[]; body: string; topicKey?: string; schemaAction?: string }) => Promise<{ ok: boolean; state?: ChatState; reason?: string }> } | undefined;
    const result = await bridge?.sendDirectMessage?.({ userIds, body, schemaAction: "directMessageSend" });
    if (!result || result.ok === false) return;
    const committedThread = result.state ? directThreadForUsers(result.state, userIds) : directThreadForUsers(state, userIds);
    const committedThreadId = committedThread?.id || threadId;
    showDirectThread(committedThreadId);
    setActiveThreadId(committedThreadId);
  }

  async function sendDirectMessage(body: string) {
    if (!currentThreadId) return;
    const userIds = activeThread?.userIds;
    if (!userIds || userIds.length < 2) return;
    await sendDirectMessageToThread(currentThreadId, userIds, body);
  }

  async function forwardMessage(message: Message, target: MessageForwardTarget) {
    const body = forwardedMessageBody(message, memberNamesById);
    if (target.type === "channel") {
      await sendChannelMessageToChannel(target.channelId, body);
      return;
    }
    await sendDirectMessageToThread(target.threadId, target.userIds, body);
  }

  function showDirectThread(threadId: string) {
    setClosedDirectThreads((current) => {
      if (!(threadId in current)) return current;
      const next = { ...current };
      delete next[threadId];
      saveClosedDirectThreads(roomClosedDirectThreadsStorageKey, next);
      return next;
    });
  }

  function closeDirectThread(threadId: string) {
    const nextThreads = threads.filter((thread) => thread.id !== threadId);
    const nextThreadId = nextThreads[0]?.id;
    setDraftDirectThread((current) => current?.id === threadId ? undefined : current);
    setClosedDirectThreads((current) => {
      const next = { ...current, [threadId]: latestDirectMessageTime(state, threadId) };
      saveClosedDirectThreads(roomClosedDirectThreadsStorageKey, next);
      return next;
    });
    if (activeThreadId === threadId || currentThreadId === threadId) setActiveThreadId(nextThreadId);
    if (activeView === "dm" && currentThreadId === threadId && !nextThreadId) setActiveView("channel");
  }

  async function openDirectThread(userIds: string[]) {
    const targetUserIds = normalizeUserIds(userIds).filter((id) => id !== live.actor.memberId);
    const participants = normalizeUserIds([live.actor.memberId, ...targetUserIds]);
    if (participants.length < 2) return;
    const threadId = directThreadIdForUsers(participants);
    showDirectThread(threadId);
    const committedThread = directThreadForUsers(state, participants);
    if (committedThread && hasDirectMessages(state, committedThread.id)) {
      setActiveThreadId(committedThread.id);
      setActiveView("dm");
      setComposerFocusKey((value) => value + 1);
      return;
    }
    setDraftDirectThread({
      id: threadId,
      protocol: CHAT_DIRECT_PROTOCOL,
      userIds: participants
    });
    setActiveThreadId(threadId);
    setActiveView("dm");
    setComposerFocusKey((value) => value + 1);
  }

  async function createTextChannel(input: { name: string; topic?: string; group?: string }) {
    await dispatch("channelCreate", input);
  }

  async function updateTextChannel(channelId: string, input: { name?: string; topic?: string | null; group?: string | null }) {
    await dispatch("channelRename", { channelId, ...input });
  }

  async function createMediaRoom(input: { name: string; allowsVideo: boolean; group?: string; roleAccess?: RoomRoleAccess }) {
    const scoped = currentChannelId ? { scopeType: "channel", scopeId: currentChannelId } : {};
    await dispatch("mediaRoomCreate", { name: input.name, allowsVideo: input.allowsVideo, group: input.group, roleAccess: input.roleAccess, ...scoped });
  }

  async function updateMediaRoomSettings(roomId: string, settings: { name?: string; group?: string | null; allowsVideo?: boolean; locked?: boolean; roleAccess?: RoomRoleAccess }) {
    await dispatch("mediaRoomUpdate", { roomId, ...settings });
  }

  async function createRole(input: { roleId: string; name: string; description?: string; color?: string }) {
    await dispatch("roleCreate", input);
  }

  async function updateRole(roleId: string, input: { name?: string; description?: string; color?: string }) {
    await dispatch("roleUpdate", { roleId, ...input });
  }

  async function archiveRole(roleId: string) {
    await dispatch("roleArchive", { roleId });
  }

  async function assignMemberRoles(memberId: string, roleIds: string[], displayName?: string) {
    await dispatch("memberRoleAssign", { memberId, roleId: roleIds[0] || "member", roleIds, displayName });
  }

  function openManageDialog(tab: ManagementTab = "overview", memberId?: string) {
    setManageDialog({ tab, memberId });
  }

  function startMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, actorRoleIds, actorCanManageRooms)) return;
    const audioEnabled = mediaSettings?.audio !== false && !voicePreferences.muted && !voicePreferences.deafened;
    const nextMedia = mediaWithVoicePreferences({ audio: audioEnabled, video: Boolean(mediaSettings?.video), screen: Boolean(mediaSettings?.screen) }, voicePreferences);
    setLocalMediaSettings(nextMedia);
    setRecentVoiceJoin({ roomId: room.id, media: nextMedia, joinedAt: Date.now() });
    saveRecentVoiceJoin(voiceReconnectKey, room.id, nextMedia);
    if (!media.joinRoom(room, nextMedia)) setJoinedMediaRoomId(room.id);
  }

  function joinMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, actorRoleIds, actorCanManageRooms)) return;
    setSelectedMediaRoomId(room.id);
    setActiveView("media");
    startMediaRoom(room, mediaSettings);
  }

  function selectMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, actorRoleIds, actorCanManageRooms)) return;
    setSelectedMediaRoomId(room.id);
    setActiveView("media");
    if (joinedRoomId === room.id) return;
    startMediaRoom(room, mediaSettings);
  }

  function updateMediaRoom(room: MediaRoom, mediaSettings: CallMediaSettings) {
    const baseMedia = { audio: mediaSettings.audio !== false, video: Boolean(mediaSettings.video), screen: Boolean(mediaSettings.screen) };
    const nextMedia = mediaSettings.voice ? { ...baseMedia, voice: mediaSettings.voice } : mediaWithVoicePreferences(baseMedia, voicePreferences);
    setSelectedMediaRoomId(room.id);
    setLocalMediaSettings(nextMedia);
    setRecentVoiceJoin({ roomId: room.id, media: nextMedia, joinedAt: Date.now() });
    saveRecentVoiceJoin(voiceReconnectKey, room.id, nextMedia);
    if (!media.updateRoomMedia(room, nextMedia)) setJoinedMediaRoomId(room.id);
  }

  async function leaveMediaRoom(roomId: string) {
    setJoinedMediaRoomId((current) => current === roomId ? undefined : current);
    setRecentVoiceJoin(undefined);
    clearRecentVoiceJoin(voiceReconnectKey);
    if (media.sfu.mediaRoomId === roomId) {
      media.leaveRoom();
      return;
    }
  }

  async function updatePresence(status: string, activity: string) {
    if (live.host?.sendPresence) {
      try {
        if (await live.host.sendPresence({ status, activity, at: Date.now() })) return;
      } catch {
        // Fall through to the local backend operation when transient presence is unavailable.
      }
    }
    await dispatch("presenceUpdate", { status, activity });
  }

  function updateVoicePreferences(preferences: VoicePreferences) {
    setVoicePreferences(preferences);
    saveVoicePreferences(voicePreferencesKey, preferences);
  }

  function toggleVoiceParticipantMute(participantId: string) {
    setMutedVoiceParticipantIds((current) => ({ ...current, [participantId]: !current[participantId] }));
  }

  function dismissReconnect() {
    setRecentVoiceJoin(undefined);
    clearRecentVoiceJoin(voiceReconnectKey);
  }

  function reconnectVoiceRoom(room: MediaRoom) {
    const mediaSettings = {
      audio: !voicePreferences.muted && !voicePreferences.deafened,
      video: Boolean(recentVoiceJoin?.media.video),
      screen: Boolean(recentVoiceJoin?.media.screen)
    };
    joinMediaRoom(room, mediaWithVoicePreferences(mediaSettings, voicePreferences));
  }

  const actorName = roomkitDisplayName({ actor: live.actor, fallbackId: live.actor.memberId });

  return (
    <main className="chat-shell">
      <aside className="room-sidebar" aria-label="Room navigation">
        <header className="room-sidebar-header">
          <div>
            <h1>Chord</h1>
            <p>{live.envelope.room?.name || live.envelope.room?.id || "roomkit-chord"}</p>
          </div>
          <span className="room-sidebar-actions">
            <span className={`connection-state ${live.status}`}>{live.status}</span>
            {actorCanManageAnything ? (
              <button className="sidebar-manage-button" type="button" onClick={() => openManageDialog("overview")}>
                Manage
              </button>
            ) : null}
          </span>
        </header>

        <ChannelSidebar
          channels={channels}
          activeChannelId={activeView === "channel" ? currentChannelId : undefined}
          canCreateChannels={actorCanCreateChannels}
          voice={{
            state,
            activeRoomId: joinedRoomId,
            selectedRoomId: showingMediaRoom ? selectedMediaRoom?.id : undefined,
            voiceTokens: media.voiceTokens,
            canManageRooms: actorCanManageRooms,
            currentUserId: live.actor.memberId,
            currentRoleIds: actorRoleIds,
            mutedVoiceParticipantIds,
            onCreate: (input) => createMediaRoom({ name: input.name, group: input.group, allowsVideo: true }),
            onDirectMessage: (memberId) => { void openDirectThread([memberId]); },
            onJoin: selectMediaRoom,
            onToggleVoiceParticipantMute: toggleVoiceParticipantMute
          }}
          onCreateChannel={createTextChannel}
          onSelect={(id) => {
            setActiveChannelId(id);
            setActiveView("channel");
          }}
        />

        <DirectMessages
          threads={threads}
          activeThreadId={showingDm ? currentThreadId : undefined}
          currentUserId={live.actor.memberId}
          memberNamesById={memberNamesById}
          memberAvatarsById={memberAvatarsById}
          unreadCounts={unreadCounts}
          onSelect={(id) => {
            showDirectThread(id);
            setActiveThreadId(id);
            setActiveView("dm");
          }}
          onClose={closeDirectThread}
        />

        <UserControls
          actorName={actorName}
          actorAvatar={avatarValue(live.actor)}
          actorRole={live.actor.role}
          rooms={visibleRooms}
          selectedRoomId={selectedMediaRoom?.id}
          joinedRoomId={joinedRoomId}
          localMedia={localMediaSettings}
          sfu={media.sfu}
          error={media.error}
          voicePreferences={voicePreferences}
          reconnectRoom={reconnectRoom}
          screenShares={activeScreenShares}
          onUpdateMedia={updateMediaRoom}
          onLeave={(roomId) => { void leaveMediaRoom(roomId); }}
          onReconnect={reconnectVoiceRoom}
          onDismissReconnect={dismissReconnect}
          onStopShare={(shareId) => dispatch("screenshareStop", { shareId })}
          onUpdateVoicePreferences={updateVoicePreferences}
          onVoiceSettingsOpenChange={setVoiceSettingsOpen}
          onUpdateStatus={updatePresence}
        />
      </aside>

      {showingMediaRoom && selectedMediaRoom ? (
        <VoiceRoomView
          actorId={live.actor.memberId}
          actorName={actorName}
          actorAvatar={avatarValue(live.actor)}
          joinedRoomId={joinedRoomId}
          localMedia={localMediaSettings}
          room={selectedMediaRoom}
          sfu={media.sfu}
          voicePreferences={effectiveVoicePreferences}
          voiceTokens={media.voiceTokens}
          mutedVoiceParticipantIds={mutedVoiceParticipantIds}
          onDirectMessage={(memberId) => { void openDirectThread([memberId]); }}
          onStopWatchingScreenShare={media.stopWatchingScreenShare}
          onToggleVoiceParticipantMute={toggleVoiceParticipantMute}
          onWatchScreenShare={media.watchScreenShare}
        />
      ) : (
        <MessageFeed
          title={feedTitle}
          subtitle={feedSubtitle}
          messages={feedMessages}
          memberNamesById={memberNamesById}
          memberAvatarsById={memberAvatarsById}
          forwardTargets={forwardTargets}
          focusKey={composerFocusKey}
          currentUserId={live.actor.memberId}
          mode={showingDm ? "dm" : "channel"}
          disabled={showingDm ? !currentThreadId : !currentChannelId}
          onSend={(body) => showingDm ? sendDirectMessage(body) : sendChannelMessage(body)}
          onReply={showingDm ? undefined : (replyToId, body) => currentChannelId && dispatch("messageReply", { channelId: currentChannelId, replyToId, body })}
          onReact={showingDm ? undefined : (messageId, emoji) => { void dispatch("messageReact", { messageId, emoji }); }}
          onForward={forwardMessage}
          onPin={showingDm || !actorCanManageRooms ? undefined : (messageId) => dispatch("messagePin", { messageId })}
          onUnpin={showingDm || !actorCanManageRooms ? undefined : (messageId) => dispatch("messageUnpin", { messageId })}
          onDelete={showingDm ? undefined : (messageId) => dispatch("messageDelete", { messageId })}
          onEdit={showingDm ? undefined : (messageId, body) => dispatch("messageEdit", { messageId, body, embeds: messageEmbeds(body) })}
          onDirectMessage={(memberId) => { void openDirectThread([memberId]); }}
          canDeleteMessage={(message) => canDeleteMessage(live.actor, message)}
          canEditMessage={(message) => isMessageAuthor(live.actor, message)}
        />
      )}

      {manageDialog ? (
        <ManageOverviewDialog
          actor={live.actor}
          state={state}
          canCreateChannels={actorCanCreateChannels}
          canManageRooms={actorCanManageRooms}
          canManageRoles={actorCanManageRoles}
          initialTab={manageDialog.tab}
          initialMemberId={manageDialog.memberId}
          onClose={() => setManageDialog(undefined)}
          onCreateChannel={createTextChannel}
          onUpdateChannel={updateTextChannel}
          onArchiveChannel={(channelId) => dispatch("channelArchive", { channelId })}
          onCreateRoom={createMediaRoom}
          onUpdateRoom={updateMediaRoomSettings}
          onArchiveRoom={(roomId) => dispatch("mediaRoomArchive", { roomId })}
          onCreateRole={createRole}
          onUpdateRole={updateRole}
          onArchiveRole={archiveRole}
          onAssignMemberRoles={assignMemberRoles}
        />
      ) : null}

      <PresencePanel
        actor={live.actor}
        roomMembers={state.members}
        presence={state.presence}
        embeds={embeds}
        threads={threadsForChannel}
        rooms={visibleRooms}
        screenShares={activeScreenShares}
        voiceTokens={media.voiceTokens}
        roleDefinitions={state.roleDefinitions}
        memberRoles={state.memberRoles}
        canManageRoles={actorCanManageRoles}
        onDirectMessage={(memberId) => { void openDirectThread([memberId]); }}
        onSetMemberRoles={(memberId) => openManageDialog("members", memberId)}
      />
    </main>
  );
}
