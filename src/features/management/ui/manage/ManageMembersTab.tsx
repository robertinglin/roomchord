import React, { useEffect, useState } from "react";
import { roleNames, primaryRoleFor, roleChipFor, presenceStatus, type MemberOption } from "@entities/chat/model/roles";
import type { MemberPreference } from "@entities/chat/model/localMemberPreferences";
import type { ChatState, RoleDefinition } from "@entities/chat/model/types";
import { Switch } from "@features/management/ui/Controls";
import { RoleCheckboxes } from "@features/management/ui/manage/RoleFields";
import { Avatar, RoleChip } from "@shared/ui/design";
import { panel, button, row, layout, misc, field, option } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

export function ManageMembersTab({
  canManageRoles,
  initialMemberId,
  memberPreferences,
  members,
  profileOnly,
  roleDefinitions,
  roles,
  onAssignMemberRoles,
  onSetMemberBlock,
  onSetMemberIgnore,
  onSetMemberNickname,
  onSetMemberNote
}: {
  canManageRoles: boolean;
  initialMemberId?: string;
  memberPreferences?: Record<string, MemberPreference>;
  members: MemberOption[];
  profileOnly?: boolean;
  roleDefinitions?: ChatState["roleDefinitions"];
  roles: RoleDefinition[];
  onAssignMemberRoles: (memberId: string, roleIds: string[], displayName?: string) => void;
  onSetMemberBlock: (memberId: string, blocked: boolean) => void;
  onSetMemberIgnore: (memberId: string, ignored: boolean) => void;
  onSetMemberNickname: (memberId: string, nickname: string | null) => void;
  onSetMemberNote: (memberId: string, note: string | null) => void;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(initialMemberId);
  const selectedMember = members.find((member) => member.id === selectedMemberId) || members[0];
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(selectedMember?.roleIds || []);
  const selectedPreference = selectedMember ? memberPreferences?.[selectedMember.id] : undefined;
  const [nickname, setNickname] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (initialMemberId) setSelectedMemberId(initialMemberId);
  }, [initialMemberId]);

  useEffect(() => {
    if (!selectedMember) return;
    setSelectedRoleIds(selectedMember.roleIds);
  }, [selectedMember?.id, selectedMember?.roleIds.join("|")]);

  useEffect(() => {
    setNickname(selectedPreference?.nickname || "");
    setNote(selectedPreference?.note || "");
  }, [selectedMember?.id, selectedPreference?.nickname, selectedPreference?.note]);

  function saveMemberRoles(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    onAssignMemberRoles(selectedMember.id, selectedRoleIds, selectedMember.name);
  }

  function saveMemberProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    const nextNickname = nickname.trim() || null;
    const nextNote = note.trim() || null;
    if ((selectedPreference?.nickname || null) !== nextNickname) onSetMemberNickname(selectedMember.id, nextNickname);
    if ((selectedPreference?.note || null) !== nextNote) onSetMemberNote(selectedMember.id, nextNote);
  }

  return (
    <div {...stylex.props(layout.section)}>
      <div {...stylex.props(profileOnly ? layout.col : layout.split)}>
        {!profileOnly ? (
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
        ) : null}

        {selectedMember ? (
          <div {...stylex.props(layout.col)}>
            <form {...stylex.props(panel.panel)} onSubmit={saveMemberProfile}>
              <header {...stylex.props(panel.head)}>
                <h3 {...stylex.props(panel.h3)}>Profile for {selectedMember.name}</h3>
              </header>
              <div {...stylex.props(panel.body)}>
                <label {...stylex.props(field.field)}>
                  <span {...stylex.props(field.label)}>Friend nickname</span>
                  <input
                    {...stylex.props(field.input)}
                    value={nickname}
                    placeholder={selectedMember.name}
                    onChange={(event) => setNickname(event.target.value)}
                  />
                </label>
                <label {...stylex.props(field.field)}>
                  <span {...stylex.props(field.label)}>Note</span>
                  <textarea
                    {...stylex.props(field.input)}
                    value={note}
                    rows={4}
                    placeholder="Add context for this member"
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <div {...stylex.props(option.opt, option.optFirst, option.optDivider)}>
                  <span {...stylex.props(option.optMain)}>
                    <strong {...stylex.props(option.optTitle)}>Ignore</strong>
                    <span {...stylex.props(option.optDesc)}>Reduce interruptions from this member.</span>
                  </span>
                  <span {...stylex.props(option.optEnd)}>
                    <Switch
                      checked={Boolean(selectedPreference?.ignored)}
                      aria-label={`Ignore ${selectedMember.name}`}
                      onChange={(checked) => onSetMemberIgnore(selectedMember.id, checked)}
                    />
                  </span>
                </div>
                <div {...stylex.props(option.opt, option.optLast, option.optDivider)}>
                  <span {...stylex.props(option.optMain)}>
                    <strong {...stylex.props(option.optTitle)}>Block</strong>
                    <span {...stylex.props(option.optDesc)}>Prevent direct interaction from this member.</span>
                  </span>
                  <span {...stylex.props(option.optEnd)}>
                    <Switch
                      checked={Boolean(selectedPreference?.blocked)}
                      aria-label={`Block ${selectedMember.name}`}
                      onChange={(checked) => onSetMemberBlock(selectedMember.id, checked)}
                    />
                  </span>
                </div>
                <div {...stylex.props(button.actions, button.actionsEnd)}>
                  <button type="submit" {...stylex.props(button.btn, button.primary)}>Save profile</button>
                </div>
              </div>
            </form>

            {canManageRoles ? (
              <form {...stylex.props(panel.panel, panel.panelLast)} onSubmit={saveMemberRoles}>
                <header {...stylex.props(panel.head)}>
                  <h3 {...stylex.props(panel.h3)}>Role tags for {selectedMember.name}</h3>
                </header>
                <div {...stylex.props(panel.body)}>
                  <RoleCheckboxes roles={roles} selectedRoleIds={selectedRoleIds} onChange={setSelectedRoleIds} />
                  <div {...stylex.props(button.actions, button.actionsEnd)}>
                    <button type="submit" {...stylex.props(button.btn, button.primary)}>Save roles</button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
