import React, { useState } from "react";
import { cleanRoleId } from "@entities/chat/model/roles";
import type { RoleDefinition } from "@entities/chat/model/types";
import type { RoleInput, RoleUpdateInput } from "@entities/chat/model/managementTypes";

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
  const [roleColor, setRoleColor] = useState("");
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

  return (
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
  );
}
