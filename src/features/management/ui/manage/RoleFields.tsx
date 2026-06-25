import React from "react";
import type { RoleDefinition, RoleId, RoomRoleAccess, RoomRoleAccessLevel } from "@entities/chat/model/types";
import { row, field, layout } from "@features/management/ui/manage.styles";
import { Checkbox } from "@features/management/ui/Controls";
import * as stylex from "@stylexjs/stylex";

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
    <div {...stylex.props(layout.accessGrid)} aria-label="Voice channel role access">
      {roles.map((role) => (
        <div {...stylex.props(row.row)} key={role.id}>
          <span {...stylex.props(row.rowLeadGrow)}>
            <span {...stylex.props(row.roleDot)} style={role.color ? { backgroundColor: role.color } : undefined} aria-hidden="true" />
            <span {...stylex.props(row.rowTitle)}>{role.name}</span>
          </span>
          <span {...stylex.props(row.rowEnd)}>
            <select
              aria-label={`${role.name} voice channel access`}
              value={roomAccessValue(value, role.id)}
              onChange={(event) => onChange(setRoleAccessValue(value, role.id, event.target.value as RoomRoleAccessLevel))}
              {...stylex.props(field.select)}
              style={{ width: 128 }}
            >
              <option value="hidden">Hidden</option>
              <option value="readonly">Read only</option>
              <option value="editor">Can join</option>
            </select>
          </span>
        </div>
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
    <div {...stylex.props(layout.accessGrid)}>
      {roles.map((role) => {
        const checked = selected.has(role.id);
        return (
          <div
            {...stylex.props(row.row, row.tap)}
            role="checkbox"
            aria-checked={checked}
            aria-label={`${role.name} role tag`}
            tabIndex={0}
            key={role.id}
            onClick={() => {
              const next = new Set(selected);
              if (checked) next.delete(role.id);
              else next.add(role.id);
              onChange([...next]);
            }}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                const next = new Set(selected);
                if (checked) next.delete(role.id);
                else next.add(role.id);
                onChange([...next]);
              }
            }}
          >
            <span {...stylex.props(row.rowLead)}>
              <Checkbox checked={checked} onChange={() => undefined} aria-label={`${role.name} role tag`} />
            </span>
            <span {...stylex.props(row.rowMain)}>
              <span {...stylex.props(row.rowTitle)}>
                <span {...stylex.props(row.roleDot)} style={role.color ? { backgroundColor: role.color } : undefined} aria-hidden="true" />
                {role.name}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
