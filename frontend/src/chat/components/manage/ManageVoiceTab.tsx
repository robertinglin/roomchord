import React, { useState } from "react";
import { optionalChannelGroup } from "../../channelGroups";
import { roomAccessSummary } from "../../roles";
import type { MediaRoom, RoleDefinition, RoomRoleAccess } from "../../types";
import { RoleAccessEditor } from "./RoleFields";
import type { RoomSettings } from "./types";

export function ManageVoiceTab({
  canManageRooms,
  roles,
  rooms,
  onArchiveRoom,
  onCreateRoom,
  onUpdateRoom
}: {
  canManageRooms: boolean;
  roles: RoleDefinition[];
  rooms: MediaRoom[];
  onArchiveRoom: (roomId: string) => void;
  onCreateRoom: (input: { name: string; group?: string; allowsVideo: boolean; roleAccess?: RoomRoleAccess }) => void;
  onUpdateRoom: (roomId: string, settings: RoomSettings) => void;
}) {
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
  const editingRoom = editingRoomId ? rooms.find((room) => room.id === editingRoomId) : undefined;

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

  return (
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
  );
}
