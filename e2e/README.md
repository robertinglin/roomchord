# Mosh Playwright plan

The suite runs Mosh against a real local Matterhorn relay and launcher. Every environment starts four independent browser contexts:

| Context | Invite | Coverage |
| --- | --- | --- |
| Admin | admin invite | room management, moderation, and full message controls |
| Moderator | member invite | elevated-member behavior and shared messaging |
| Member | member invite | normal member behavior, DMs, unread state, and media |
| Guest | guest invite | guest-channel isolation and restricted controls |

The member invite is opened twice so the four-user seed has three selectable peers for group-DM coverage and shared synchronization is tested with more than the minimum three users. Startup chains the two member contexts to avoid racing one-time invite consumption.

## Test matrix

- `mosh-smoke.spec.cjs`: four-user channel synchronization, guest isolation and publication, presence/status, management visibility, and reload persistence. Runs in Chromium, Firefox, and WebKit.
- `mosh-messaging.spec.cjs`: rich Markdown/mentions, YouTube embeds/fullscreen, reactions, replies, edits, forwards, direct-message creation, bidirectional delivery, unread/read state, restored DM threads, and direct-call invite/accept/end. Runs in Chromium.
- `mosh-productivity.spec.cjs`: real Matterhorn-backed bookmarks/reminders and group-DM create/rename/member-add/leave behavior. Member removal and attachment-only send remain gated until their linked Matterhorn proofs pass. Runs in Chromium.
- `mosh-management.spec.cjs`: channel, voice-room, role, member, moderation, and invite-management surfaces, plus admin promotion and restricted-role checks. Runs in Chromium.
- `mosh-media.spec.cjs`: voice-room join, participant synchronization, camera, screen share, microphone preferences, navigation persistence, and active-voice restoration. Runs in Chromium.
- `mosh-parity.spec.cjs`: authoritative thread lifecycle/privacy, forum layouts/tags, and category-inherited access. Runs in Chromium.
- `mosh-development-reload.spec.cjs`: changes TypeScript and CSS and exercises Matterhorn's update/reload controls without reloading the launcher page, while preserving actor identity and message state.
- `mosh-closed-surfaces.spec.cjs`: participant-private DM react/pin/unpin, authoritative Files v2 cross-scope forwarding with replacement provenance, and honest custom-media/provider boundaries. The app invokes Matterhorn's room-bound re-share coordinator; it does not expose raw re-share/revoke or recipient-key controls.

## Commands

```sh
pnpm test:e2e                 # all configured projects
pnpm test:e2e:chromium        # full feature suite
pnpm test:e2e:smoke           # Firefox + WebKit smoke
```

The fixture creates deterministic canvas video and oscillator audio tracks, uses a dynamically selected PeerJS port, captures browser errors, and removes its temporary project and Matterhorn process after each test. It serves the prebuilt `dist/` bundle from the temporary project under an explicit `prebuilt` descriptor contract. Before startup it asserts that `dist/index.html` is newer than the non-test frontend inputs, so a stale bundle cannot be mistaken for source proof; run `pnpm run build:frontend` first when that check fails. Media scenarios create a voice room through the management UI before joining it, so camera and screen-share coverage does not depend on seed data.

## Prerequisites

- A sibling Matterhorn checkout at `../matterhorn` with its workspace dependencies available.
- Chromium for the feature suite; Firefox and WebKit binaries for the smoke project (`pnpm exec playwright install firefox webkit`).
- WebKit may additionally require the host libraries reported by `pnpm exec playwright install-deps webkit`.

The management, moderation, and message-control assertions run against the real runtime. App-level invite records, role promotion, channel creation, and pin/delete controls are all exercised; the suite does not skip unsupported paths.
