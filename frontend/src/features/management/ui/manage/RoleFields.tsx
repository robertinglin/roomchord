import React from "react";
import type { RoleDefinition, RoleId, RoomRoleAccess, RoomRoleAccessLevel } from "@entities/chat/model/types";

function roomAccessValue(roleAccess: RoomRoleAccess | undefined, roleId: string): RoomRoleAccessLevel {
  return roleAccess?.[roleId as RoleId] || "hidden";
}

function setRoleAccessValue(roleAccess: RoomRoleAccess, roleId: string, level: RoomRoleAccessLevel) {
  const next = { ...roleAccess };
  if (level === "hidden") delete next[roleId as RoleId];
  else next[roleId as RoleId] = level;
  return next;
}

export function RoleAccessEditor({
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

export function RoleCheckboxes({
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
