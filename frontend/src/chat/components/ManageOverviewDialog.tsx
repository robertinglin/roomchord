import React, { useEffect, useMemo, useState } from "react";
import type { Actor, Channel, ChatState, MediaRoom, RoleDefinition, RoomRoleAccess, RoomRoleAccessLevel } from "../types";
import { optionalChannelGroup } from "../channelGroups";
import { activeRoles, cleanRoleId, memberOptions, roleNames, roomAccessSummary } from "../roles";
import { CloseIcon } from "./Icons";

export type ManagementTab = "overview" | "channels" | "voice" | "roles" | "members";

type RoleInput = { roleId: string; name: string; description?: string; color?: string };
type RoleUpdateInput = { name?: string; description?: string; color?: string };
type RoomSettings = { name?: string; group?: string | null; allowsVideo?: boolean; locked?: boolean; roleAccess?: RoomRoleAccess };

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
  onCreateRoom: (input: { name: string; group?: string; allowsVideo: boolean; roleAccess?: RoomRoleAccess }) => void;
  onUpdateRoom: (roomId: string, settings: RoomSettings) => void;
  onArchiveRoom: (roomId: string) => void;
  onCreateRole: (input: RoleInput) => void;
  onUpdateRole: (roleId: string, input: RoleUpdateInput) => void;
  onArchiveRole: (roleId: string) => void;
  onAssignMemberRoles: (memberId: string, roleIds: string[], displayName?: string) => void;
};

const TABS: Array<{ id: ManagementTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "channels", label: "Channels" },
  { id: "voice", label: "Voice" },
  { id: "roles", label: "Roles" },
  { id: "members", label: "Members" }
];

function roomAccessValue(roleAccess: RoomRoleAccess | undefined, roleId: string): RoomRoleAccessLevel {
  return roleAccess?.[roleId] || "hidden";
}

function setRoleAccessValue(roleAccess: RoomRoleAccess, roleId: string, level: RoomRoleAccessLevel) {
  const next = { ...roleAccess };
  if (level === "hidden") delete next[roleId];
  else next[roleId] = level;
  return next;
}

function activeChannels(channels: Channel[]) {
  return channels.filter((channel) => !channel.archivedAt);
}

function activeRooms(rooms: MediaRoom[]) {
  return rooms.filter((room) => !room.archivedAt);
}

function roleIdForNewRole(name: string, roles: RoleDefinition[]) {
  const baseRoleId = cleanRoleId(name);
  return roles.some((role) => role.id === baseRoleId) ? `${baseRoleId}-${roles.length + 1}` : baseRoleId;
}

function RoleAccessEditor({
  roles,
  value,
  onChange
}: {
  roles: RoleDefinition[];
  value: RoomRoleAccess;
  onChange: (value: RoomRoleAccess) => void;
}) {
  return (
    <div className="room-access-grid" aria-label="Voice channel role access">
      {roles.map((role) => (
        <label className="room-access-row" key={role.id}>
          <span>
            <span className="role-dot" style={role.color ? { background: role.color } : undefined} aria-hidden="true" />
            <strong>{role.name}</strong>
          </span>
          <select
            aria-label={`${role.name} voice channel access`}
            value={roomAccessValue(value, role.id)}
            onChange={(event) => onChange(setRoleAccessValue(value, role.id, event.target.value as RoomRoleAccessLevel))}
          >
            <option value="hidden">Hidden</option>
            <option value="readonly">Read only</option>
            <option value="editor">Can join</option>
          </select>
        </label>
      ))}
    </div>
  );
}

function RoleCheckboxes({
  roles,
  selectedRoleIds,
  onChange
}: {
  roles: RoleDefinition[];
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
}) {
  const selected = new Set(selectedRoleIds);
  return (
    <div className="role-checkbox-grid">
      {roles.map((role) => (
        <label className="role-checkbox" key={role.id}>
          <input
            type="checkbox"
            checked={selected.has(role.id)}
            onChange={(event) => {
              const next = new Set(selected);
              if (event.target.checked) next.add(role.id);
              else next.delete(role.id);
              onChange([...next]);
            }}
          />
          <span className="role-dot" style={role.color ? { background: role.color } : undefined} aria-hidden="true" />
          <span>{role.name}</span>
        </label>
      ))}
    </div>
  );
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

  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelGroup, setChannelGroup] = useState("");
  const [editingChannelId, setEditingChannelId] = useState<string | undefined>();
  const [editChannelName, setEditChannelName] = useState("");
  const [editChannelTopic, setEditChannelTopic] = useState("");
  const [editChannelGroup, setEditChannelGroup] = useState("");

  const [roomName, setRoomName] = useState("");
  const [roomGroup, setRoomGroup] = useState("");
  const [roomAllowsVideo, setRoomAllowsVideo] = useState(true);
  const [roomRoleAccess, setRoomRoleAccess] = useState<RoomRoleAccess>({});
  const [editingRoomId, setEditingRoomId] = useState<string | undefined>();
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomGroup, setEditRoomGroup] = useState("");
  const [editRoomAllowsVideo, setEditRoomAllowsVideo] = useState(true);
  const [editRoomLocked, setEditRoomLocked] = useState(false);
  const [editRoomRoleAccess, setEditRoomRoleAccess] = useState<RoomRoleAccess>({});

  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleColor, setRoleColor] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | undefined>();
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [editRoleColor, setEditRoleColor] = useState("");

  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(initialMemberId);
  const selectedMember = members.find((member) => member.id === selectedMemberId) || members[0];
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(selectedMember?.roleIds || []);

  useEffect(() => {
    setTab(initialTab || "overview");
  }, [initialTab]);

  useEffect(() => {
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
      setTab("members");
    }
  }, [initialMemberId]);

  useEffect(() => {
    if (!selectedMember) return;
    setSelectedRoleIds(selectedMember.roleIds);
  }, [selectedMember?.id, selectedMember?.roleIds.join("|")]);

  function createChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = channelName.trim().replace(/^#/, "");
    if (!cleanName) return;
    onCreateChannel({ name: cleanName, topic: channelTopic.trim() || undefined, group: optionalChannelGroup(channelGroup) });
    setChannelName("");
    setChannelTopic("");
    setChannelGroup("");
  }

  function openChannelEditor(channel: Channel) {
    setEditingChannelId(channel.id);
    setEditChannelName(channel.name);
    setEditChannelTopic(channel.topic || "");
    setEditChannelGroup(channel.group || "");
  }

  function saveChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingChannelId) return;
    const cleanName = editChannelName.trim().replace(/^#/, "");
    if (!cleanName) return;
    onUpdateChannel(editingChannelId, { name: cleanName, topic: editChannelTopic.trim(), group: optionalChannelGroup(editChannelGroup) || null });
    setEditingChannelId(undefined);
  }

  function createRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomName.trim()) return;
    onCreateRoom({ name: roomName.trim(), group: optionalChannelGroup(roomGroup), allowsVideo: roomAllowsVideo, roleAccess: roomRoleAccess });
    setRoomName("");
    setRoomGroup("");
    setRoomAllowsVideo(true);
    setRoomRoleAccess({});
  }

  function openRoomEditor(room: MediaRoom) {
    setEditingRoomId(room.id);
    setEditRoomName(room.name);
    setEditRoomGroup(room.group || "");
    setEditRoomAllowsVideo(room.allowsVideo !== false);
    setEditRoomLocked(Boolean(room.locked));
    setEditRoomRoleAccess({ ...(room.roleAccess || {}) });
  }

  function saveRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRoomId || !editRoomName.trim()) return;
    onUpdateRoom(editingRoomId, { name: editRoomName.trim(), group: optionalChannelGroup(editRoomGroup) || null, allowsVideo: editRoomAllowsVideo, locked: editRoomLocked, roleAccess: editRoomRoleAccess });
    setEditingRoomId(undefined);
  }

  function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = roleName.trim();
    if (!cleanName) return;
    onCreateRole({ roleId: roleIdForNewRole(cleanName, roles), name: cleanName, description: roleDescription.trim() || undefined, color: roleColor.trim() || undefined });
    setRoleName("");
    setRoleDescription("");
    setRoleColor("");
  }

  function openRoleEditor(role: RoleDefinition) {
    setEditingRoleId(role.id);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description || "");
    setEditRoleColor(role.color || "");
  }

  function saveRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRoleId || !editRoleName.trim()) return;
    onUpdateRole(editingRoleId, { name: editRoleName.trim(), description: editRoleDescription.trim(), color: editRoleColor.trim() });
    setEditingRoleId(undefined);
  }

  function saveMemberRoles(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    onAssignMemberRoles(selectedMember.id, selectedRoleIds, selectedMember.name);
  }

  const editingChannel = editingChannelId ? channels.find((channel) => channel.id === editingChannelId) : undefined;
  const editingRoom = editingRoomId ? rooms.find((room) => room.id === editingRoomId) : undefined;
  const editingRole = editingRoleId ? roles.find((role) => role.id === editingRoleId) : undefined;

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
          {TABS.map((item) => (
            <button className={tab === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="manage-dialog-body">
          {tab === "overview" ? (
            <div className="manage-overview-grid">
              <button type="button" className="manage-overview-item" onClick={() => setTab("channels")}>
                <strong>{channels.length}</strong>
                <span>Active channels</span>
              </button>
              <button type="button" className="manage-overview-item" onClick={() => setTab("voice")}>
                <strong>{rooms.length}</strong>
                <span>Voice channels</span>
              </button>
              <button type="button" className="manage-overview-item" onClick={() => setTab("roles")}>
                <strong>{roles.length}</strong>
                <span>Role tags</span>
              </button>
              <button type="button" className="manage-overview-item" onClick={() => setTab("members")}>
                <strong>{members.length}</strong>
                <span>Members</span>
              </button>
            </div>
          ) : null}

          {tab === "channels" ? (
            <div className="manage-section">
              {canCreateChannels ? (
                <form className="manage-form-grid" onSubmit={createChannel}>
                  <label>
                    <span>New channel</span>
                    <input aria-label="Channel name" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="channel-name" />
                  </label>
                  <label>
                    <span>Topic</span>
                    <input aria-label="Channel topic" value={channelTopic} onChange={(event) => setChannelTopic(event.target.value)} placeholder="Optional topic" />
                  </label>
                  <label>
                    <span>Group</span>
                    <input aria-label="Channel group" value={channelGroup} onChange={(event) => setChannelGroup(event.target.value)} placeholder="General" />
                  </label>
                  <button className="primary-action" type="submit" disabled={!channelName.trim()}>
                    Create channel
                  </button>
                </form>
              ) : null}
              <div className="manage-list">
                {channels.map((channel) => (
                  <article className="manage-list-row" key={channel.id}>
                    <span>
                      <strong>#{channel.name}</strong>
                      <small>{[channel.group || "General", channel.topic || "No topic"].join(" · ")}</small>
                    </span>
                    <button className="secondary-action" type="button" onClick={() => openChannelEditor(channel)}>Manage</button>
                  </article>
                ))}
              </div>
              {editingChannel ? (
                <form className="manage-editor" onSubmit={saveChannel}>
                  <h3>#{editingChannel.name}</h3>
                  <label>
                    <span>Channel name</span>
                    <input aria-label="Manage channel name" value={editChannelName} onChange={(event) => setEditChannelName(event.target.value)} />
                  </label>
                  <label>
                    <span>Topic</span>
                    <input aria-label="Manage channel topic" value={editChannelTopic} onChange={(event) => setEditChannelTopic(event.target.value)} />
                  </label>
                  <label>
                    <span>Group</span>
                    <input aria-label="Manage channel group" value={editChannelGroup} onChange={(event) => setEditChannelGroup(event.target.value)} />
                  </label>
                  <div className="form-actions two-up-actions">
                    <button className="secondary-action" type="submit" disabled={!editChannelName.trim()}>Save settings</button>
                    <button className="ghost-action" type="button" onClick={() => setEditingChannelId(undefined)}>Cancel</button>
                  </div>
                  <button className="danger-action full-width" type="button" onClick={() => { onArchiveChannel(editingChannel.id); setEditingChannelId(undefined); }}>
                    Archive channel
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {tab === "voice" ? (
            <div className="manage-section">
              {canManageRooms ? (
                <form className="manage-form-grid" onSubmit={createRoom}>
                  <label>
                    <span>New voice channel</span>
                    <input aria-label="Voice channel name" value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Design review" />
                  </label>
                  <label>
                    <span>Group</span>
                    <input aria-label="Voice channel group" value={roomGroup} onChange={(event) => setRoomGroup(event.target.value)} placeholder="General" />
                  </label>
                  <label className="checkbox-field">
                    <input aria-label="Allow camera" type="checkbox" checked={roomAllowsVideo} onChange={(event) => setRoomAllowsVideo(event.target.checked)} />
                    <span>Allow camera</span>
                  </label>
                  <RoleAccessEditor roles={roles} value={roomRoleAccess} onChange={setRoomRoleAccess} />
                  <button className="primary-action" type="submit" disabled={!roomName.trim()}>
                    Create voice channel
                  </button>
                </form>
              ) : null}
              <div className="manage-list">
                {rooms.map((room) => (
                  <article className="manage-list-row" key={room.id}>
                    <span>
                      <strong>{room.name}</strong>
                      <small>{[room.group || "General", roomAccessSummary(room, roles)].join(" · ")}</small>
                    </span>
                    <button className="secondary-action" type="button" onClick={() => openRoomEditor(room)}>Manage</button>
                  </article>
                ))}
              </div>
              {editingRoom ? (
                <form className="manage-editor" onSubmit={saveRoom}>
                  <h3>{editingRoom.name}</h3>
                  <label>
                    <span>Voice channel name</span>
                    <input aria-label="Manage voice channel name" value={editRoomName} onChange={(event) => setEditRoomName(event.target.value)} />
                  </label>
                  <label>
                    <span>Group</span>
                    <input aria-label="Manage voice channel group" value={editRoomGroup} onChange={(event) => setEditRoomGroup(event.target.value)} />
                  </label>
                  <label className="checkbox-field">
                    <input aria-label="Manage allow camera" type="checkbox" checked={editRoomAllowsVideo} onChange={(event) => setEditRoomAllowsVideo(event.target.checked)} />
                    <span>Allow camera</span>
                  </label>
                  <label className="checkbox-field">
                    <input aria-label="Lock voice channel" type="checkbox" checked={editRoomLocked} onChange={(event) => setEditRoomLocked(event.target.checked)} />
                    <span>Lock voice channel</span>
                  </label>
                  <RoleAccessEditor roles={roles} value={editRoomRoleAccess} onChange={setEditRoomRoleAccess} />
                  <div className="form-actions two-up-actions">
                    <button className="secondary-action" type="submit" disabled={!editRoomName.trim()}>Save voice settings</button>
                    <button className="ghost-action" type="button" onClick={() => setEditingRoomId(undefined)}>Cancel</button>
                  </div>
                  <button className="danger-action full-width" type="button" onClick={() => { onArchiveRoom(editingRoom.id); setEditingRoomId(undefined); }}>
                    Archive voice channel
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {tab === "roles" ? (
            <div className="manage-section">
              {canManageRoles ? (
                <form className="manage-form-grid" onSubmit={createRole}>
                  <label>
                    <span>New role tag</span>
                    <input aria-label="Role name" value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Launch Lead" />
                  </label>
                  <label>
                    <span>Description</span>
                    <input aria-label="Role description" value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} placeholder="Coordinates launch threads" />
                  </label>
                  <label>
                    <span>Color</span>
                    <input aria-label="Role color" value={roleColor} onChange={(event) => setRoleColor(event.target.value)} placeholder="#38bdf8" />
                  </label>
                  <button className="primary-action" type="submit" disabled={!roleName.trim()}>
                    Create role
                  </button>
                </form>
              ) : null}
              <div className="manage-list">
                {roles.map((role) => (
                  <article className="manage-list-row" key={role.id}>
                    <span>
                      <strong><span className="role-dot" style={role.color ? { background: role.color } : undefined} aria-hidden="true" />{role.name}</strong>
                      <small>{role.description || role.id}</small>
                    </span>
                    {canManageRoles ? <button className="secondary-action" type="button" onClick={() => openRoleEditor(role)}>Manage</button> : null}
                  </article>
                ))}
              </div>
              {editingRole && canManageRoles ? (
                <form className="manage-editor" onSubmit={saveRole}>
                  <h3>{editingRole.name}</h3>
                  <label>
                    <span>Role name</span>
                    <input aria-label="Manage role name" value={editRoleName} onChange={(event) => setEditRoleName(event.target.value)} />
                  </label>
                  <label>
                    <span>Description</span>
                    <input aria-label="Manage role description" value={editRoleDescription} onChange={(event) => setEditRoleDescription(event.target.value)} />
                  </label>
                  <label>
                    <span>Color</span>
                    <input aria-label="Manage role color" value={editRoleColor} onChange={(event) => setEditRoleColor(event.target.value)} />
                  </label>
                  <div className="form-actions two-up-actions">
                    <button className="secondary-action" type="submit" disabled={!editRoleName.trim()}>Save role</button>
                    <button className="ghost-action" type="button" onClick={() => setEditingRoleId(undefined)}>Cancel</button>
                  </div>
                  {!editingRole.systemRole ? (
                    <button className="danger-action full-width" type="button" onClick={() => { onArchiveRole(editingRole.id); setEditingRoleId(undefined); }}>
                      Archive role
                    </button>
                  ) : null}
                </form>
              ) : null}
            </div>
          ) : null}

          {tab === "members" ? (
            <div className="manage-section">
              <div className="member-role-layout">
                <div className="manage-list">
                  {members.map((member) => (
                    <button className={`member-role-picker${selectedMember?.id === member.id ? " active" : ""}`} type="button" key={member.id} onClick={() => setSelectedMemberId(member.id)}>
                      <strong>{member.name}</strong>
                      <small>{roleNames(member.roleIds, state.roleDefinitions).join(", ") || "No role tags"}</small>
                    </button>
                  ))}
                </div>
                {selectedMember ? (
                  <form className="manage-editor" onSubmit={saveMemberRoles}>
                    <h3>Role tags for {selectedMember.name}</h3>
                    <RoleCheckboxes roles={roles} selectedRoleIds={selectedRoleIds} onChange={setSelectedRoleIds} />
                    <button className="secondary-action full-width" type="submit" disabled={!canManageRoles}>
                      Save roles
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
