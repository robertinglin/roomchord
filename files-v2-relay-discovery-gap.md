# Matterhorn gap: Files v2 binds redundant files to a specific relay

## Summary

Files v2 currently uploads an encrypted file to multiple eligible relays, but the read path still treats the relay address stored in each file record as a required request target. That makes a supposedly redundant room file dependent on which physical relay the client happens to be connected to.

After a reconnect or relay failover, a valid persisted file can no longer be inspected or downloaded when its stored locator names a different relay. The connected relay rejects the request with:

```text
The Files v2 request targets another relay.
```

This is the wrong abstraction for redundant room storage. A file record should identify committed encrypted content. Relay entries should be replica hints, not a requirement that the client already have a transport session to one exact endpoint. A client connected to any relay trusted by the room should be able to ask for the file, and Matterhorn should discover or route to an authorized healthy replica.

This is a Matterhorn protocol/runtime gap, not a Mosh rendering bug.

## User-visible failure

The observed sequence was:

1. A user recorded and sent a voice message.
2. The encrypted upload completed and the message initially rendered and played correctly.
3. The page was reloaded or the room connection moved to another relay.
4. Matterhorn replayed the persisted file record.
5. Mosh called `live.files.inspect(record)` to recover the encrypted title, filename, and MIME type.
6. Matterhorn sent a Files v2 peer request containing the old record's relay address over the currently borrowed room relay session.
7. The current relay rejected the request as targeting another relay.
8. Manifest inspection failed, so the UI could only render a generic `File` attachment. Preview and download were also unavailable.

The generic card is only a downstream symptom. Mosh intentionally does not persist encrypted attachment metadata as a second plaintext application copy. The authoritative metadata must remain recoverable through the file service after reload.

## Current implementation

### Upload creates explicit per-relay references

`matterhorn-sdk/src/browser/filesV2Service.ts` discovers all currently available eligible relays, uploads the encrypted file to them in parallel, and publishes references shaped like:

```ts
type FilesV2RelayBlobReference = {
  relayUrl: string;
  blobId: string;
};
```

This establishes multiple copies at upload time, but it also embeds physical locations into the durable room file record.

Publication currently proceeds when at least one eligible relay completes. There is no enforced replica quorum or desired-copy policy, so the number of durable copies is an incidental result of which capability and upload requests succeeded.

### Read follows those locations literally

For Files v3 records, `resolveManifestFromRelay()` iterates `record.relays`. A peer locator is passed to `peerTransport.getBlobManifest()`, and downloads similarly pass it to `peerTransport.getBlobChunk()`.

The transport therefore treats `relayUrl` as the exact target for every read rather than as a replica hint that can be resolved through the trusted relay mesh.

### The app bridge borrows one physical session

`matterhorn-sdk/src/launcher/appBridge.ts` constructs the file transport with the room's currently borrowed session:

```ts
peerTransport: createFilesV2PeerTransport({
  session
})
```

`matterhorn-sdk/src/browser/filesV2PeerTransport.ts` places the locator's `relayAddress` into the request but sends the request through that single borrowed session.

If the borrowed session is connected to relay A and the persisted locator names relay B, the request physically reaches A while claiming B as its target.

### The relay correctly rejects the contradictory request

`matterhorn-relay/src/filesV2PeerProtocol.cjs` checks:

```js
if (typeof relayAddress === "string" && request.relayAddress !== relayAddress) {
  throw new FilesV2Error(
    403,
    "file-relay-mismatch",
    "The Files v2 request targets another relay."
  );
}
```

That check is reasonable for the current targeted protocol: a relay must not pretend to be another relay. Removing the check alone would be incorrect. The defect is that the protocol and client require an exact target instead of providing trusted replica discovery or routing.

## Why opening a second client session is not the complete fix

Matterhorn could make the immediate error disappear by opening a physical client session to every `record.relays[n].relayUrl`. That is useful as a short-term compatibility path, but it does not satisfy the intended redundancy model:

- relay addresses can change while the encrypted content remains valid;
- a recorded relay can be offline even though another trusted relay holds the same file;
- a newly trusted relay may hold a repaired replica but not appear in an old record;
- a revoked relay can remain embedded in historical records;
- clients should not need to understand mesh topology or manage one transport per replica;
- relay discovery and trust policy already belong at the relay/mesh layer;
- exact physical locators make availability depend on stale topology rather than content identity and room policy.

Opening the correct targeted session should be retained only as a legacy fallback while discovery is introduced.

## Required model

### File records identify content, not a required route

A durable file record should commit to the encrypted object and its integrity properties, including at least:

- room ID and file ID;
- revision;
- encrypted manifest digest and byte length;
- ciphertext byte length and chunk count;
- encryption/integrity profile;
- any room operation needed to establish authorization.

Known relay/blob pairs may remain as bounded hints for compatibility and repair, but they must not define the only legal read route.

### Reads start at the connected trusted relay

`files.inspect(record)` and `files.download(record)` should issue a discovery/read request to the relay session the client actually has. Conceptually:

```text
client -> connected trusted relay:
  resolve encrypted file(roomId, fileId, revision, manifest commitment)

connected relay:
  1. check its local replica index;
  2. if absent, query only relays authorized by the current signed room relay policy;
  3. return or proxy one or more verified replica candidates;
  4. optionally repair the local replica according to policy.
```

The request's relay identity must describe the session that receives it. The desired file is selected by its room/file identity and commitment, not by claiming that the receiving connection is another relay.

### The relay layer owns replica discovery

Matterhorn should choose one explicit protocol behavior:

1. **Local serve with mesh repair (preferred):** every authorized trusted relay is expected to hold the replica. If the connected relay is missing it, the relay obtains and verifies it from a trusted peer, stores it locally, then serves it to the client.
2. **Trusted proxy:** the connected relay locates a trusted holder and proxies bounded encrypted manifest/chunk responses without exposing another physical endpoint to the client.
3. **Signed redirect:** the connected relay returns a short-lived, room-authorized locator for a trusted holder and the SDK opens that route. The redirect must be authenticated, bounded, non-recursive, and verified against current room policy.

The first option best matches the expectation that trusted relays provide redundant storage and gives clients the simplest, most stable contract. Proxy or redirect can be used while repair completes.

### Replication has an explicit policy and health state

Uploading to whatever relays happen to answer one client capability probe is not a complete replication system. Matterhorn needs a declared room file-storage policy, for example:

- eligible trusted storage relays;
- desired replica count or quorum;
- minimum copies required before publication succeeds;
- repair behavior when a relay joins, returns, or loses data;
- garbage-collection behavior after file removal;
- revocation behavior when a relay leaves the trusted set;
- observable replication health without exposing encrypted metadata.

A published file should remain readable while the policy's availability guarantee is met, regardless of which trusted relay currently hosts the room connection.

## Security and privacy requirements

Discovery must not weaken the existing room and file boundaries.

1. Only a relay authorized by the room's current signed relay policy may answer, proxy, store, or receive a replica.
2. Restricted and nondiscoverable rooms must not be globally searchable. Discovery is scoped to an authenticated room session and the authorized trusted mesh.
3. A request must bind room ID, file ID, revision, and manifest commitment. A bare blob ID is not sufficient authorization or identity.
4. Relays must not learn plaintext title, filename, MIME type, waveform, or message body. They only route encrypted manifests and ciphertext.
5. The client must continue verifying manifest digest, manifest length, file ID, revision, ciphertext lengths, chunk digests, and authenticated decryption.
6. A discovered candidate that does not match the public room record is rejected and reported as an integrity failure, not silently tried as equivalent content.
7. Revoked and untrusted relays must be excluded even if an old file record still names them.
8. Discovery responses must be authenticated and replay-bounded. Redirects, if used, need a short expiry and explicit room/file binding.
9. Requests and responses must retain existing size, concurrency, and timeout bounds to avoid turning mesh discovery into amplification.
10. Removal/tombstone propagation must prevent repair from resurrecting a deleted file.

## Public SDK contract

The public contract should guarantee:

- `files.inspect(record)` works after reload and relay failover while any authorized replica is available;
- `files.download(record)` does not require the application to choose or connect to a specific relay;
- the SDK automatically retries another discovered authorized replica after a transport failure or integrity rejection;
- applications receive stable typed errors that distinguish no authorized replica, discovery unavailable, offline, policy denial, and integrity failure;
- application code does not need to persist decrypted metadata to keep attachment types and filenames after reload;
- relay topology changes do not change file identity or require rewriting historical message records.

Suggested error categories:

- `file-replica-unavailable`: no healthy authorized replica could be found;
- `file-discovery-unavailable`: discovery could not complete because the trusted mesh is unavailable;
- `file-replication-below-policy`: a write completed locally but did not reach the required replica policy;
- `file-room-relay-policy-denied`: the connected relay is not authorized for room file storage/routing;
- existing typed integrity errors for commitment or ciphertext mismatches.

`file-relay-mismatch` may remain as an internal protocol-defense error, but normal public reads must not create contradictory targeted requests that trigger it.

## Compatibility and migration

Existing Files v2/v3 records already contain explicit relay/blob references. They should remain readable.

1. Treat historical references as discovery seeds and integrity-bound replica hints.
2. Ask the connected trusted relay to resolve the file first.
3. Permit a directly targeted legacy read only when the SDK has a physical session to that exact relay and current room policy still trusts it.
4. When a legacy replica is found, authorized relays may repair/re-index it under the new discovery model.
5. Do not require rewriting old message events merely because replica topology changed.
6. New records may retain a bounded set of hints during migration, but correctness must not depend on them being current.

## Required tests

### SDK failover and reload

1. Upload a file with replicas on relays A and B.
2. Publish the file record and reload the client while connected to B.
3. Call `files.inspect(record)` and `files.download(record)`.
4. Assert metadata and bytes are returned without a request claiming B is A.
5. Repeat with the original upload relay offline.
6. Repeat after promoting a standby relay during an in-flight manifest read.
7. Assert the application never receives `file-relay-mismatch` during a valid read.
8. In a peer-only A/B topology with no HTTP fallback, connect through A with a record hinting B and assert the SDK never sends a request that claims B over the A session. The discovery request must identify A as its receiving relay and select the object by room/file identity and commitment.
9. Run the same cases for a Files v2 inline encrypted manifest and a Files v3 out-of-band encrypted manifest.
10. Run concurrent inspect and download operations during primary failover and verify both settle, owned sessions are closed, borrowed sessions remain open, and no per-replica connection leaks.

### Discovery and repair

1. Connect through trusted relay C that does not yet hold the file while A does.
2. Resolve the file through C.
3. Assert C queries only relays allowed by the signed room policy.
4. Assert C proxies or repairs the exact committed encrypted object.
5. Disconnect A and verify a subsequent read through C still succeeds when repair policy requires local retention.
6. Add a newly trusted relay and verify background or on-demand repair makes it an eligible replica.
7. Verify a second read through C is served locally after the first read repairs its missing replica.
8. Define the required replica policy and test one successful copy against the required quorum, including whether publication occurs and which typed error is returned.

### Trust and revocation

1. Include an untrusted relay in a stale historical locator and verify it is not queried.
2. Revoke a formerly trusted relay and verify discovery excludes it immediately at the new policy epoch.
3. Verify a nondiscoverable room cannot be probed without an authenticated room session.
4. Return a signed redirect to a relay outside policy and verify the SDK rejects it.
5. Verify discovery cannot cross room IDs even when blob IDs collide.
6. Cache a discovery result, advance the room relay-policy epoch, and verify the cache is invalidated before another read.
7. Verify cache invalidation after relay revocation, file tombstone/removal, and a repaired-replica update.

### Integrity

1. Return a replica with the right file ID but wrong manifest digest.
2. Return a valid manifest with a wrong chunk digest or ciphertext length.
3. Assert the client rejects the candidate, records the integrity failure, and may try another authorized replica.
4. Assert no invalid candidate is cached or used for repair.
5. Assert discovery responses expose no plaintext title, filename, MIME type, message body, or waveform data.
6. Assert every candidate remains bound to room ID, file ID, revision, manifest digest and length, ciphertext lengths, and chunk commitments.

### Deletion

1. Replicate a file across multiple trusted relays.
2. Publish its authoritative removal.
3. Verify removal/garbage-collection reaches every replica according to policy.
4. Attempt discovery through a lagging relay and verify the tombstone prevents the file from being repaired or served as live content.

### Legacy locator migration

1. Read a legacy record whose only stored locator is offline while a newly trusted relay holds a valid replica.
2. Repeat when the stored locator is stale, revoked, or no longer present in room policy.
3. Assert discovery succeeds through the new authorized replica without rewriting the historical message event.
4. Keep a protocol-defense test that deliberately sends a malformed targeted request and verify the relay still returns `file-relay-mismatch`; valid discovery reads should avoid creating that request rather than weakening the check.

### Mosh integration regression

1. Send an audio-only message.
2. Confirm its human-readable filename, MIME type, duration, waveform, and playback.
3. Reload while connected through a different trusted relay.
4. Confirm the message still renders as audio rather than generic `File`.
5. Play it immediately and verify the waveform progress updates on the first play.

## Acceptance criteria

- A file replicated under room policy remains inspectable and downloadable through any currently connected trusted relay that can reach an authorized replica.
- Reloading or failing over does not turn an audio attachment into a generic file.
- Applications never need to select a relay or maintain relay-specific file sessions.
- Old physical locators are hints, not permanent routing requirements.
- Discovery never contacts a relay that is untrusted or revoked under the current signed room policy.
- Every returned or repaired replica is verified against the durable room file commitment.
- A deleted file cannot be resurrected by discovery or repair.
- The client receives a meaningful availability or policy error only when no authorized path to a valid replica exists.

## Mosh responsibility

Mosh should continue to render a clear unavailable state when `inspect()` or `download()` fails, rather than silently pretending a generic card is fully usable. It may also expose retry after connection recovery.

Mosh cannot safely implement trusted-relay discovery itself. It does not own relay trust evaluation, mesh topology, replica repair, transport session ownership, or the authoritative file integrity protocol. The durable fix belongs in Matterhorn's Files service, app bridge, relay protocol, and relay mesh.
