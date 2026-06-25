import React, { useState } from "react";
import { cleanRoleId } from "@entities/chat/model/roles";
import type { RoleDefinition } from "@entities/chat/model/types";
import type { RoleInput, RoleUpdateInput } from "@entities/chat/model/managementTypes";
import { Glyph } from "@shared/ui/design";
import { panel, field, button, row, layout, misc } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

function roleIdForNewRole(name: string, roles: RoleDefinition[]) {
  const baseRoleId = cleanRoleId(name);
  return roles.some((role) => role.id === baseRoleId) ? `${baseRoleId}-${roles.length + 1}` : baseRoleId;
}

export function ManageRolesTab({
  canManageRoles,
  roles,
  onArchiveRole,
  onCreateRole,
  onUpdateRole
}: {
  canManageRoles: boolean;
  roles: RoleDefinition[];
  onArchiveRole: (roleId: string) => void;
  onCreateRole: (input: RoleInput) => void;
  onUpdateRole: (roleId: string, input: RoleUpdateInput) => void;
}) {
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleColor, setRoleColor] = useState("#38bdf8");
  const [editingRoleId, setEditingRoleId] = useState<string | undefined>();
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [editRoleColor, setEditRoleColor] = useState("");
  const editingRole = editingRoleId ? roles.find((role) => role.id === editingRoleId) : undefined;

  function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = roleName.trim();
    if (!cleanName) return;
    onCreateRole({ roleId: roleIdForNewRole(cleanName, roles), name: cleanName, description: roleDescription.trim() || undefined, color: roleColor.trim() || undefined });
    setRoleName("");
    setRoleDescription("");
    setRoleColor("#38bdf8");
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

  return (
    <div {...stylex.props(layout.section)}>
      {canManageRoles ? (
        <form {...stylex.props(panel.panel)} onSubmit={createRole}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>New role</h3>
          </header>
          <div {...stylex.props(panel.body)}>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Role name</span>
              <input className="etch" aria-label="Role name" value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Launch Lead" {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Description</span>
              <input className="etch" aria-label="Role description" value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} placeholder="Coordinates launch threads" {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field, field.fieldLast)}>
              <span {...stylex.props(field.label)}>Colour</span>
              <span {...stylex.props(field.colorRow)}>
                <input
                  className="etch"
                  aria-label="Role color swatch"
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(roleColor) ? roleColor : "#38bdf8"}
                  onChange={(event) => setRoleColor(event.target.value)}
                  {...stylex.props(field.colorSwatch)}
                />
                <input className="etch" aria-label="Role color" value={roleColor} onChange={(event) => setRoleColor(event.target.value)} placeholder="#38bdf8" {...stylex.props(field.input, field.colorHex)} />
              </span>
            </label>
            <div {...stylex.props(button.actions, button.actionsEnd)}>
              <button type="submit" disabled={!roleName.trim()} {...stylex.props(button.btn, button.primary)}>
                <Glyph size={15}><><path d="M12 5v14M5 12h14" /></></Glyph>
                Create role
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Roles</h3>
          <span {...stylex.props(panel.meta)}>{roles.length} role{roles.length === 1 ? "" : "s"}</span>
        </header>
        {roles.length ? (
          <div {...stylex.props(panel.bodyFlush)}>
            <div {...stylex.props(layout.rowStack)}>
              {roles.map((role) => (
                <div {...stylex.props(row.row)} key={role.id}>
                  <span {...stylex.props(row.rowLeadGrow)}>
                    <span {...stylex.props(row.roleDot)} style={role.color ? { backgroundColor: role.color } : undefined} aria-hidden="true" />
                    <span {...stylex.props(row.rowMain)}>
                      <span {...stylex.props(row.rowTitle)}>{role.name}</span>
                      <span {...stylex.props(row.rowSub)}>{role.description || role.id}</span>
                    </span>
                  </span>
                  {canManageRoles ? (
                    <span {...stylex.props(row.rowEnd)}>
                      <button type="button" className="btn ghost" onClick={() => openRoleEditor(role)} {...stylex.props(button.btn, button.ghost, button.sm)}>Manage</button>
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No roles defined.</p></div>
        )}
      </section>

      {editingRole && canManageRoles ? (
        <form {...stylex.props(panel.panel)} onSubmit={saveRole}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>{editingRole.name}</h3>
          </header>
          <div {...stylex.props(panel.body)}>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Role name</span>
              <input aria-label="Manage role name" value={editRoleName} onChange={(event) => setEditRoleName(event.target.value)} {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Description</span>
              <input aria-label="Manage role description" value={editRoleDescription} onChange={(event) => setEditRoleDescription(event.target.value)} {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field, field.fieldLast)}>
              <span {...stylex.props(field.label)}>Colour</span>
              <input aria-label="Manage role color" value={editRoleColor} onChange={(event) => setEditRoleColor(event.target.value)} {...stylex.props(field.input)} />
            </label>
            <div {...stylex.props(button.actions)}>
              <button type="submit" disabled={!editRoleName.trim()} {...stylex.props(button.btn, button.primary)}>Save role</button>
              <button type="button" onClick={() => setEditingRoleId(undefined)} {...stylex.props(button.btn, button.ghost)}>Cancel</button>
            </div>
            {!editingRole.systemRole ? (
              <button
                type="button"
                onClick={() => { onArchiveRole(editingRole.id); setEditingRoleId(undefined); }}
                {...stylex.props(button.btn, button.danger, button.sm, button.fullWidth)}
              >
                Archive role
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
