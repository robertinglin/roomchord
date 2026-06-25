import React, { useState } from "react";
import { optionalChannelGroup } from "@entities/chat/model/channelGroups";
import { roomAccessSummary } from "@entities/chat/model/roles";
import type { MediaRoom, RoleDefinition, RoomRoleAccess } from "@entities/chat/model/types";
import { RoleAccessEditor } from "@features/management/ui/manage/RoleFields";
import type { RoomSettings } from "@entities/chat/model/managementTypes";
import { Glyph } from "@shared/ui/design";
import { Switch } from "@features/management/ui/Controls";
import { panel, field, button, row, option, layout, misc, section as sectionStyle } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

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
    <div {...stylex.props(layout.section)}>
      {canManageRooms ? (
        <form {...stylex.props(panel.panel)} onSubmit={createRoom}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>New voice channel</h3>
          </header>
          <div {...stylex.props(panel.body)}>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Voice channel name</span>
              <input className="etch" aria-label="Voice channel name" value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Design review" {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Group</span>
              <input className="etch" aria-label="Voice channel group" value={roomGroup} onChange={(event) => setRoomGroup(event.target.value)} placeholder="General" {...stylex.props(field.input)} />
            </label>
            <div {...stylex.props(option.opt, option.optFirst)}>
              <span {...stylex.props(option.optMain)}>
                <span {...stylex.props(option.optTitle)}>Allow camera</span>
                <span {...stylex.props(option.optDesc)}>Members may share video in this channel.</span>
              </span>
              <span {...stylex.props(option.optEnd)}>
                <Switch checked={roomAllowsVideo} onChange={setRoomAllowsVideo} aria-label="Allow camera" />
              </span>
            </div>
            <p {...stylex.props(field.label, sectionStyle.labelFirst)}>Role visibility</p>
            <RoleAccessEditor roles={roles} value={roomRoleAccess} onChange={setRoomRoleAccess} />
            <div {...stylex.props(button.actions, button.actionsEnd)}>
              <button type="submit" disabled={!roomName.trim()} {...stylex.props(button.btn, button.primary)}>
                <Glyph size={15}><><path d="M12 5v14M5 12h14" /></></Glyph>
                Create voice channel
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Voice channels</h3>
          <span {...stylex.props(panel.meta)}>{rooms.length} channel{rooms.length === 1 ? "" : "s"}</span>
        </header>
        {rooms.length ? (
          <div {...stylex.props(panel.bodyFlush)}>
            <div {...stylex.props(layout.rowStack)}>
              {rooms.map((room) => (
                <div {...stylex.props(row.row)} key={room.id}>
                  <span {...stylex.props(row.rowMain)}>
                    <span {...stylex.props(row.rowTitle)}>{room.name}</span>
                    <span {...stylex.props(row.rowSub)}>{[room.group || "General", roomAccessSummary(room, roles)].join(" · ")}</span>
                  </span>
                  <span {...stylex.props(row.rowEnd)}>
                    <button type="button" className="btn ghost" onClick={() => openRoomEditor(room)} {...stylex.props(button.btn, button.ghost, button.sm)}>Manage</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No voice channels yet. Create one above — visibility per role is set at creation.</p></div>
        )}
      </section>

      {editingRoom ? (
        <form {...stylex.props(panel.panel)} onSubmit={saveRoom}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>{editingRoom.name}</h3>
          </header>
          <div {...stylex.props(panel.body)}>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Voice channel name</span>
              <input aria-label="Manage voice channel name" value={editRoomName} onChange={(event) => setEditRoomName(event.target.value)} {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Group</span>
              <input aria-label="Manage voice channel group" value={editRoomGroup} onChange={(event) => setEditRoomGroup(event.target.value)} {...stylex.props(field.input)} />
            </label>
            <div {...stylex.props(option.opt, option.optFirst)}>
              <span {...stylex.props(option.optMain)}>
                <span {...stylex.props(option.optTitle)}>Allow camera</span>
                <span {...stylex.props(option.optDesc)}>Members may share video in this channel.</span>
              </span>
              <span {...stylex.props(option.optEnd)}>
                <Switch checked={editRoomAllowsVideo} onChange={setEditRoomAllowsVideo} aria-label="Manage allow camera" />
              </span>
            </div>
            <div {...stylex.props(option.opt, option.optDivider, option.optLast)}>
              <span {...stylex.props(option.optMain)}>
                <span {...stylex.props(option.optTitle)}>Lock voice channel</span>
                <span {...stylex.props(option.optDesc)}>Prevent members from joining until it is unlocked.</span>
              </span>
              <span {...stylex.props(option.optEnd)}>
                <Switch checked={editRoomLocked} onChange={setEditRoomLocked} aria-label="Lock voice channel" />
              </span>
            </div>
            <p {...stylex.props(field.label, sectionStyle.labelFirst)}>Role visibility</p>
            <RoleAccessEditor roles={roles} value={editRoomRoleAccess} onChange={setEditRoomRoleAccess} />
            <div {...stylex.props(button.actions)}>
              <button type="submit" disabled={!editRoomName.trim()} {...stylex.props(button.btn, button.primary)}>Save voice settings</button>
              <button type="button" onClick={() => setEditingRoomId(undefined)} {...stylex.props(button.btn, button.ghost)}>Cancel</button>
            </div>
            <button
              type="button"
              onClick={() => { onArchiveRoom(editingRoom.id); setEditingRoomId(undefined); }}
              {...stylex.props(button.btn, button.danger, button.sm, button.fullWidth)}
            >
              Archive voice channel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
