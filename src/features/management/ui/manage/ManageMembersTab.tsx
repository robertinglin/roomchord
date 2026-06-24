import React, { useEffect, useState } from "react";
import { roleNames, type MemberOption } from "@entities/chat/model/roles";
import type { ChatState, RoleDefinition } from "@entities/chat/model/types";
import { RoleCheckboxes } from "@features/management/ui/manage/RoleFields";

export function ManageMembersTab({
  canManageRoles,
  initialMemberId,
  members,
  roleDefinitions,
  roles,
  onAssignMemberRoles
}: {
  canManageRoles: boolean;
  initialMemberId?: string;
  members: MemberOption[];
  roleDefinitions?: ChatState["roleDefinitions"];
  roles: RoleDefinition[];
  onAssignMemberRoles: (memberId: string, roleIds: string[], displayName?: string) => void;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(initialMemberId);
  const selectedMember = members.find((member) => member.id === selectedMemberId) || members[0];
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(selectedMember?.roleIds || []);

  useEffect(() => {
    if (initialMemberId) setSelectedMemberId(initialMemberId);
  }, [initialMemberId]);

  useEffect(() => {
    if (!selectedMember) return;
    setSelectedRoleIds(selectedMember.roleIds);
  }, [selectedMember?.id, selectedMember?.roleIds.join("|")]);

  function saveMemberRoles(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    onAssignMemberRoles(selectedMember.id, selectedRoleIds, selectedMember.name);
  }

  return (
    <div className="manage-section">
      <div className="member-role-layout">
        <div className="manage-list">
          {members.map((member) => (
            <button className={`member-role-picker${selectedMember?.id === member.id ? " active" : ""}`} type="button" key={member.id} onClick={() => setSelectedMemberId(member.id)}>
              <strong>{member.name}</strong>
              <small>{roleNames(member.roleIds, roleDefinitions).join(", ") || "No role tags"}</small>
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
  );
}
