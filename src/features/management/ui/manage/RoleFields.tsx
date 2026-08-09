import React from "react";
import type { MatterhornManagementAction, MatterhornManagementScope, MatterhornRoleRule } from "matterhorn-sdk/browser";
import type { RoleDefinition, RoleId, RoomRoleAccess, RoomRoleAccessLevel } from "@entities/chat/model/types";
import { RolePermissionEditor } from "@features/management/ui/manage/RolePermissionEditor";
import { row, field, layout } from "@shared/ui/manage.styles";
import { Checkbox } from "@shared/ui/SettingsControls";
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
  onChange,
  permissionActions = [],
  permissionScopes = [],
  scopedRulesByRole,
  onScopedRulesChange,
  scopedPermissionScope
}: {
  roles: RoleDefinition[];
  value: RoomRoleAccess;
  onChange: (value: RoomRoleAccess) => void;
  permissionActions?: MatterhornManagementAction[];
  permissionScopes?: MatterhornManagementScope[];
  scopedRulesByRole?: Record<string, MatterhornRoleRule[]>;
  onScopedRulesChange?: (roleId: string, rules: MatterhornRoleRule[]) => void;
  scopedPermissionScope?: MatterhornManagementScope;
}) {
  const scopedActions = permissionActions.filter((action) => /^(?:media\.room\.|media\.stage\.|screenshare\.|matterhorn\.scope\.)/u.test(action.operationType));
  const scopedScopes = scopedPermissionScope
    ? permissionScopes.filter((scope) => (scope.scopeType === scopedPermissionScope.scopeType && scope.scopeId === scopedPermissionScope.scopeId) || (scope.scopeType === "*" && scope.scopeId === "*"))
    : permissionScopes;
  const scopedEditing = Boolean(onScopedRulesChange && scopedActions.length && scopedScopes.length);
  return (
    <>
      <div {...stylex.props(layout.accessGrid)} aria-label="Voice channel legacy role access">
        {scopedEditing ? <p {...stylex.props(field.label)}>Legacy role access is retained as a fallback; scoped rules below are authoritative.</p> : null}
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
                disabled={scopedEditing}
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
      {scopedEditing ? (
        <div {...stylex.props(layout.accessGrid)} aria-label="Voice channel scoped role permissions">
          {roles.map((role) => (
            <details key={role.id}>
              <summary>{role.name} scoped permissions</summary>
              <RolePermissionEditor
                actions={scopedActions}
                scopes={scopedScopes}
                value={scopedRulesByRole?.[role.id] || []}
                onChange={(rules) => onScopedRulesChange?.(role.id, rules)}
              />
            </details>
          ))}
        </div>
      ) : null}
    </>
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
