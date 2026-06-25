import React, { useEffect, useMemo, useState } from "react";
import type { Actor, Channel, ChatState, MediaRoom } from "@entities/chat/model/types";
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
import { VoiceSettingsPanel } from "@entities/chat/ui/VoiceSettingsPanel";
import { MANAGEMENT_TABS, type ManagementTab, type RoleInput, type RoleUpdateInput, type RoomSettings } from "@entities/chat/model/managementTypes";
import { shell, rail, content } from "@features/management/ui/manage.styles";
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
  initialTab?: ManagementTab;
  initialMemberId?: string;
  voicePreferences: VoicePreferences;
  onClose: () => void;
  onCreateChannel: (input: { name: string; topic?: string; group?: string }) => void;
  onUpdateChannel: (id: string, input: { name?: string; topic?: string | null; group?: string | null }) => void;
  onArchiveChannel: (id: string) => void;
  onCreateRoom: (input: { name: string; group?: string; allowsVideo: boolean; roleAccess?: RoomSettings["roleAccess"] }) => void;
  onUpdateRoom: (roomId: string, settings: RoomSettings) => void;
  onArchiveRoom: (roomId: string) => void;
  onCreateRole: (input: RoleInput) => void;
  onUpdateRole: (roleId: string, input: RoleUpdateInput) => void;
  onArchiveRole: (roleId: string) => void;
  onAssignMemberRoles: (memberId: string, roleIds: string[], displayName?: string) => void;
  onApproveJoinRequest: (requestId: string) => void;
  onBanMember: (memberId: string) => void;
  onDenyJoinRequest: (requestId: string) => void;
  onDisableInvite: (inviteId: string) => void;
  onModerateMember: (memberId: string, input: { chatDisabled?: boolean; nameLocked?: boolean }) => void;
  onRemoveInvite: (inviteId: string) => void;
  onUnbanMember: (memberId: string) => void;
  onUpdateVoicePreferences: (preferences: VoicePreferences) => void;
};

const ROOM_TABS = MANAGEMENT_TABS.filter((item) => item.id !== "audio");
const DEVICE_TABS = MANAGEMENT_TABS.filter((item) => item.id === "audio");

function activeChannels(channels: Channel[]) {
  return channels.filter((channel) => !channel.archivedAt);
}

function activeRooms(rooms: MediaRoom[]) {
  return rooms.filter((room) => !room.archivedAt);
}

function tabDescription(tab: ManagementTab) {
  if (tab === "channels") return "Create text channels and manage existing ones.";
  if (tab === "voice") return "Create voice rooms and set who can see them.";
  if (tab === "roles") return "Define role tags, their colour, and their permissions.";
  if (tab === "members") return "Manage the roster, role tags, invites, and join requests.";
  if (tab === "admin") return "Room-level access, invites, moderation, and join requests.";
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
  initialTab,
  initialMemberId,
  voicePreferences,
  onClose,
  onCreateChannel,
  onUpdateChannel,
  onArchiveChannel,
  onCreateRoom,
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
  onUnbanMember,
  onUpdateVoicePreferences
}: Props) {
  const roles = useMemo(() => activeRoles(state), [state]);
  const channels = useMemo(() => activeChannels(state.channels || []), [state.channels]);
  const rooms = useMemo(() => activeRooms(state.rooms || []), [state.rooms]);
  const members = useMemo(() => memberOptions(actor, state.members || {}, state.presence || {}, state), [actor, state]);
  const pendingAdminCount = useMemo(() => joinRequestsForState(state).filter((request) => request.status === "pending").length, [state]);
  const [tab, setTab] = useState<ManagementTab>(initialTab || "overview");

  useEffect(() => {
    setTab(initialTab || "overview");
  }, [initialTab]);

  useEffect(() => {
    if (initialMemberId) setTab("members");
  }, [initialMemberId]);

  const activeTab = MANAGEMENT_TABS.find((item) => item.id === tab) || MANAGEMENT_TABS[0];

  return (
    <div
      {...stylex.props(shell.shroud)}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        {...stylex.props(shell.dialog)}
        role="dialog"
        aria-modal="true"
        aria-label="Manage"
        onMouseDown={(event) => event.stopPropagation()}
      >
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

          <div {...stylex.props(rail.group, rail.groupFirst)}>
            <div {...stylex.props(rail.groupLabel)}>Room</div>
            {ROOM_TABS.map((item) => (
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

          <div {...stylex.props(rail.group)}>
            <div {...stylex.props(rail.groupLabel)}>Device</div>
            {DEVICE_TABS.map((item) => (
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
        </aside>

        <section {...stylex.props(content.content)}>
          <header {...stylex.props(content.head)}>
            <span {...stylex.props(content.title)}>
              <h2 {...stylex.props(content.h2)}>{activeTab.label}</h2>
              <small {...stylex.props(content.desc)}>{tabDescription(tab)}</small>
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
                canCreateChannels={canCreateChannels}
                channels={channels}
                onArchiveChannel={onArchiveChannel}
                onCreateChannel={onCreateChannel}
                onUpdateChannel={onUpdateChannel}
              />
            ) : null}
            {tab === "voice" ? (
              <ManageVoiceTab
                canManageRooms={canManageRooms}
                roles={roles}
                rooms={rooms}
                onArchiveRoom={onArchiveRoom}
                onCreateRoom={onCreateRoom}
                onUpdateRoom={onUpdateRoom}
              />
            ) : null}
            {tab === "roles" ? (
              <ManageRolesTab
                canManageRoles={canManageRoles}
                roles={roles}
                onArchiveRole={onArchiveRole}
                onCreateRole={onCreateRole}
                onUpdateRole={onUpdateRole}
              />
            ) : null}
            {tab === "members" ? (
              <ManageMembersTab
                canManageRoles={canManageRoles}
                initialMemberId={initialMemberId}
                members={members}
                roleDefinitions={state.roleDefinitions}
                roles={roles}
                onAssignMemberRoles={onAssignMemberRoles}
              />
            ) : null}
            {tab === "admin" ? (
              <ManageAdminTab
                actor={actor}
                canManageMembers={canManageMembers}
                state={state}
                onApproveJoinRequest={onApproveJoinRequest}
                onBanMember={onBanMember}
                onDenyJoinRequest={onDenyJoinRequest}
                onDisableInvite={onDisableInvite}
                onModerateMember={onModerateMember}
                onRemoveInvite={onRemoveInvite}
                onUnbanMember={onUnbanMember}
              />
            ) : null}
            {tab === "audio" ? (
              <VoiceSettingsPanel preferences={voicePreferences} onChange={onUpdateVoicePreferences} />
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
