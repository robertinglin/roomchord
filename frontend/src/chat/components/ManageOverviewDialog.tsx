import React, { useEffect, useMemo, useState } from "react";
import type { Actor, Channel, ChatState, MediaRoom } from "../types";
import { activeRoles, memberOptions } from "../roles";
import { CloseIcon } from "./Icons";
import { ManageChannelsTab } from "./manage/ManageChannelsTab";
import { ManageMembersTab } from "./manage/ManageMembersTab";
import { ManageOverviewTab } from "./manage/ManageOverviewTab";
import { ManageRolesTab } from "./manage/ManageRolesTab";
import { ManageVoiceTab } from "./manage/ManageVoiceTab";
import { MANAGEMENT_TABS, type ManagementTab, type RoleInput, type RoleUpdateInput, type RoomSettings } from "./manage/types";

export type { ManagementTab };

type Props = {
  actor: Actor;
  state: ChatState;
  canCreateChannels: boolean;
  canManageRooms: boolean;
  canManageRoles: boolean;
  initialTab?: ManagementTab;
  initialMemberId?: string;
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
};

function activeChannels(channels: Channel[]) {
  return channels.filter((channel) => !channel.archivedAt);
}

function activeRooms(rooms: MediaRoom[]) {
  return rooms.filter((room) => !room.archivedAt);
}

export function ManageOverviewDialog({
  actor,
  state,
  canCreateChannels,
  canManageRooms,
  canManageRoles,
  initialTab,
  initialMemberId,
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
  onAssignMemberRoles
}: Props) {
  const roles = useMemo(() => activeRoles(state.roleDefinitions), [state.roleDefinitions]);
  const channels = useMemo(() => activeChannels(state.channels || []), [state.channels]);
  const rooms = useMemo(() => activeRooms(state.rooms || []), [state.rooms]);
  const members = useMemo(() => memberOptions(actor, state.members || {}, state.presence || {}, state.memberRoles), [actor, state.memberRoles, state.members, state.presence]);
  const [tab, setTab] = useState<ManagementTab>(initialTab || "overview");

  useEffect(() => {
    setTab(initialTab || "overview");
  }, [initialTab]);

  useEffect(() => {
    if (initialMemberId) setTab("members");
  }, [initialMemberId]);

  return (
    <div className="manage-dialog-shroud" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="manage-dialog" role="dialog" aria-modal="true" aria-labelledby="manage-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="manage-dialog-header">
          <span>
            <h2 id="manage-dialog-title">Manage</h2>
            <small>{state.channels.length} channels, {rooms.length} voice channels, {roles.length} roles</small>
          </span>
          <button className="embed-icon-button" type="button" aria-label="Close management" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <nav className="manage-tabs" aria-label="Management sections">
          {MANAGEMENT_TABS.map((item) => (
            <button className={tab === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="manage-dialog-body">
          {tab === "overview" ? (
            <ManageOverviewTab
              channelCount={channels.length}
              memberCount={members.length}
              roleCount={roles.length}
              roomCount={rooms.length}
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
        </div>
      </section>
    </div>
  );
}
