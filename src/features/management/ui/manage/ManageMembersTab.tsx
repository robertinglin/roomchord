import React, { useEffect, useState } from "react";
import { roleNames, primaryRoleFor, roleChipFor, presenceStatus, type MemberOption } from "@entities/chat/model/roles";
import type { ChatState, RoleDefinition } from "@entities/chat/model/types";
import { RoleCheckboxes } from "@features/management/ui/manage/RoleFields";
import { Avatar, RoleChip } from "@shared/ui/design";
import { panel, button, row, layout, misc } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

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
    <div {...stylex.props(layout.section)}>
      <div {...stylex.props(layout.split)}>
        <section {...stylex.props(panel.panel)}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>Members</h3>
            <span {...stylex.props(panel.meta)}>{members.length} visible</span>
          </header>
          {members.length ? (
            <div {...stylex.props(panel.bodyFlush)}>
              <div {...stylex.props(layout.rowStack)}>
                {members.map((member) => {
                  const isActive = selectedMember?.id === member.id;
                  const chip = roleChipFor(primaryRoleFor(member.roleIds, member.baseRole, roleDefinitions), roleDefinitions);
                  return (
                    <div
                      key={member.id}
                      {...stylex.props(row.row, row.tap, isActive && row.sel)}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedMemberId(member.id)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedMemberId(member.id); } }}
                    >
                      <span {...stylex.props(row.rowLead)}>
                        <Avatar src={member.avatar} name={member.name} size="md" status={presenceStatus(member.status)} alt={member.name} />
                      </span>
                      <span {...stylex.props(row.rowMain)}>
                        <span {...stylex.props(row.rowTitle)}>{member.name}</span>
                        <span {...stylex.props(row.rowSub)}>{roleNames(member.roleIds, roleDefinitions).join(", ") || "No role tags"}</span>
                      </span>
                      {chip ? (
                        <span {...stylex.props(row.rowEnd)}>
                          <RoleChip label={chip.label} color={chip.color} />
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No members to show.</p></div>
          )}
        </section>

        {selectedMember ? (
          <form {...stylex.props(panel.panel)} onSubmit={saveMemberRoles}>
            <header {...stylex.props(panel.head)}>
              <h3 {...stylex.props(panel.h3)}>Role tags for {selectedMember.name}</h3>
            </header>
            <div {...stylex.props(panel.body)}>
              <RoleCheckboxes roles={roles} selectedRoleIds={selectedRoleIds} onChange={setSelectedRoleIds} />
              <div {...stylex.props(button.actions, button.actionsEnd)}>
                <button type="submit" disabled={!canManageRoles} {...stylex.props(button.btn, button.primary)}>Save roles</button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
