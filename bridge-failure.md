# Bridge failure leaves optimistic state and connection status inconsistent

## Summary

When the Matterhorn app bridge closes during an operation, the embedded application can remain visibly connected and retain optimistic state that was never accepted by the authoritative host.

This was observed with both message deletion and encrypted file upload:

- A message immediately changed to `Message deleted`, but after reloading it was present again. The delete had only been applied optimistically; the authoritative delete was never confirmed.
- The message's attachment remained visible on the optimistic tombstone even though file cleanup could not have started until message deletion was accepted.
- An encrypted audio upload remained at `Uploading … 0%` indefinitely after the bridge closed.
- The application UI did not transition to reconnecting/offline when the bridge reported that it had closed.
- Repeating the deletion after reconnecting succeeded and removed both the message and its exclusively owned file.

The key defect is not that file cleanup failed. The primary message deletion failed before cleanup was authoritative, but the optimistic delete was not unwound and the room connection state did not reflect the bridge failure.

## Environment and evidence

- Application: Mosh
- Runtime: Matterhorn encrypted room runtime (`encrypted-event-v3-mls` in the captured diagnostics)
- Frontend delivery: injected Matterhorn frontend/app bridge
- Relay had reported `reconnecting`, followed by `connected`, earlier in the session.
- The captured browser diagnostics later contained:

  ```text
  [matterhorn.read-cursors] iframe read cursor publish failed
  error: "Matterhorn app bridge is closed."

  [matterhorn.read-cursors] launcher read cursor publish failed
  error: "Matterhorn app bridge is closed."

  Uncaught (in promise) Error: Matterhorn app bridge is closed.
  ```

Actor, device, room-scope, and peer identifiers have intentionally been omitted from this report.

## Reproduction

### Optimistic delete

1. Open a room containing a message with an exclusively owned encrypted attachment.
2. Interrupt or close the app bridge while issuing `messageDelete` or `directMessageDelete`.
3. Delete the message.
4. Observe that the message becomes a local tombstone immediately.
5. Observe that the application still appears connected, or does not clearly enter reconnecting/offline state.
6. Reload the application.
7. Observe that the original message returns because the relay never accepted the deletion.
8. Reconnect and delete it again.
9. Observe that the confirmed deletion succeeds, followed by `fileRemove`/`attachmentRemove` for the exclusively owned attachment.

### Hanging file upload

1. Record an audio message or queue another encrypted file.
2. Submit the attachment-only message so `files.upload` starts.
3. Close or lose the app bridge before upload progress or completion is returned.
4. Observe `Uploading <name> 0%` indefinitely.
5. Observe that Send remains disabled because the transfer phase never leaves `uploading`.
6. Observe that the room UI still does not clearly represent the closed bridge.

## Expected behavior

Matterhorn should maintain these invariants:

1. **Optimistic state is conditional.** An optimistic effect is visible only while its operation is genuinely pending or after the host has accepted it.
2. **Failure unwinds optimism.** If the bridge rejects, closes, times out, or becomes incapable of delivering an operation, all unaccepted optimistic effects associated with that operation are removed immediately.
3. **Connection state is truthful.** A closed app bridge cannot coexist with a public room status of `connected`.
4. **Failure ordering is deterministic.** Consumers should observe the offline/reconnecting connection state and the reconciled committed state as one coherent transition, without a long-lived optimistic tombstone.
5. **Pending RPCs settle.** Every operation and file-transfer promise must resolve or reject when its bridge closes. None may remain pending indefinitely.
6. **Reconnect is authoritative.** After reconnecting, Matterhorn refreshes authoritative state before accepting new optimistic overlays or reporting a fully connected state.

## Actual behavior

- `iframe-bridge-close` is visible in diagnostics, but the application does not consistently receive a corresponding relay/connection status transition.
- The message delete overlay remains visible even though reloading proves the authoritative state was unchanged.
- A file upload can remain pending forever at 0%.
- The UI therefore communicates three mutually inconsistent facts:

  - the room is usable/connected;
  - the message is deleted;
  - its attachment still exists or is uploading.

## Likely failure points

These are based on the local Matterhorn SDK source linked by Mosh. They are investigation targets, not a claim that every observed race follows exactly one code path.

### 1. `documentBootstrap.ts` rejects RPCs without publishing a closed connection

In `packages/matterhorn-sdk/src/launcher/documentBootstrap.ts`, `receiveBridgeMessage()` handles `matterhorn/iframe-bridge-close` by rejecting entries in `pending` and clearing the map.

That branch does not appear to perform the rest of the required local lifecycle transition:

- set the local `relayStatus` to `closed`;
- change the connection descriptor to offline/closed;
- update `scopeData` and `window.__MATTERHORN_APP_SCOPE__`;
- notify `subscribeRelayStatus` listeners;
- notify `subscribeConnectionDescriptor` listeners;
- prevent newly started RPCs from being posted through a bridge already known to be closed.

As a result, `host.getRelayStatus()` and `host.mode` may continue to describe an injected/connected bridge after pending calls have already failed with `Matterhorn app bridge is closed.`

The close transition should be published before pending RPCs are rejected so dispatch failure classification observes the new offline state.

### 2. Relay-status subscriptions do not have a local close publication path

`subscribeRelayStatus()` currently receives remote subscription values and stores the latest value, but the bootstrap needs a local subscriber registry or a shared `applyRelayStatus()` path that can also publish terminal local bridge failures.

An iframe bridge-close event is itself authoritative evidence that this transport is no longer connected. It should not wait for another RPC/subscription message from the bridge that just closed.

### 3. `MatterhornLiveRoomConnector` does not proactively discard optimism on terminal connection loss

`packages/matterhorn-sdk/src/browser/liveRoomConnector.ts` correctly removes the current optimistic operation inside the `dispatch()` rejection/catch paths and calls `recomputeState()`.

However, terminal connection handling is weaker:

- `setOffline()` patches status/message but does not clear unaccepted entries from `pendingOptimisticOperations`.
- The `relayStatus === "closed"` connection-descriptor path also patches offline/cached status without explicitly discarding unaccepted optimistic operations.
- Dispatch failure classification can use `unknown` rather than `offline` while `host.mode` incorrectly remains injected.

Even if every individual pending RPC normally rejects, a terminal transport transition should defensively remove every unaccepted optimistic operation and recompute from `rawState`. This covers lost close notifications, races between subscriptions and dispatch promises, and multiple operations pending when the bridge dies.

Accepted-but-not-yet-projected operations may need a separate reconciliation rule, but they must not remain indefinitely overlaid without an authoritative refresh.

### 4. Possible bridge-context mismatch or close-delivery race

The captured log shows some pending calls rejecting because the bridge closed, while the delete overlay and upload state did not settle correctly. This suggests one or more of the following should be tested:

- the close event reached one iframe/launcher bridge instance but not the instance owning the operation;
- an optimistic subscription event was applied after the dispatch rejection recomputed state;
- the close event cleared one pending RPC map while another context retained a pending call;
- the bridge closed before its connection-status subscription could publish `closed`;
- a SharedWorker port closed without synthesizing the equivalent iframe close lifecycle event;
- a pending accepted flag or projected optimistic event survived after the client operation failed.

Matterhorn should treat all bridge entry paths—iframe window messaging, SharedWorker port, launcher bridge, and vault bridge—consistently.

## Recommended Matterhorn changes

### Bootstrap/transport layer

1. Add a single idempotent `closeBridge(reason)` transition.
2. In that transition, in this order:

   1. mark the bridge closed so new RPCs reject immediately;
   2. set `relayStatus = "closed"`;
   3. set connection mode/descriptor to offline/closed;
   4. update scope globals;
   5. notify relay-status and connection-descriptor subscribers;
   6. reject every pending RPC exactly once;
   7. clear pending subscriptions and transport resources as appropriate.

3. Use the same transition for iframe close messages, SharedWorker/MessagePort closure, launcher teardown, and unrecoverable broker failure.
4. Preserve a distinct reconnecting transition for recoverable relay interruption; do not report `connected` until the bridge and authoritative state subscription are both ready.
5. Ensure `files.upload`, normal action dispatch, read-cursor publication, and all other RPC helpers inherit the same terminal settlement behavior.

### Live room/optimistic state layer

1. On terminal `closed`/offline status, remove all **unaccepted** pending optimistic operations.
2. Recompute visible state from the last committed `rawState` before notifying consumers.
3. Mark accepted-but-unprojected operations as requiring authoritative reconciliation; do not silently retain them forever.
4. Classify bridge-closed dispatch failures as `offline`, not `unknown`/generic error.
5. On reconnect, fetch/apply authoritative state before reporting a stable connected status.
6. Make the state/status emission order explicit and testable. A useful contract would be one snapshot containing both:

   - `status: "offline"` or `"reconnecting"`; and
   - state with rejected optimistic operations removed.

### Public consumer contract

Document that:

- `room.status` changes immediately on bridge loss;
- `room.subscribe()` receives the reconciled state/status snapshot;
- rejected optimistic operations are never retained after their dispatch promise settles negatively;
- file-transfer promises reject with a typed offline/bridge-closed error;
- reconnecting and terminal closed states are distinguishable.

## Required tests

### `documentBootstrap` tests

1. Start multiple RPCs, deliver `matterhorn/iframe-bridge-close`, and assert every promise rejects exactly once.
2. Assert `getRelayStatus()` returns `closed` immediately.
3. Assert relay-status listeners receive `closed`.
4. Assert connection-descriptor listeners receive offline/closed.
5. Assert RPCs started after closure reject synchronously/asynchronously without being posted.
6. Run the same behavior through iframe and SharedWorker/MessagePort bridge paths.

### `liveRoomConnector` optimistic rollback tests

1. Seed an authoritative message with an attachment.
2. Dispatch an optimistic `messageDelete` whose host promise remains pending.
3. Assert the local tombstone appears while the operation is pending.
4. Close the bridge.
5. Assert the dispatch settles with an offline failure.
6. Assert the tombstone is removed and the original authoritative message is visible again without reload.
7. Assert room status is no longer connected in the same observable transition.
8. Repeat with several simultaneous optimistic operations and verify all unaccepted overlays are removed.
9. Repeat for a direct-message delete.

### Reconnect tests

1. Fail an optimistic delete through bridge closure.
2. Reconnect with authoritative state that still contains the message.
3. Assert no stale optimistic delete is reapplied.
4. Report connected only after authoritative state has been applied.
5. Repeat where the relay actually accepted the operation immediately before transport loss; reconciliation should preserve the authoritative tombstone rather than blindly restoring the message.

### File transfer tests

1. Start `files.upload` and emit initial 0% progress.
2. Close the bridge.
3. Assert the upload promise rejects promptly with a typed offline/bridge-closed error.
4. Assert no progress callbacks are delivered after settlement.
5. Assert a new upload cannot start while the bridge is closed.
6. Reconnect and verify an explicit retry can start a new authoritative upload.

## Acceptance criteria

- A bridge close changes public connection status away from connected immediately.
- A failed optimistic delete returns to the original message without requiring reload.
- If the delete was accepted before disconnection, authoritative replay preserves the deletion.
- A file upload cannot remain pending indefinitely after bridge closure.
- Consumers receive a typed, actionable offline/bridge-closed error.
- UI built from Matterhorn's public room snapshot cannot simultaneously show connected status and rejected optimistic state.
- All bridge transport variants satisfy the same lifecycle tests.

## Mosh-side safeguards

Mosh now includes defensive behavior while the Matterhorn fix is pending:

- stalled uploads are aborted after a no-progress interval;
- removing an uploading draft cancels its local operation;
- deletion UI distinguishes unconfirmed message deletion from confirmed deletion with incomplete attachment cleanup;
- failed deletion/cleanup exposes an explicit retry;
- optimistic/deleted tombstones do not render stale attachment cards.

These safeguards improve recovery and prevent permanently broken UI entries, but they are not substitutes for Matterhorn unwinding optimistic state and publishing truthful bridge connection status at the transport/runtime layer.
