# Matterhorn gap: scoped channel and voice invitations

## Status

Open. Mosh exposes Discord-style **Invite to Channel** and **Invite to Voice**
actions, but Matterhorn currently creates room-admission invitations only. Its
invite input has no authenticated landing channel or media-room target, and it
does not expose a scoped invite permission that Mosh can safely evaluate.

Opening the general room invite manager would be misleading: it cannot produce
a link that returns the recipient to the selected text or voice channel. Mosh
therefore keeps these context-menu actions as explicit stubs until the signed
invite contract carries the destination.

Channel pinning is not part of this gap. Mosh defines pins as shared room state
that authorized channel administrators can update; Matterhorn only applies
Mosh's declared schema, authorization, and operations.

## Required product behavior

- **Invite to Channel** creates or selects a room invitation whose landing
  target is the chosen text channel.
- **Invite to Voice** creates or selects a room invitation whose landing target
  is the chosen media room.
- Opening the link admits the user to the room through the normal Matterhorn
  invitation flow, then opens the target when the admitted user is authorized
  to view it.
- A target never grants access by itself. If the resulting member cannot view
  the target, the launcher opens the room's safe default instead.
- Archived, removed, or inaccessible targets fail closed without leaking their
  name or existence.
- Existing invite expiry, maximum-use, role, revocation, MLS-head pinning, and
  identity checks remain authoritative.

## Proposed contract

The exact names may follow Matterhorn conventions, but invite creation and the
signed invite grant need an optional landing target:

```ts
type MatterhornInviteLandingTarget =
  | { type: "channel"; roomId: string; channelId: string }
  | { type: "media-room"; roomId: string; mediaRoomId: string };

type MatterhornInviteCreateInput = {
  name?: string;
  roleId: string;
  maxUses?: number | null;
  expiresAt?: number | null;
  landingTarget?: MatterhornInviteLandingTarget;
};

type MatterhornManagementInvite = {
  id: string;
  status: "active" | "revoked" | "removed" | string;
  landingTarget?: MatterhornInviteLandingTarget;
  // Existing role, use-count, expiry, principal, and audit fields remain.
};
```

Matterhorn also needs an explicit capability check for creating invitations to
a scope. It may be exposed through management permissions or the existing
scoped-role system, but it must answer whether the current actor may create an
invite landing at the supplied target.

## Signing and validation

The landing target must be included in the authenticated invitation artifact;
it cannot be an unsigned URL fragment that an attacker can replace.

At invite creation Matterhorn must verify that:

- The target belongs to the invitation's room.
- The target exists and is not archived.
- The inviter can view the target and has the scoped invite capability.
- The requested role and admission grant remain valid under existing room
  authority rules.

At redemption Matterhorn must first validate and consume the room invitation
normally. Only after membership and current room state are available may the
launcher resolve the landing target. The launcher must re-run target access
checks for the newly admitted member; creation-time access is not sufficient.

## Privacy and lifecycle

- Invite inspection must not reveal target metadata to unauthorized callers.
- Revoking or removing an invite invalidates its target along with the rest of
  the invitation.
- Archiving a target does not redirect to another private scope; it produces a
  safe room-level landing.
- Renaming or reordering a target does not invalidate the invite because the
  signed target uses a stable ID.
- Deleting and recreating a target with a new ID must not revive an old invite
  destination.
- Invite audit records should retain the target type and opaque ID for
  authorized administrators.

## Mosh integration after the gap closes

Mosh will replace the current stubs in
`src/features/channel-navigation/ui/ChannelContextMenus.tsx` with a focused
invite dialog. The dialog will create or copy a scoped invitation using
`live.management.invites`, show expiry/use limits when permitted, and retain
the existing room-management surface for broader invite administration.

Text and voice actions will pass stable IDs, never display a generated URL
before Matterhorn confirms the signed target, and will show an authorization
reason when the actor lacks scoped invite permission.

## Acceptance criteria

- Signed invites round-trip channel and media-room landing targets.
- Tampering with the target invalidates the invitation.
- Cross-room, missing, archived, and unauthorized targets are rejected.
- Redemption never grants target access beyond the admitted member's current
  permissions.
- Authorized recipients land in the requested text or voice channel.
- Unauthorized recipients land at a safe room default without target leakage.
- Expiry, use limits, revocation, MLS head binding, and audit behavior remain
  intact.
- Mosh context menus create/copy the correct scoped invite and display accurate
  permission failures.
- Matterhorn and Mosh focused tests plus full suites retain at least 80%
  coverage.
