import React from "react";
import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import type { MatterhornManagementSnapshot } from "matterhorn-sdk/browser/management";
import type { Mosh } from "../../../../types";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { mediaWithVoicePreferences, type VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { ManageOverviewDialog } from "@features/management/ui/ManageOverviewDialog";
import type { CommunityEvent } from "@features/community/model/communityCapabilities";
import type { CommunityChannel, CommunityChannelKind, CommunityNotification, CommunityPoll } from "@features/community/ui/CommunityCapabilityPanel";
import { MATTERHORN_INTEGRATIONS_READY } from "@shared/model/matterhornFeatureGates";
import { botChannelAccessOverrides } from "@features/management/model/botChannelAccess";

type CommunityProjection = {
  events: CommunityEvent[];
  polls: CommunityPoll[];
  notifications: CommunityNotification[];
  channels: CommunityChannel[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function records(value: unknown): unknown[] {
  return Array.isArray(value) ? value : Object.values(record(value));
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeEvent(value: unknown): CommunityEvent | undefined {
  const item = record(value);
  const id = text(item.id);
  if (!id) return undefined;
  return { id, title: text(item.title) || text(item.name) || "Event", startsAt: number(item.startsAt), endsAt: number(item.endsAt), location: text(item.location) || null, description: text(item.description) || null, cancelledAt: number(item.cancelledAt) ?? (item.cancelledAt === null ? null : undefined) };
}

function normalizeNotification(value: unknown): CommunityNotification | undefined {
  const item = record(value);
  const id = text(item.id);
  return id ? { id, eventId: text(item.eventId) || undefined, status: text(item.status) || undefined, readAt: number(item.readAt) ?? (item.readAt === null ? null : undefined) } : undefined;
}

function channelKind(value: string): CommunityChannelKind | undefined {
  const kinds: readonly CommunityChannelKind[] = ["text", "forum", "announcement", "onboarding", "rules", "voice-text", "stage"];
  return kinds.find((kind) => kind === value);
}

function channelPolicy(value: string): "members" | "moderators" | "none" | undefined {
  const policies: readonly ["members", "moderators", "none"] = ["members", "moderators", "none"];
  return policies.find((policy) => policy === value);
}

function projectPoll(poll: Mosh.Poll): CommunityPoll {
  return {
    id: poll.id,
    question: poll.question,
    options: poll.options,
    kind: poll.kind,
    maxSelections: poll.maxSelections,
    expiresAt: poll.expiresAt,
    closedAt: poll.closedAt,
    counts: poll.counts
  };
}

function projectChannel(channel: Mosh.ChannelKind): CommunityChannel {
  const kind = channelKind(channel.kind);
  return {
    id: channel.id,
    name: channel.name,
    ...(kind ? { kind } : {}),
    mediaRoomId: channel.mediaRoomId || undefined,
    postingPolicy: channelPolicy(channel.postingPolicy),
    threadPolicy: channelPolicy(channel.threadPolicy),
    speakerPolicy: channelPolicy(channel.speakerPolicy),
    forumLayout: channel.forumLayout === "gallery" ? "gallery" : "list",
    forumTags: channel.forumTags
  };
}

export function ChatManageDialog() {
  const { actions, live, media, mediaDevices, view, roomName } = useChatRuntime();
  const ui = useChatUiActions();
  const manageDialog = useChatUiStore((value) => value.manageDialog);
  const memberPreferences = useChatUiStore((value) => value.memberPreferences);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const voicePreferences = useChatUiStore((value) => value.voicePreferences);
  const [managementSnapshot, setManagementSnapshot] = React.useState<MatterhornManagementSnapshot>();
  const [communityProjection, setCommunityProjection] = React.useState<CommunityProjection>({ events: [], polls: [], notifications: [], channels: [] });
  const communityProjectionRequest = React.useRef(0);
  const mediaBeforeSettings = React.useRef<CallMediaSettings | undefined>(undefined);
  const latestVoicePreferences = React.useRef(voicePreferences);
  const audioSettingsOpen = manageDialog?.tab === "audio";
  const activeVoiceRoom = view.visibleRooms.find((room) => room.id === (media.sfu.mediaRoomId || view.joinedRoomId || view.selectedMediaRoom?.id));
  const activeMedia = media.sfu.mediaRoomId === activeVoiceRoom?.id && (media.sfu.status === "connected" || media.sfu.status === "connecting")
    ? media.sfu.media
    : localMediaSettings;
  const integrations = MATTERHORN_INTEGRATIONS_READY ? live.integrations : undefined;

  const loadCommunityProjection = React.useCallback(async () => {
    const requestId = ++communityProjectionRequest.current;
    const scopeId = view.currentChannelId || "general";
    try {
      const [events, polls, notifications, channels] = await Promise.all([
        live.queries.eventsForScope({ scopeType: "channel", scopeId }),
        live.queries.pollsForScope({ scopeType: "channel", scopeId }),
        live.queries.calendarNotificationsForMember(),
        live.queries.channelsForScope({ scopeType: "room", scopeId: roomName })
      ]);
      if (requestId !== communityProjectionRequest.current) return;
      setCommunityProjection({
        channels: channels.map(projectChannel),
        events: records(events).map(normalizeEvent).filter((value): value is CommunityEvent => Boolean(value)),
        notifications: records(notifications).map(normalizeNotification).filter((value): value is CommunityNotification => Boolean(value)),
        polls: polls.map(projectPoll)
      });
    } catch {
      if (requestId !== communityProjectionRequest.current) return;
      setCommunityProjection({ events: [], polls: [], notifications: [], channels: [] });
    }
  }, [live, roomName, view.currentChannelId]);

  React.useEffect(() => { void loadCommunityProjection(); }, [loadCommunityProjection]);

  function refreshAfter(task: () => Promise<void>) {
    void task().catch(() => undefined).finally(() => { void loadCommunityProjection(); });
  }

  function suspendedVoiceSettingsMedia(preferences: VoicePreferences): CallMediaSettings {
    const restore = mediaBeforeSettings.current || activeMedia;
    return mediaWithVoicePreferences({
      audio: false,
      video: restore ? Boolean(restore.video) : false,
      screen: restore ? Boolean(restore.screen) : false
    }, preferences);
  }

  function restoredVoiceSettingsMedia(preferences: VoicePreferences): CallMediaSettings {
    const restore = mediaBeforeSettings.current || activeMedia;
    return mediaWithVoicePreferences({
      audio: (restore ? restore.audio !== false : true) && !preferences.muted && !preferences.deafened,
      video: restore ? Boolean(restore.video) : false,
      screen: restore ? Boolean(restore.screen) : false
    }, preferences);
  }

  function updateVoicePreferences(preferences: VoicePreferences) {
    latestVoicePreferences.current = preferences;
    ui.updateVoicePreferences(preferences);
    if (!activeVoiceRoom) return;
    actions.updateMediaRoom(
      activeVoiceRoom,
      audioSettingsOpen ? suspendedVoiceSettingsMedia(preferences) : restoredVoiceSettingsMedia(preferences)
    );
  }

  React.useEffect(() => {
    latestVoicePreferences.current = voicePreferences;
  }, [voicePreferences]);

  React.useEffect(() => live.management.subscribe(setManagementSnapshot), [live.management]);

  React.useEffect(() => {
    ui.setVoiceSettingsOpen(Boolean(audioSettingsOpen));
    if (!audioSettingsOpen || !activeVoiceRoom) {
      if (mediaBeforeSettings.current && activeVoiceRoom) {
        actions.updateMediaRoom(activeVoiceRoom, restoredVoiceSettingsMedia(latestVoicePreferences.current));
        mediaBeforeSettings.current = undefined;
      }
      return () => undefined;
    }
    if (!mediaBeforeSettings.current) {
      mediaBeforeSettings.current = activeMedia ? { ...activeMedia } : restoredVoiceSettingsMedia(latestVoicePreferences.current);
      actions.updateMediaRoom(activeVoiceRoom, suspendedVoiceSettingsMedia(latestVoicePreferences.current));
    }
    return () => {
      ui.setVoiceSettingsOpen(false);
      if (!mediaBeforeSettings.current) return;
      actions.updateMediaRoom(activeVoiceRoom, restoredVoiceSettingsMedia(latestVoicePreferences.current));
      mediaBeforeSettings.current = undefined;
    };
  }, [audioSettingsOpen, activeVoiceRoom?.id]);

  if (!manageDialog) return null;
  return (
    <ManageOverviewDialog
      actor={live.actor}
      state={live.state}
      roomName={roomName}
      canCreateChannels={view.actorCanCreateChannels}
      canManageMembers={view.actorCanManageMembers}
      canReport={live.can("memberReport")}
      canModerateSafety={live.can("memberTimeout") && live.can("memberQuarantine") && live.can("channelSlowmode")}
      managementSnapshot={managementSnapshot}
      canManageRooms={view.actorCanManageRooms}
      canManageRoles={view.actorCanManageRoles}
      initialTab={manageDialog.tab}
      initialMemberId={manageDialog.memberId}
      memberPreferences={memberPreferences}
      profileOnly={manageDialog.profileOnly}
      voicePreferences={voicePreferences}
      mediaDeviceController={mediaDevices}
      onClose={ui.closeManageDialog}
      onCreateCategory={actions.createCategory}
      onUpdateCategory={actions.updateCategory}
      onReorderCategory={actions.reorderCategory}
      onArchiveCategory={actions.archiveCategory}
      onCreateChannel={actions.createTextChannel}
      onUpdateChannel={actions.updateTextChannel}
      onArchiveChannel={actions.archiveTextChannel}
      onCreateRoom={actions.createMediaRoom}
      onUpdateRoom={actions.updateMediaRoomSettings}
      onArchiveRoom={actions.archiveMediaRoom}
      onCreateRole={actions.createRole}
      onUpdateRole={actions.updateRole}
      onArchiveRole={actions.archiveRole}
      onAssignMemberRoles={actions.assignMemberRoles}
      onApproveJoinRequest={actions.approveJoinRequest}
      onBanMember={actions.banMember}
      onDenyJoinRequest={actions.denyJoinRequest}
      onDisableInvite={actions.disableInvite}
      onModerateMember={actions.moderateMember}
      onRemoveInvite={actions.removeInvite}
      onCreateInvite={actions.createInvite}
      onCreateBotInvite={({ serviceId, displayName }) => live.management.invites.create({
        name: `${displayName} bot`,
        roleId: "member",
        maxUses: 1,
        expiresAt: Date.now() + 15 * 60 * 1000,
        principal: { kind: "bot", serviceId, displayName }
      })}
      onRemoveBot={(memberId) => live.management.members.remove(memberId, "Bot membership revoked")}
      onRotateBotDevice={(memberId, deviceId) => live.management.members.rotateDevice(memberId, deviceId)}
      onSetBotChannelAccess={async (memberId, channelIds) => {
        const overrides = botChannelAccessOverrides(memberId, live.state.channels || [], channelIds);
        await Promise.all(overrides.map((payload) => live.dispatch("scopeMemberOverrideSet", payload)));
      }}
      onSetMemberBlock={ui.setMemberBlock}
      onSetMemberIgnore={ui.setMemberIgnore}
      onSetMemberNickname={ui.setMemberNickname}
      onSetMemberNote={ui.setMemberNote}
      onReportMember={actions.reportMember}
      onGetStatus={actions.getMemberModerationStatus}
      onClearTimeout={actions.clearMemberTimeout}
      onClearQuarantine={actions.clearMemberQuarantine}
      onActiveRules={actions.activeRules}
      onPublishRules={actions.publishRules}
      onAcceptRules={actions.acceptRules}
      onReportInbox={actions.moderationReportInbox}
      onResolveReport={actions.resolveMemberReport}
      onAuditQuery={actions.moderationAudit}
      onActiveAutoMod={actions.activeAutoMod}
      onPublishAutoMod={actions.publishAutoMod}
      onOverrideAutoMod={actions.overrideAutoMod}
      onRedactAutoMod={actions.redactAutoMod}
      onQuarantineAutoMod={actions.quarantineAutoMod}
      onEvaluateAutoMod={actions.evaluateAutoMod}
      onTimeoutMember={actions.timeoutMember}
      onQuarantineMember={actions.quarantineMember}
      onSetSlowmode={actions.setChannelSlowmode}
      onUnbanMember={actions.unbanMember}
      onUpdateVoicePreferences={updateVoicePreferences}
      onScheduleEvent={(input) => refreshAfter(() => actions.scheduleEvent(input))}
      onCreatePoll={(input) => refreshAfter(() => actions.createPoll(input))}
      onVotePoll={(pollId, optionIds) => refreshAfter(() => actions.votePoll(pollId, optionIds))}
      onClosePoll={(pollId) => refreshAfter(() => actions.closePoll(pollId))}
      onRsvpEvent={(eventId, status) => refreshAfter(() => actions.rsvpEvent(eventId, status))}
      onReadCalendarNotification={(notificationId) => refreshAfter(() => actions.readCalendarNotification(notificationId))}
      communityPolls={communityProjection.polls}
      communityEvents={communityProjection.events}
      communityNotifications={communityProjection.notifications}
      communityChannels={communityProjection.channels}
      onSetChannelPolicy={(channelId, policyType, policy) => {
        if (policyType === "posting") refreshAfter(() => actions.setChannelPostingPolicy(channelId, policy));
        else if (policyType === "thread") refreshAfter(() => actions.setChannelThreadPolicy(channelId, policy));
        else refreshAfter(() => actions.setChannelSpeakerPolicy(channelId, policy));
      }}
      onSetForumLayout={live.can("channelForumLayout") ? (channelId, layout) => refreshAfter(() => actions.setForumLayout(channelId, layout)) : undefined}
      onCreateForumTag={live.can("channelForumTagCreate") ? (channelId, name, color) => refreshAfter(() => actions.createForumTag(channelId, name, color)) : undefined}
      onUpdateForumTag={live.can("channelForumTagUpdate") ? (channelId, tagId, name, color) => refreshAfter(() => actions.updateForumTag(channelId, tagId, name, color)) : undefined}
      onArchiveForumTag={live.can("channelForumTagArchive") ? (channelId, tagId) => refreshAfter(() => actions.archiveForumTag(channelId, tagId)) : undefined}
      roomScopeId={roomName}
      onCreateChannelKind={(input) => refreshAfter(() => actions.createChannelKind(input))}
      integrations={integrations}
    />
  );
}
