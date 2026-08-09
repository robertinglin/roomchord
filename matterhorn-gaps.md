# Matterhorn integration status

Mosh uses the linked Matterhorn workspace as its only authority. Application
state is published exclusively as `matterhorn.operation.v3` inside
`encrypted-event-v3-mls`; there are no local-state, copied-data, or legacy
operation fallbacks.

## Integrated contracts

- Authoritative message-root threads: archive/reopen, lock/unlock,
  follow/unfollow, notification preferences, private membership, and scoped
  comment replay.
- Authoritative forum layout and tags, including pre-publication validation of
  missing and archived tag IDs.
- Category scope inheritance with parent relationships, cycle/depth rejection,
  role-or-member access, admin recovery, and effective-access provenance.
- Stable, independently scoped media rooms created only after their parent
  relationship succeeds, with cleanup when room creation fails.
- One runtime-scoped media-device controller for capture, mesh, SFU, processing
  restarts, microphone tests, remote audio sinks, device persistence, safe
  disappearance fallback, and output volume.
- Development reload controls, including refreshed TypeScript/CSS bundles and
  launcher-driven iframe reload, are integrated without a whole-page reload.
- Files v2 uploads, attachment-bearing cross-channel forwarding, ordinary
  cross-channel forwarding, bidirectional direct-message convergence, and
  guest channel publication remain on Matterhorn's authoritative paths. Mosh
  does not perform local copies, mirrors, or synthesize successful results.

## Linked-runtime residual diagnostics

The full Chromium matrix has intermittently encountered launcher asset 404s
during fresh-room startup. This remains an unconfirmed diagnostic item: the
failures occur before Mosh mounts and are not currently attributed to a
product-contract gap.

## Terminology

A role is an identity and permission grouping. A category organizes channels
and acts as an authorization parent whose permissions can be inherited. A
category can grant access to roles or members, but it is not itself a role.
