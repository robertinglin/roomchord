import React, { useEffect, useState } from "react";
import type { ManagementSnapshot } from "matterhorn-sdk/browser/management";
import type { ActiveRules, AutoModDecision, AutoModOverrideInput, AutoModPolicy, ManagementRole, MemberModerationStatus, ModerationAuditEntry, ModerationReport } from "matterhorn-sdk/browser";
import { joinRequestsForState, memberModerationFor, publicInvitesForState } from "@entities/chat/model/state";
import { memberOptions } from "@entities/chat/model/roles";
import { SafetyControls } from "@features/management/ui/manage/SafetyControls";
import { AutoModControls } from "@features/management/ui/manage/AutoModControls";
import type { Actor, ChatState, MemberModeration } from "@entities/chat/model/types";
import type { InviteInput } from "@entities/chat/model/managementTypes";
import { panel, button, row, layout, misc, field, notice, section } from "@shared/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";
import { BotBadge } from "@shared/ui/BotBadge";

type AdminMember = {
  id: string;
  isCurrent: boolean;
  name: string;
  role?: string;
  moderation?: MemberModeration;
  kind?: "bot";
};

const USED_INVITE_STATUSES = new Set(["consumed", "expired", "exhausted"]);

type Props = {
  actor: Actor;
  canManageMembers: boolean;
  managementSnapshot?: ManagementSnapshot;
  state: ChatState;
  onApproveJoinRequest: (requestId: string) => void;
  onBanMember: (memberId: string) => void;
  onDenyJoinRequest: (requestId: string) => void;
  onDisableInvite: (inviteId: string) => void;
  onModerateMember: (memberId: string, input: { chatDisabled?: boolean; nameLocked?: boolean }) => void;
  onRemoveInvite: (inviteId: string) => void;
  onUnbanMember: (memberId: string) => void;
  onCreateInvite?: (input: InviteInput) => Promise<unknown>;
  canModerateSafety?: boolean;
  canReport?: boolean;
  onTimeoutMember?: (memberId: string, input: { durationMs?: number; permanent?: boolean; reason?: string }) => Promise<void>;
  onQuarantineMember?: (memberId: string, input: { durationMs?: number; permanent?: boolean; scopeId?: string; reason?: string }) => Promise<void>;
  onSetSlowmode?: (scopeId: string, intervalMs: number, input?: { reason?: string }) => Promise<void>;
  onReportMember?: (memberId: string, reason: string) => Promise<void>;
  onGetStatus?: (memberId: string) => Promise<MemberModerationStatus>;
  onClearTimeout?: (memberId: string, revision: number, reason?: string) => Promise<void>;
  onClearQuarantine?: (memberId: string, revision: number, reason?: string) => Promise<void>;
  onActiveRules?: () => Promise<ActiveRules | undefined>;
  onPublishRules?: (text: string, version: number, required?: boolean, reason?: string) => Promise<void>;
  onAcceptRules?: (version?: number) => Promise<void>;
  onReportInbox?: () => Promise<ModerationReport[]>;
  onResolveReport?: (reportId: string, status: "resolved" | "dismissed", reason?: string) => Promise<void>;
  onAuditQuery?: () => Promise<ModerationAuditEntry[]>;
  onActiveAutoMod?: () => Promise<AutoModPolicy | undefined>;
  onPublishAutoMod?: (input: AutoModPolicy & { reason?: string }) => Promise<void>;
  onOverrideAutoMod?: (input: AutoModOverrideInput) => Promise<void>;
  onRedactAutoMod?: (input: Omit<AutoModOverrideInput, "action">) => Promise<void>;
  onQuarantineAutoMod?: (input: Omit<AutoModOverrideInput, "action">) => Promise<void>;
  onEvaluateAutoMod?: (input: { body: string; scopeId?: string }) => Promise<AutoModDecision>;
};

function adminMembers(actor: Actor, state: ChatState, managementSnapshot?: ManagementSnapshot): AdminMember[] {
  const authorityMembers = new Map((managementSnapshot?.members || []).map((member) => [member.memberId, member]));
  const currentAuthorityIds = new Set(
    (managementSnapshot?.members || [])
      .filter((member) => member.isCurrent)
      .map((member) => member.memberId)
  );
  return memberOptions(actor, state.members || {}, state.presence || {}, state).map((member) => ({
    id: member.id,
    isCurrent: member.id === actor.memberId || currentAuthorityIds.has(member.id),
    name: member.name,
    kind: authorityMembers.get(member.id)?.kind === "bot" || member.kind === "bot" ? "bot" : undefined,
    role: member.baseRole || member.roleIds[0],
    moderation: memberModerationFor(state, member.id)
  }));
}

function statusLabel(member: AdminMember) {
  if (member.moderation?.bannedAt) return "banned";
  if (member.moderation?.chatDisabled) return "muted";
  if (member.moderation?.nameLocked) return "profile locked";
  return member.role || "member";
}

export function ManageAdminTab({
  actor,
  canManageMembers,
  managementSnapshot,
  state,
  onApproveJoinRequest,
  onBanMember,
  onDenyJoinRequest,
  onDisableInvite,
  onModerateMember,
  onRemoveInvite,
  onUnbanMember,
  onCreateInvite,
  canModerateSafety = false,
  canReport = false,
  onTimeoutMember,
  onQuarantineMember,
  onSetSlowmode,
  onReportMember,
  onGetStatus,
  onClearTimeout,
  onClearQuarantine,
  onActiveRules,
  onPublishRules,
  onAcceptRules,
  onReportInbox,
  onResolveReport,
  onAuditQuery,
  onActiveAutoMod,
  onPublishAutoMod,
  onOverrideAutoMod,
  onRedactAutoMod,
  onQuarantineAutoMod,
  onEvaluateAutoMod,
}: Props) {
  const [inviteRoleId, setInviteRoleId] = useState("member");
  const [inviteName, setInviteName] = useState("");
  const [inviteExpiry, setInviteExpiry] = useState("7");
  const [inviteMaxUses, setInviteMaxUses] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const members = adminMembers(actor, state, managementSnapshot);
  const inviteRoles: ManagementRole[] = (managementSnapshot?.roles || []).filter((role) => role.id !== "owner" && !role.disabledAt);
  const canCreateInvite = Boolean(onCreateInvite && canManageMembers && (actor.role === "admin" || actor.role === "owner") && (managementSnapshot?.canManageInvites ?? true));
  const invites = (managementSnapshot?.invites?.length
    ? managementSnapshot.invites.filter((invite) => invite.status !== "removed")
    : publicInvitesForState(state).filter((invite) => invite.status !== "removed"))
    .sort((left, right) =>
      Number(USED_INVITE_STATUSES.has(left.status || "active"))
      - Number(USED_INVITE_STATUSES.has(right.status || "active"))
    );
  const joinRequests = joinRequestsForState(state).filter((request) => request.status === "pending");

  useEffect(() => {
    if (inviteRoles.some((role) => role.id === inviteRoleId)) return;
    setInviteRoleId(inviteRoles.find((role) => role.id === "member")?.id || inviteRoles[0]?.id || "");
  }, [inviteRoleId, inviteRoles]);

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreateInvite || !inviteRoleId) return;
    const maxUses = inviteMaxUses.trim() ? Number(inviteMaxUses) : null;
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      setInviteError("Maximum joins must be a positive whole number.");
      return;
    }
    const expiresAt = inviteExpiry === "unlimited" ? null : Date.now() + Number(inviteExpiry) * 86_400_000;
    setInviteError("");
    setInviteMessage("");
    try {
      await onCreateInvite({ name: inviteName.trim() || undefined, roleId: inviteRoleId, maxUses, expiresAt });
      setInviteName("");
      setInviteMaxUses("");
      setInviteMessage("Invite created.");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to create invite.");
    }
  }

  return (
    <div {...stylex.props(layout.section)}>
      <div>
        <h3 {...stylex.props(section.heading)}>Access requests</h3>
        <p {...stylex.props(section.description)}>Review who can enter and which invite links remain valid.</p>
      </div>
      <section {...stylex.props(panel.panel)} aria-label="Member moderation">
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Members</h3>
          <span {...stylex.props(panel.meta)}>{members.length} visible</span>
        </header>
        {members.length ? (
          <div {...stylex.props(panel.bodyFlush)}>
            <div {...stylex.props(layout.rowStack)}>
              {members.map((member) => {
                const self = member.isCurrent;
                const muted = Boolean(member.moderation?.chatDisabled);
                const locked = Boolean(member.moderation?.nameLocked);
                const banned = Boolean(member.moderation?.bannedAt);
                return (
                  <article {...stylex.props(row.row)} data-testid="admin-member-row" key={member.id}>
                    <span {...stylex.props(row.rowMain)}>
                      <span {...stylex.props(row.rowTitle)}>{member.name} {member.kind === "bot" ? <BotBadge /> : null}</span>
                      <span {...stylex.props(row.rowSub)}>{statusLabel(member)}</span>
                    </span>
                    <span {...stylex.props(row.rowEnd)}>
                      <button data-testid="member-toggle-chat" type="button" title={self ? "You cannot moderate your own account." : banned ? "Unban this member before changing chat access." : undefined} disabled={!canManageMembers || self || banned} onClick={() => onModerateMember(member.id, { chatDisabled: !muted })} {...stylex.props(button.btn, button.secondary, button.sm)}>
                        {muted ? "Unmute chat" : "Mute chat"}
                      </button>
                      <button data-testid="member-toggle-profile-lock" type="button" title={self ? "You cannot moderate your own account." : banned ? "Unban this member before changing profile access." : undefined} disabled={!canManageMembers || self || banned} onClick={() => onModerateMember(member.id, { nameLocked: !locked })} {...stylex.props(button.btn, button.secondary, button.sm)}>
                        {locked ? "Unlock profile" : "Lock profile"}
                      </button>
                      {banned ? (
                        <button data-testid="member-unban" type="button" title={self ? "You cannot moderate your own account." : undefined} disabled={!canManageMembers || self} onClick={() => onUnbanMember(member.id)} {...stylex.props(button.btn, button.secondary, button.sm)}>Unban</button>
                      ) : (
                        <button data-testid="member-ban" type="button" title={self ? "You cannot moderate your own account." : "Removes this member from the room."} disabled={!canManageMembers || self} onClick={() => onBanMember(member.id)} {...stylex.props(button.btn, button.danger, button.sm)}>Ban</button>
                      )}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No members to moderate.</p></div>
        )}
      </section>

      <div>
        <h3 {...stylex.props(section.heading)}>Safety & incident response</h3>
        <p {...stylex.props(notice.warning)}>These actions affect member access and room visibility. Add a clear reason before acting so the audit trail is useful.</p>
      </div>
      <SafetyControls
        members={members.map((member) => ({ id: member.id, name: member.name, roleIds: member.role ? [member.role] : [], status: "online" }))}
        channels={(state.channels || []).filter((channel) => !channel.archivedAt).map((channel) => ({ id: channel.id, name: channel.name }))}
        canModerate={canModerateSafety}
        canReport={canReport}
        onTimeoutMember={onTimeoutMember}
        onQuarantineMember={onQuarantineMember}
        onSetSlowmode={onSetSlowmode}
        onReportMember={onReportMember}
        onGetStatus={onGetStatus}
        onClearTimeout={onClearTimeout}
        onClearQuarantine={onClearQuarantine}
        onActiveRules={onActiveRules}
        onPublishRules={onPublishRules}
        onAcceptRules={onAcceptRules}
        onReportInbox={onReportInbox}
        onResolveReport={onResolveReport}
        onAuditQuery={onAuditQuery}
      />

      <AutoModControls
        canModerate={canModerateSafety}
        onActive={onActiveAutoMod}
        onPublish={onPublishAutoMod}
        onOverride={onOverrideAutoMod}
        onRedact={onRedactAutoMod}
        onQuarantine={onQuarantineAutoMod}
        onEvaluate={onEvaluateAutoMod}
      />

      <div>
        <h3 {...stylex.props(section.heading)}>Invite records</h3>
        <p {...stylex.props(section.description)}>Disable active links first. Remove inactive records only when they are no longer needed for review.</p>
      </div>
      <section {...stylex.props(panel.panel)} aria-label="Invites">
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Invites</h3>
          <span {...stylex.props(panel.meta)}>{invites.length} records</span>
        </header>
        {canCreateInvite ? (
          <form {...stylex.props(panel.body)} aria-label="Create invite" onSubmit={createInvite}>
            <div {...stylex.props(layout.split)}>
              <label {...stylex.props(field.field)}>
                <span {...stylex.props(field.label)}>Invite name</span>
                <input aria-label="Invite name" value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Reviewers" {...stylex.props(field.input)} />
              </label>
              <label {...stylex.props(field.field)}>
                <span {...stylex.props(field.label)}>Role</span>
                <select aria-label="Invite role" value={inviteRoleId} onChange={(event) => setInviteRoleId(event.target.value)} disabled={!inviteRoles.length} {...stylex.props(field.select)}>
                  {inviteRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </label>
              <label {...stylex.props(field.field)}>
                <span {...stylex.props(field.label)}>Expires</span>
                <select aria-label="Invite expiry" value={inviteExpiry} onChange={(event) => setInviteExpiry(event.target.value)} {...stylex.props(field.select)}>
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </label>
              <label {...stylex.props(field.field)}>
                <span {...stylex.props(field.label)}>Maximum joins</span>
                <input aria-label="Maximum joins" type="number" min="1" step="1" value={inviteMaxUses} onChange={(event) => setInviteMaxUses(event.target.value)} placeholder="Unlimited" {...stylex.props(field.input)} />
              </label>
            </div>
            {inviteError ? <p role="alert" {...stylex.props(misc.hint)}>{inviteError}</p> : null}
            {inviteMessage ? <p role="status" {...stylex.props(misc.hint)}>{inviteMessage}</p> : null}
            <div {...stylex.props(button.actions, button.actionsEnd)}>
              <button type="submit" disabled={!inviteRoleId || !inviteRoles.length} {...stylex.props(button.btn, button.primary)}>Create invite</button>
            </div>
          </form>
        ) : null}
        {invites.length ? (
          <div {...stylex.props(panel.bodyFlush)}>
            <div {...stylex.props(layout.rowStack)}>
              {invites.map((invite) => (
                <article {...stylex.props(row.row)} data-testid="admin-invite-row" key={invite.id}>
                  <span {...stylex.props(row.rowMain)}>
                    <span {...stylex.props(row.rowTitle)}>{invite.id}</span>
                      <span {...stylex.props(row.rowSub)}>{invite.status === "revoked" ? "disabled" : invite.status || "active"}</span>
                  </span>
                  <span {...stylex.props(row.rowEnd)}>
                    {(invite.status || "active") === "active" ? <button data-testid="invite-disable" type="button" disabled={!canManageMembers} onClick={() => onDisableInvite(invite.id)} {...stylex.props(button.btn, button.secondary, button.sm)}>Disable</button> : null}
                    {(invite.status || "active") !== "active" ? <button data-testid="invite-remove" type="button" disabled={!canManageMembers} onClick={() => onRemoveInvite(invite.id)} {...stylex.props(button.btn, button.danger, button.sm)}>Remove</button> : null}
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No invite records are published for this room.</p></div>
        )}
      </section>

      <section {...stylex.props(panel.panel)} aria-label="Join requests">
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Join requests</h3>
          <span {...stylex.props(panel.meta)}>{joinRequests.length} pending</span>
        </header>
        {joinRequests.length ? (
          <div {...stylex.props(panel.bodyFlush)}>
            <div {...stylex.props(layout.rowStack)}>
              {joinRequests.map((request) => (
                <article {...stylex.props(row.row)} data-testid="admin-join-request-row" key={request.id}>
                  <span {...stylex.props(row.rowMain)}>
                    <span {...stylex.props(row.rowTitle)}>{request.profile?.name || request.profileId || request.id}</span>
                    <span {...stylex.props(row.rowSub)}>{request.inviteId || "invite"}</span>
                  </span>
                  <span {...stylex.props(row.rowEnd)}>
                    <button data-testid="join-request-approve" type="button" disabled={!canManageMembers} onClick={() => onApproveJoinRequest(request.id)} {...stylex.props(button.btn, button.secondary, button.sm)}>Approve</button>
                    <button data-testid="join-request-deny" type="button" disabled={!canManageMembers} onClick={() => onDenyJoinRequest(request.id)} {...stylex.props(button.btn, button.danger, button.sm)}>Deny</button>
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No pending join requests.</p></div>
        )}
      </section>
    </div>
  );
}
