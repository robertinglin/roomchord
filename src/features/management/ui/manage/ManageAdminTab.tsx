import React from "react";
import { matterhornDisplayName } from "matterhorn-sdk/browser/displayName";
import { joinRequestsForState, memberModerationFor, publicInvitesForState } from "@entities/chat/model/state";
import type { Actor, ChatState, MemberModeration, RoomMember } from "@entities/chat/model/types";
import { panel, button, row, layout, misc } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

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
    <div {...stylex.props(layout.section)}>
      <section {...stylex.props(panel.panel)} aria-label="Member moderation">
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Members</h3>
          <span {...stylex.props(panel.meta)}>{members.length} visible</span>
        </header>
        {members.length ? (
          <div {...stylex.props(panel.bodyFlush)}>
            <div {...stylex.props(layout.rowStack)}>
              {members.map((member) => {
                const self = member.id === actor.memberId;
                const muted = Boolean(member.moderation?.chatDisabled);
                const locked = Boolean(member.moderation?.nameLocked);
                const banned = Boolean(member.moderation?.bannedAt);
                return (
                  <article {...stylex.props(row.row)} data-testid="admin-member-row" key={member.id}>
                    <span {...stylex.props(row.rowMain)}>
                      <span {...stylex.props(row.rowTitle)}>{member.name}</span>
                      <span {...stylex.props(row.rowSub)}>{statusLabel(member)}</span>
                    </span>
                    <span {...stylex.props(row.rowEnd)}>
                      <button data-testid="member-toggle-chat" type="button" disabled={!canManageMembers || self || banned} onClick={() => onModerateMember(member.id, { chatDisabled: !muted })} {...stylex.props(button.btn, button.secondary, button.sm)}>
                        {muted ? "Unmute chat" : "Mute chat"}
                      </button>
                      <button data-testid="member-toggle-profile-lock" type="button" disabled={!canManageMembers || self || banned} onClick={() => onModerateMember(member.id, { nameLocked: !locked })} {...stylex.props(button.btn, button.secondary, button.sm)}>
                        {locked ? "Unlock profile" : "Lock profile"}
                      </button>
                      {banned ? (
                        <button data-testid="member-unban" type="button" disabled={!canManageMembers || self} onClick={() => onUnbanMember(member.id)} {...stylex.props(button.btn, button.secondary, button.sm)}>Unban</button>
                      ) : (
                        <button data-testid="member-ban" type="button" disabled={!canManageMembers || self} onClick={() => onBanMember(member.id)} {...stylex.props(button.btn, button.danger, button.sm)}>Ban</button>
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

      <section {...stylex.props(panel.panel)} aria-label="Invites">
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Invites</h3>
          <span {...stylex.props(panel.meta)}>{invites.length} records</span>
        </header>
        {invites.length ? (
          <div {...stylex.props(panel.bodyFlush)}>
            <div {...stylex.props(layout.rowStack)}>
              {invites.map((invite) => (
                <article {...stylex.props(row.row)} data-testid="admin-invite-row" key={invite.id}>
                  <span {...stylex.props(row.rowMain)}>
                    <span {...stylex.props(row.rowTitle)}>{invite.id}</span>
                    <span {...stylex.props(row.rowSub)}>{invite.status || "active"}</span>
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
