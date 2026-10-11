import React, { useEffect, useMemo, useState } from "react";
import type { Actor, Channel, ChannelVisibility, ChatState, MediaRoom, RoleDefinition } from "@entities/chat/model/types";
import type { ManagementInvite, ManagementSnapshot } from "matterhorn-sdk/browser/management";
import type { MediaDeviceController } from "matterhorn-sdk/browser/mediaDevices";
import type { ActiveRules, AutoModDecision, AutoModOverrideInput, AutoModPolicy, MemberModerationStatus, ModerationAuditEntry, ModerationReport, RoleRule } from "matterhorn-sdk/browser";
import type { IntegrationController } from "matterhorn-sdk/browser";
import type { MemberPreference } from "@entities/chat/model/localMemberPreferences";
import { activeRoles, memberOptions } from "@entities/chat/model/roles";
import { joinRequestsForState } from "@entities/chat/model/state";
import { Glyph } from "@shared/ui/design";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { ManageChannelsTab } from "@features/management/ui/manage/ManageChannelsTab";
import { ManageAdminTab } from "@features/management/ui/manage/ManageAdminTab";
import { ManageMembersTab } from "@features/management/ui/manage/ManageMembersTab";
import { ManageOverviewTab } from "@features/management/ui/manage/ManageOverviewTab";
import { ManageRolesTab } from "@features/management/ui/manage/ManageRolesTab";
import { ManageVoiceTab } from "@features/management/ui/manage/ManageVoiceTab";
import { ManageCommunityTab } from "@features/management/ui/manage/ManageCommunityTab";
import type { CommunityEvent } from "@entities/community/model/communityCapabilities";
import type { CommunityChannel, CommunityNotification, CommunityPoll } from "@entities/community/ui/CommunityCapabilityPanel";
import { ManageIntegrationsTab } from "@features/management/ui/manage/ManageIntegrationsTab";
import { ManageBotsTab } from "@features/management/ui/manage/ManageBotsTab";
import { VoiceSettingsPanel } from "@entities/chat/ui/VoiceSettingsPanel";
import { MANAGEMENT_TABS, type InviteInput, type ManagementTab, type RoleInput, type RoleUpdateInput, type RoomSettings } from "@entities/chat/model/managementTypes";
import { shell, rail, content } from "@shared/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

export type { ManagementTab };

type Props = {
  actor: Actor;
  state: ChatState;
  roomName: string;
  canCreateChannels: boolean;
  canManageRooms: boolean;
  canManageRoles: boolean;
  canManageMembers: boolean;
  managementSnapshot?: ManagementSnapshot;
  initialTab?: ManagementTab;
  initialMemberId?: string;
  initialChannelId?: string;
  initialRoomId?: string;
  memberPreferences: Record<string, MemberPreference>;
  profileOnly?: boolean;
  voicePreferences: VoicePreferences;
  mediaDeviceController?: MediaDeviceController;
  onClose: () => void;
  onCreateCategory: (input: { name: string; position?: number }) => void;
  onUpdateCategory: (id: string, input: { name?: string; position?: number }) => void;
  onReorderCategory: (id: string, position: number) => void;
  onArchiveCategory: (id: string) => void;
  onCreateChannel: (input: { name: string; topic?: string; group?: string; categoryId?: string; position?: number; visibility?: ChannelVisibility; allowedRoleIds?: string[]; allowedMemberIds?: string[] }) => void;
  onUpdateChannel: (id: string, input: { name?: string; topic?: string | null; group?: string | null; categoryId?: string | null; position?: number; visibility?: ChannelVisibility; allowedRoleIds?: string[]; allowedMemberIds?: string[] }) => void;
  onArchiveChannel: (id: string) => void;
  onCreateRoom: (input: { name: string; categoryId: string; position: number; allowsVideo: boolean; roleAccess?: RoomSettings["roleAccess"] }) => void;
  onReorderRoom: (roomId: string, categoryId: string, position: number) => void;
  onUpdateRoom: (roomId: string, settings: RoomSettings) => void;
  onArchiveRoom: (roomId: string) => void;
  onCreateRole: (input: RoleInput) => void;
  onUpdateRole: (roleId: string, input: RoleUpdateInput) => void;
  onArchiveRole: (roleId: string) => void;
  onAssignMemberRoles: (memberId: string, roleIds: string[], displayName?: string) => Promise<void>;
  onApproveJoinRequest: (requestId: string) => void;
  onBanMember: (memberId: string) => void;
  onDenyJoinRequest: (requestId: string) => void;
  onDisableInvite: (inviteId: string) => void;
  onModerateMember: (memberId: string, input: { chatDisabled?: boolean; nameLocked?: boolean }) => void;
  onRemoveInvite: (inviteId: string) => void;
  onCreateInvite: (input: InviteInput) => Promise<unknown>;
  onCreateBotInvite?: (input: { serviceId: string; displayName: string }) => Promise<ManagementInvite>;
  onRemoveBot?: (memberId: string) => Promise<unknown>;
  onRotateBotDevice?: (memberId: string, deviceId: string) => Promise<ManagementInvite>;
  onSetBotChannelAccess?: (memberId: string, channelIds: string[]) => Promise<unknown>;
  onSetMemberBlock: (memberId: string, blocked: boolean) => void;
  onSetMemberIgnore: (memberId: string, ignored: boolean) => void;
  onSetMemberNickname: (memberId: string, nickname: string | null) => void;
  onSetMemberNote: (memberId: string, note: string | null) => void;
  canReport?: boolean;
  onReportMember?: (memberId: string, reason: string) => Promise<void>;
  onGetStatus?: (memberId: string) => Promise<MemberModerationStatus>;
  onClearTimeout?: (memberId: string, revision: number, reason?: string) => Promise<void>;
  onClearQuarantine?: (memberId: string, revision: number, reason?: string) => Promise<void>;
  onActiveRules?: () => Promise<ActiveRules | undefined>;
  onPublishRules?: (text: string, version: number, required?: boolean, reason?: string) => Promise<void>;
  onAcceptRules?: (version?: number) => Promise<void>;
  onReportInbox?: () => Promise<ModerationReport[]>;
  onResolveReport?: (reportId: string, status: "resolved" | "dismissed", reason?: string) => Promise<void>;
  onAuditQuery?: () => Promise<ModerationAuditEntry[]>;
  onActiveAutoMod?: () => Promise<AutoModPolicy | undefined>;
  onPublishAutoMod?: (input: AutoModPolicy & { reason?: string }) => Promise<void>;
  onOverrideAutoMod?: (input: AutoModOverrideInput) => Promise<void>;
  onRedactAutoMod?: (input: Omit<AutoModOverrideInput, "action">) => Promise<void>;
  onQuarantineAutoMod?: (input: Omit<AutoModOverrideInput, "action">) => Promise<void>;
  onEvaluateAutoMod?: (input: { body: string; scopeId?: string }) => Promise<AutoModDecision>;
  canModerateSafety?: boolean;
  onTimeoutMember?: (memberId: string, input: { durationMs?: number; permanent?: boolean; reason?: string }) => Promise<void>;
  onQuarantineMember?: (memberId: string, input: { durationMs?: number; permanent?: boolean; scopeId?: string; reason?: string }) => Promise<void>;
  onSetSlowmode?: (scopeId: string, intervalMs: number, input?: { reason?: string }) => Promise<void>;
  onUnbanMember: (memberId: string) => void;
  onUpdateVoicePreferences: (preferences: VoicePreferences) => void;
  onScheduleEvent?: (input: { scopeType: string; scopeId: string; title: string; startsAt: number; location?: string }) => void;
  onCreatePoll?: (input: { scopeType: string; scopeId: string; question: string; options: string[]; kind?: "single" | "multiple"; maxSelections?: number }) => void;
  onVotePoll?: (pollId: string, optionIds: string[]) => void;
  onClosePoll?: (pollId: string) => void;
  onRsvpEvent?: (eventId: string, status: "going" | "maybe" | "declined") => void;
  onReadCalendarNotification?: (notificationId: string) => void;
  communityPolls?: CommunityPoll[];
  communityEvents?: CommunityEvent[];
  communityNotifications?: CommunityNotification[];
  communityChannels?: CommunityChannel[];
  onSetChannelPolicy?: (channelId: string, policyType: "posting" | "thread" | "speaker", policy: "members" | "moderators" | "none") => void;
  onSetForumLayout?: (channelId: string, layout: "list" | "gallery") => void;
  onCreateForumTag?: (channelId: string, name: string, color?: string) => void;
  onUpdateForumTag?: (channelId: string, tagId: string, name: string, color?: string) => void;
  onArchiveForumTag?: (channelId: string, tagId: string) => void;
  roomScopeId?: string;
  onCreateChannelKind?: (input: { scopeType: string; scopeId: string; name: string; kind: "text" | "forum" | "announcement" | "onboarding" | "rules" | "voice-text" | "stage"; mediaRoomId?: string }) => void;
  integrations?: IntegrationController;
};

function allowedTabs(input: {
  canCreateChannels: boolean;
  canManageAnything: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canManageRooms: boolean;
  includeAudio: boolean;
}) {
  return MANAGEMENT_TABS.filter((item) => {
    if (item.id === "overview") return input.canManageAnything;
    if (item.id === "channels") return input.canCreateChannels;
    if (item.id === "voice") return input.canManageRooms;
    if (item.id === "roles") return input.canManageRoles;
    if (item.id === "members") return input.canManageRoles;
    if (item.id === "admin") return input.canManageMembers;
    if (item.id === "bots") return input.canManageMembers;
    if (item.id === "community") return input.canManageMembers;
    if (item.id === "integrations") return input.canManageMembers;
    if (item.id === "audio") return input.includeAudio;
    return false;
  });
}

function activeChannels(channels: Channel[]) {
  return channels.filter((channel) => !channel.archivedAt);
}

function activeRooms(rooms: MediaRoom[]) {
  return rooms.filter((room) => !room.archivedAt);
}

const SYSTEM_ROLE_IDS = new Set(["guest", "member", "moderator", "admin", "owner"]);

function tabDescription(tab: ManagementTab) {
  if (tab === "channels") return "Create text channels and manage existing ones.";
  if (tab === "voice") return "Create voice rooms and set who can see them.";
  if (tab === "roles") return "Define role tags, their colour, and their permissions.";
  if (tab === "members") return "Manage the roster, role tags, invites, and join requests.";
  if (tab === "admin") return "Room-level access, invites, moderation, and join requests.";
  if (tab === "bots") return "Create bot-bound invites and manage admitted bot devices.";
  if (tab === "community") return "Polls, scheduled events, rules, and community workflows.";
  if (tab === "integrations") return "Install and manage encrypted room integrations.";
  if (tab === "audio") return "Microphone processing for this device.";
  return "A snapshot of this room at a glance.";
}

/** Nav-rail icon body for each tab (rendered through the Glyph primitive). */
function tabIcon(tab: ManagementTab) {
  if (tab === "overview") {
    return <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>;
  }
  if (tab === "channels") {
    return <><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1Z" /><path d="M16 9a3 3 0 0 1 0 6" /></>;
  }
  if (tab === "voice" || tab === "audio") {
    return <><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>;
  }
  if (tab === "roles" || tab === "admin") {
    return <><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z" />{tab === "admin" ? <path d="m9 12 2 2 4-4" /> : null}</>;
  }
  if (tab === "integrations" || tab === "bots") return <><path d="M8 8h8v8H8z" /><path d="M4 12h4M16 12h4M12 4v4M12 16v4" /></>;
  return <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.5M21 20a6 6 0 0 0-4-5.6" /></>;
}

export function ManageOverviewDialog({
  actor,
  state,
  roomName,
  canCreateChannels,
  canManageRooms,
  canManageRoles,
  canManageMembers,
  managementSnapshot,
  initialTab,
  initialMemberId,
  initialChannelId,
  initialRoomId,
  memberPreferences,
  profileOnly,
  voicePreferences,
  mediaDeviceController,
  onClose,
  onCreateCategory,
  onUpdateCategory,
  onReorderCategory,
  onArchiveCategory,
  onCreateChannel,
  onUpdateChannel,
  onArchiveChannel,
  onCreateRoom,
  onReorderRoom,
  onUpdateRoom,
  onArchiveRoom,
  onCreateRole,
  onUpdateRole,
  onArchiveRole,
  onAssignMemberRoles,
  onApproveJoinRequest,
  onBanMember,
  onDenyJoinRequest,
  onDisableInvite,
  onModerateMember,
  onRemoveInvite,
  onCreateInvite,
  onCreateBotInvite,
  onRemoveBot,
  onRotateBotDevice,
  onSetBotChannelAccess,
  onSetMemberBlock,
  onSetMemberIgnore,
  onSetMemberNickname,
  onSetMemberNote,
  canReport = false,
  onReportMember,
  onGetStatus,
  onClearTimeout,
  onClearQuarantine,
  onActiveRules,
  onPublishRules,
  onAcceptRules,
  onReportInbox,
  onResolveReport,
  onAuditQuery,
  onActiveAutoMod,
  onPublishAutoMod,
  onOverrideAutoMod,
  onRedactAutoMod,
  onQuarantineAutoMod,
  onEvaluateAutoMod,
  canModerateSafety = false,
  onTimeoutMember,
  onQuarantineMember,
  onSetSlowmode,
  onUnbanMember,
  onUpdateVoicePreferences,
  onScheduleEvent,
  onCreatePoll,
  onVotePoll,
  onClosePoll,
  onRsvpEvent,
  onReadCalendarNotification,
  communityPolls,
  communityEvents,
  communityNotifications,
  communityChannels,
  onSetChannelPolicy,
  onSetForumLayout,
  onCreateForumTag,
  onUpdateForumTag,
  onArchiveForumTag,
  roomScopeId,
  onCreateChannelKind,
  integrations
}: Props) {
  const roles = useMemo(() => {
    const byId = new Map(activeRoles(state).map((role) => [role.id, role]));
    for (const managed of managementSnapshot?.roles || []) {
      const roleId = managed.id as RoleDefinition["id"];
      if (managed.disabledAt) {
        byId.delete(roleId);
        continue;
      }
      const projected = byId.get(roleId);
      byId.set(roleId, {
        id: roleId,
        name: managed.name,
        description: managed.description || "",
        color: managed.color || projected?.color || "",
        rank: projected?.rank || 0,
        systemRole: managed.systemRole ?? projected?.systemRole ?? false,
        archivedAt: null
      });
    }
    return [...byId.values()]
      .filter((role) => !role.archivedAt)
      .sort((left, right) => (Number(right.rank) || 0) - (Number(left.rank) || 0) || left.name.localeCompare(right.name));
  }, [managementSnapshot?.roles, state]);
  const channels = useMemo(() => activeChannels(state.channels || []), [state.channels]);
  const botChannelAccessByMemberId = useMemo(() => {
    const overrides = (state as ChatState & { scopedRoles?: { overrides?: Record<string, Record<string, { level?: string }>> } }).scopedRoles?.overrides || {};
    const result: Record<string, string[]> = {};
    for (const channel of channels) {
      const members = overrides[`${channel.scopeType || "channel"}:${channel.scopeId || channel.id}`] || {};
      for (const [memberId, rule] of Object.entries(members)) {
        if (rule.level === "none") continue;
        (result[memberId] ||= []).push(String(channel.id));
      }
    }
    return result;
  }, [channels, state]);
  const rooms = useMemo(() => activeRooms(state.rooms || []), [state.rooms]);
  const scopedRulesByRoom = useMemo(() => Object.fromEntries(rooms.map((room) => {
    const scopeType = room.scopeType || "media-room";
    const scopeId = room.scopeId || room.id;
    const byRole = Object.fromEntries((managementSnapshot?.roles || []).map((role) => [
      role.id,
      role.rules.filter((rule) => (rule.scopeType === scopeType && rule.scopeId === scopeId) || (rule.scopeType === "*" && rule.scopeId === "*"))
    ]));
    return [room.id, byRole];
  })), [managementSnapshot?.roles, rooms]);
  const members = useMemo(() => {
    const visibleMembers = memberOptions(actor, state.members || {}, state.presence || {}, state, memberPreferences);
    const byMemberId = new Map(visibleMembers.map((member) => [member.id, member]));
    for (const authorityMember of managementSnapshot?.members || []) {
      const current = byMemberId.get(authorityMember.memberId);
      const customRoleIds = (current?.roleIds || []).filter((roleId) => !SYSTEM_ROLE_IDS.has(roleId));
      byMemberId.set(authorityMember.memberId, {
        id: authorityMember.memberId,
        name: current?.name || authorityMember.serviceDisplayName || authorityMember.username || authorityMember.memberId,
        kind: authorityMember.kind === "bot" ? "bot" : current?.kind,
        roleIds: [...new Set([...authorityMember.roleIds, ...customRoleIds])],
        ...(current?.baseRole ? { baseRole: current.baseRole } : {}),
        ...(current?.avatar ? { avatar: current.avatar } : {}),
        status: current?.status || authorityMember.status
      });
    }
    return [...byMemberId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [actor, managementSnapshot, memberPreferences, state]);
  const pendingAdminCount = useMemo(() => joinRequestsForState(state).filter((request) => request.status === "pending").length, [state]);
  const canManageAnything = canCreateChannels || canManageRooms || canManageRoles || canManageMembers;
  const tabs = useMemo(() => allowedTabs({
    canCreateChannels,
    canManageAnything,
    canManageMembers,
    canManageRoles,
    canManageRooms,
    includeAudio: initialTab === "audio"
  }), [canCreateChannels, canManageAnything, canManageMembers, canManageRoles, canManageRooms, initialTab]);
  const workspaceTabs = tabs.filter((item) => ["overview", "channels", "voice", "roles", "members"].includes(item.id));
  const governanceTabs = tabs.filter((item) => ["bots", "admin", "community", "integrations"].includes(item.id));
  const deviceTabs = tabs.filter((item) => item.id === "audio");
  const fallbackTab = tabs[0]?.id || "overview";
  const [tab, setTab] = useState<ManagementTab>(initialTab || fallbackTab);

  useEffect(() => {
    if (profileOnly) {
      setTab("members");
      return;
    }
    const next = initialTab && tabs.some((item) => item.id === initialTab) ? initialTab : fallbackTab;
    setTab(next);
  }, [fallbackTab, initialTab, profileOnly, tabs]);

  useEffect(() => {
    if (initialMemberId) setTab("members");
  }, [initialMemberId]);

  const activeTab = MANAGEMENT_TABS.find((item) => item.id === tab) || MANAGEMENT_TABS[0];
  const title = profileOnly ? "Member profile" : activeTab.label;
  const description = profileOnly ? "Only visible to you." : tabDescription(tab);

  return (
    <div
      {...stylex.props(shell.shroud)}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        {...stylex.props(shell.dialog, profileOnly && shell.profileDialog)}
        role="dialog"
        aria-modal="true"
        aria-label="Manage"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {!profileOnly ? (
          <aside {...stylex.props(rail.rail)} aria-label="Room settings sections">
            <div {...stylex.props(rail.head)}>
              <div {...stylex.props(rail.mark)} aria-hidden="true">
                <svg viewBox="0 0 24 18" fill="none" width={22} height={16} style={{ overflow: "visible" }}>
                  <path d="M2 9c2.5 0 2.5-6 5-6s2.5 12 5 12 2.5-6 5-6 2.5 0 5 0" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span {...stylex.props(rail.id)}>
                <strong {...stylex.props(rail.idTitle)}>{roomName}</strong>
                <small {...stylex.props(rail.idSub)}>Room settings</small>
              </span>
            </div>

            {workspaceTabs.length ? (
              <div {...stylex.props(rail.group, rail.groupFirst)}>
                <div {...stylex.props(rail.groupLabel)}>Workspace</div>
                {workspaceTabs.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    {...stylex.props(rail.item, tab === item.id && rail.itemActive)}
                  >
                    <span {...stylex.props(tab === item.id ? rail.itemIconActive : rail.itemIcon)}>
                      <Glyph size={18}>{tabIcon(item.id)}</Glyph>
                    </span>
                    <span {...stylex.props(rail.itemLabel)}>{item.label}</span>
                    {item.id === "channels" ? <small {...stylex.props(rail.itemCount)}>{channels.length}</small> : null}
                    {item.id === "voice" ? <small {...stylex.props(rail.itemCount)}>{rooms.length}</small> : null}
                    {item.id === "roles" ? <small {...stylex.props(rail.itemCount)}>{roles.length}</small> : null}
                    {item.id === "members" ? <small {...stylex.props(rail.itemCount)}>{members.length}</small> : null}
                  </button>
                ))}
              </div>
            ) : null}

            {governanceTabs.length ? (
              <div {...stylex.props(rail.group)}>
                <div {...stylex.props(rail.groupLabel)}>Governance</div>
                {governanceTabs.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-label={item.id === "admin" ? item.label : undefined}
                    onClick={() => setTab(item.id)}
                    {...stylex.props(rail.item, tab === item.id && rail.itemActive)}
                  >
                    <span {...stylex.props(tab === item.id ? rail.itemIconActive : rail.itemIcon)}>
                      <Glyph size={18}>{tabIcon(item.id)}</Glyph>
                    </span>
                    <span {...stylex.props(rail.itemLabel)}>{item.label}</span>
                    {item.id === "admin" && pendingAdminCount > 0 ? <small {...stylex.props(rail.itemCount)}>{pendingAdminCount}</small> : null}
                    {item.id === "bots" ? <small {...stylex.props(rail.itemCount)}>{managementSnapshot?.members.filter((member) => member.kind === "bot").length || 0}</small> : null}
                  </button>
                ))}
              </div>
            ) : null}

            {deviceTabs.length ? (
              <div {...stylex.props(rail.group)}>
                <div {...stylex.props(rail.groupLabel)}>Device</div>
                {deviceTabs.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    {...stylex.props(rail.item, tab === item.id && rail.itemActive)}
                  >
                    <span {...stylex.props(tab === item.id ? rail.itemIconActive : rail.itemIcon)}>
                      <Glyph size={18}>{tabIcon(item.id)}</Glyph>
                    </span>
                    <span {...stylex.props(rail.itemLabel)}>{item.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </aside>
        ) : null}

        <section {...stylex.props(content.content)}>
          <header {...stylex.props(content.head)}>
            <span {...stylex.props(content.title)}>
              <h2 {...stylex.props(content.h2)}>{title}</h2>
              <small {...stylex.props(content.desc)}>{description}</small>
            </span>
            <button
              type="button"
              aria-label="Close management"
              onClick={onClose}
              {...stylex.props(content.close)}
            >
              <Glyph size={16}><><path d="M6 6 18 18" /><path d="M18 6 6 18" /></></Glyph>
            </button>
          </header>

          <div {...stylex.props(content.body)}>
            {tab === "overview" ? (
              <ManageOverviewTab
                actor={actor}
                state={state}
                roomName={roomName}
                channelCount={channels.length}
                memberCount={members.length}
                roleCount={roles.length}
                roomCount={rooms.length}
                pendingAdminCount={pendingAdminCount}
                onSelectTab={setTab}
              />
            ) : null}
            {tab === "channels" ? (
              <ManageChannelsTab
                initialChannelId={initialChannelId}
                canCreateChannels={canCreateChannels}
                canManageCategories={canManageRoles}
                accessScopes={state.access?.scopes}
                categories={(state.categories || []).filter((category) => !category.archivedAt)}
                channels={channels}
                onArchiveCategory={onArchiveCategory}
                onArchiveChannel={onArchiveChannel}
                onCreateCategory={onCreateCategory}
                onCreateChannel={onCreateChannel}
                onReorderCategory={onReorderCategory}
                onUpdateCategory={onUpdateCategory}
                onUpdateChannel={onUpdateChannel}
              />
            ) : null}
            {tab === "voice" ? (
              <ManageVoiceTab
                initialRoomId={initialRoomId}
                canManageRooms={canManageRooms}
                roles={roles}
                categories={(state.categories || []).filter((category) => !category.archivedAt)}
                placements={state.voiceRoomPlacements || []}
                rooms={rooms}
                permissionActions={managementSnapshot?.actions}
                permissionScopes={managementSnapshot?.scopes}
                scopedRulesByRoom={scopedRulesByRoom}
                onScopedRulesChange={(roomId, roleId, nextRules: RoleRule[]) => {
                  const room = rooms.find((item) => item.id === roomId);
                  const role = managementSnapshot?.roles.find((item) => item.id === roleId);
                  if (!room || !role) return;
                  const scopeType = room.scopeType || "media-room";
                  const scopeId = room.scopeId || room.id;
                  const editedKeys = new Set(nextRules.map((rule) => `${rule.scopeType}\u0000${rule.scopeId}`));
                  const rules = role.rules.filter((rule) => {
                    const exactRoomScope = rule.scopeType === scopeType && rule.scopeId === scopeId;
                    const edited = editedKeys.has(`${rule.scopeType}\u0000${rule.scopeId}`);
                    return !exactRoomScope && !edited;
                  });
                  onUpdateRole(roleId, { rules: [...rules, ...nextRules] });
                }}
                onArchiveRoom={onArchiveRoom}
                onCreateRoom={onCreateRoom}
                onReorderRoom={onReorderRoom}
                onUpdateRoom={onUpdateRoom}
              />
            ) : null}
            {tab === "roles" ? (
              <ManageRolesTab
                canManageRoles={canManageRoles}
                roles={roles}
                managementRoles={managementSnapshot?.roles}
                permissionActions={managementSnapshot?.actions}
                permissionScopes={managementSnapshot?.scopes}
                onArchiveRole={onArchiveRole}
                onCreateRole={onCreateRole}
                onUpdateRole={onUpdateRole}
              />
            ) : null}
            {tab === "bots" ? (
              <ManageBotsTab
                managementSnapshot={managementSnapshot}
                channels={channels.map((channel) => ({ id: String(channel.id), name: channel.name }))}
                channelAccessByMemberId={botChannelAccessByMemberId}
                healthByMemberId={Object.fromEntries(Object.entries(state.presence || {}).map(([memberId, presence]) => [memberId, presence.serviceHealth ? { ...presence.serviceHealth, status: presence.status, visible: presence.visible } : undefined]))}
                onCreateInvite={onCreateBotInvite || (async () => { throw new Error("Bot invite management is unavailable."); })}
                onRemove={onRemoveBot || (async () => { throw new Error("Bot membership management is unavailable."); })}
                onRotate={onRotateBotDevice || (async () => { throw new Error("Bot device rotation is unavailable."); })}
                onSetChannelAccess={onSetBotChannelAccess || (async () => { throw new Error("Bot channel access management is unavailable."); })}
              />
            ) : null}
            {tab === "members" ? (
              <ManageMembersTab
                canManageRoles={canManageRoles}
                initialMemberId={initialMemberId}
                memberPreferences={memberPreferences}
                members={members}
                profileOnly={profileOnly}
                roleDefinitions={state.roleDefinitions}
                roles={roles}
                managementRoles={managementSnapshot?.roles}
                managementScopes={managementSnapshot?.scopes}
                onAssignMemberRoles={onAssignMemberRoles}
                onSetMemberBlock={onSetMemberBlock}
                onSetMemberIgnore={onSetMemberIgnore}
                onSetMemberNickname={onSetMemberNickname}
                onSetMemberNote={onSetMemberNote}
                canReport={canReport}
                onReportMember={onReportMember}
                onGetStatus={onGetStatus}
                onClearTimeout={onClearTimeout}
                onClearQuarantine={onClearQuarantine}
                onActiveRules={onActiveRules}
                onAcceptRules={onAcceptRules}
                onAuditQuery={onAuditQuery}
              />
            ) : null}
            {tab === "admin" ? (
              <ManageAdminTab
                actor={actor}
                canManageMembers={canManageMembers}
                managementSnapshot={managementSnapshot}
                state={state}
                onApproveJoinRequest={onApproveJoinRequest}
                onBanMember={onBanMember}
                onDenyJoinRequest={onDenyJoinRequest}
                onDisableInvite={onDisableInvite}
                onModerateMember={onModerateMember}
                onRemoveInvite={onRemoveInvite}
                onCreateInvite={onCreateInvite}
                onUnbanMember={onUnbanMember}
                canModerateSafety={canModerateSafety}
                canReport={canReport}
                onTimeoutMember={onTimeoutMember}
                onQuarantineMember={onQuarantineMember}
                onSetSlowmode={onSetSlowmode}
                onReportMember={onReportMember}
                onGetStatus={onGetStatus}
                onClearTimeout={onClearTimeout}
                onClearQuarantine={onClearQuarantine}
                onActiveRules={onActiveRules}
                onPublishRules={onPublishRules}
                onAcceptRules={onAcceptRules}
                onReportInbox={onReportInbox}
                onResolveReport={onResolveReport}
                onAuditQuery={onAuditQuery}
                onActiveAutoMod={onActiveAutoMod}
                onPublishAutoMod={onPublishAutoMod}
                onOverrideAutoMod={onOverrideAutoMod}
                onRedactAutoMod={onRedactAutoMod}
                onQuarantineAutoMod={onQuarantineAutoMod}
                onEvaluateAutoMod={onEvaluateAutoMod}
              />
            ) : null}
            {tab === "community" && onScheduleEvent ? (
              <ManageCommunityTab
                channelId={state.channels.find((channel) => !channel.archivedAt)?.id || "general"}
                state={state}
                canModerate={canManageMembers}
                onScheduleEvent={onScheduleEvent}
                onCreatePoll={onCreatePoll}
                onVotePoll={onVotePoll}
                onClosePoll={onClosePoll}
                onRsvpEvent={onRsvpEvent}
                onReadNotification={onReadCalendarNotification}
                polls={communityPolls}
                events={communityEvents}
                notifications={communityNotifications}
                channels={communityChannels}
                onSetChannelPolicy={onSetChannelPolicy}
                onSetForumLayout={onSetForumLayout}
                onCreateForumTag={onCreateForumTag}
                onUpdateForumTag={onUpdateForumTag}
                onArchiveForumTag={onArchiveForumTag}
                roomScopeId={roomScopeId}
                onCreateChannelKind={onCreateChannelKind}
              />
            ) : null}
            {tab === "integrations" ? <ManageIntegrationsTab controller={integrations} canManage={canManageMembers} /> : null}
            {tab === "audio" ? (
              <VoiceSettingsPanel mediaDeviceController={mediaDeviceController} preferences={voicePreferences} onChange={onUpdateVoicePreferences} />
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
