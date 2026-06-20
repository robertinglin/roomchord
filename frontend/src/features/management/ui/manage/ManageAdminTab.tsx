import React from "react";
import { matterhornDisplayName } from "matterhorn-sdk/browser/displayName";
import { joinRequestsForState, memberModerationFor, publicInvitesForState } from "@entities/chat/model/state";
import type { Actor, ChatState, MemberModeration, RoomMember } from "@entities/chat/model/types";

type AdminMember = {
  id: string;
  name: string;
  role?: string;
  moderation?: MemberModeration;
};

type Props = {
  actor: Actor;
  canManageMembers: boolean;
  state: ChatState;
  onApproveJoinRequest: (requestId: string) => void;
  onBanMember: (memberId: string) => void;
  onDenyJoinRequest: (requestId: string) => void;
  onDisableInvite: (inviteId: string) => void;
  onModerateMember: (memberId: string, input: { chatDisabled?: boolean; nameLocked?: boolean }) => void;
  onRemoveInvite: (inviteId: string) => void;
  onUnbanMember: (memberId: string) => void;
};

function memberIdFromEntry(key: string, member?: RoomMember & { id?: string }) {
  return member?.memberId || member?.id || key;
}

function adminMembers(state: ChatState): AdminMember[] {
  const members = new Map<string, AdminMember>();
  for (const [key, member] of Object.entries(state.members || {})) {
    const id = memberIdFromEntry(key, member);
    if (!id) continue;
    members.set(id, {
      id,
      name: matterhornDisplayName({ member, fallbackId: id }),
      role: member.role,
      moderation: memberModerationFor(state, id)
    });
  }
  for (const [id, moderation] of Object.entries((state as ChatState & { guests?: Record<string, MemberModeration> }).guests || {})) {
    const current = members.get(id);
    members.set(id, {
      id,
      name: current?.name || id,
      role: current?.role,
      moderation
    });
  }
  return [...members.values()].sort((left, right) => left.name.localeCompare(right.name));
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
  state,
  onApproveJoinRequest,
  onBanMember,
  onDenyJoinRequest,
  onDisableInvite,
  onModerateMember,
  onRemoveInvite,
  onUnbanMember
}: Props) {
  const members = adminMembers(state);
  const invites = publicInvitesForState(state).filter((invite) => invite.status !== "removed");
  const joinRequests = joinRequestsForState(state).filter((request) => request.status === "pending");

  return (
    <div className="manage-section admin-control-panel">
      <section className="admin-control-group" aria-label="Member moderation">
        <div className="admin-control-heading">
          <h3>Members</h3>
          <small>{members.length} visible</small>
        </div>
        <div className="admin-control-list">
          {members.map((member) => {
            const self = member.id === actor.memberId;
            const muted = Boolean(member.moderation?.chatDisabled);
            const locked = Boolean(member.moderation?.nameLocked);
            const banned = Boolean(member.moderation?.bannedAt);
            return (
              <article className="admin-control-row" data-testid="admin-member-row" key={member.id}>
                <span className="admin-control-summary">
                  <strong>{member.name}</strong>
                  <small>{statusLabel(member)}</small>
                </span>
                <span className="admin-control-actions">
                  <button data-testid="member-toggle-chat" type="button" disabled={!canManageMembers || self || banned} onClick={() => onModerateMember(member.id, { chatDisabled: !muted })}>
                    {muted ? "Unmute chat" : "Mute chat"}
                  </button>
                  <button data-testid="member-toggle-profile-lock" type="button" disabled={!canManageMembers || self || banned} onClick={() => onModerateMember(member.id, { nameLocked: !locked })}>
                    {locked ? "Unlock profile" : "Lock profile"}
                  </button>
                  {banned ? (
                    <button data-testid="member-unban" type="button" disabled={!canManageMembers || self} onClick={() => onUnbanMember(member.id)}>Unban</button>
                  ) : (
                    <button data-testid="member-ban" type="button" disabled={!canManageMembers || self} onClick={() => onBanMember(member.id)}>Ban</button>
                  )}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-control-group" aria-label="Invites">
        <div className="admin-control-heading">
          <h3>Invites</h3>
          <small>{invites.length} records</small>
        </div>
        <div className="admin-control-list">
          {invites.length ? invites.map((invite) => (
            <article className="admin-control-row" data-testid="admin-invite-row" key={invite.id}>
              <span className="admin-control-summary">
                <strong>{invite.id}</strong>
                <small>{invite.status || "active"}</small>
              </span>
              <span className="admin-control-actions">
                {(invite.status || "active") === "active" ? <button data-testid="invite-disable" type="button" disabled={!canManageMembers} onClick={() => onDisableInvite(invite.id)}>Disable</button> : null}
                {(invite.status || "active") !== "active" ? <button data-testid="invite-remove" type="button" disabled={!canManageMembers} onClick={() => onRemoveInvite(invite.id)}>Remove</button> : null}
              </span>
            </article>
          )) : <p className="admin-empty">No invite records are published for this room.</p>}
        </div>
      </section>

      <section className="admin-control-group" aria-label="Join requests">
        <div className="admin-control-heading">
          <h3>Join requests</h3>
          <small>{joinRequests.length} pending</small>
        </div>
        <div className="admin-control-list">
          {joinRequests.length ? joinRequests.map((request) => (
            <article className="admin-control-row" data-testid="admin-join-request-row" key={request.id}>
              <span className="admin-control-summary">
                <strong>{request.profile?.name || request.profileId || request.id}</strong>
                <small>{request.inviteId || "invite"}</small>
              </span>
              <span className="admin-control-actions">
                <button data-testid="join-request-approve" type="button" disabled={!canManageMembers} onClick={() => onApproveJoinRequest(request.id)}>Approve</button>
                <button data-testid="join-request-deny" type="button" disabled={!canManageMembers} onClick={() => onDenyJoinRequest(request.id)}>Deny</button>
              </span>
            </article>
          )) : <p className="admin-empty">No pending join requests.</p>}
        </div>
      </section>
    </div>
  );
}
