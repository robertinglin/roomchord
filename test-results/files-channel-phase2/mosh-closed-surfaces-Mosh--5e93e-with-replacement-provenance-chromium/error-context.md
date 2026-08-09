# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:82:3

# Error details

```
Error: guest did not become ready. URL=http://127.0.0.1:37836/matterhorn/?roomPeerId=matterhorn-dev-local-3a6e03dbdf2c98a1890ae5dddd575528-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-3a6e03dbdf2c98a1890ae5dddd575528-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A33115%2Fpeerjs#/room/local-3a6e03dbdf2c98a1890ae5dddd575528?inviteId=invite_hHrtJA49ePb7EJviQ93g-w&genesisHash=sha256%3A8ff36ea90f653ba41f8f59605e6aadd95551afd981f373d2b1917a710333aeae&inviteKey=LLY1H7MQq3-YzREvzCWDTr3pQHQQQNlgCHV-ipUWM40&runtimeMode=encrypted-event-v3-mls
Page=http://127.0.0.1:37836/matterhorn/?roomPeerId=matterhorn-dev-local-3a6e03dbdf2c98a1890ae5dddd575528-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-3a6e03dbdf2c98a1890ae5dddd575528-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A33115%2Fpeerjs#/room/local-3a6e03dbdf2c98a1890ae5dddd575528?
tId: compartment-key-request_b21560afe6fa054733a3bfe6e79beed2, senderMemberId: wrap:ZJAo_9rsPm8nnooRIn3p7WV51kWRArpf3lJDXXVj9UA, senderDeviceId: wrap:vFQWShLmMjeKWFF-i4zFD-ww4zxx6JVk9qcI7nM-L2Y, scopeType: wrap:ws2qQmFvGsDH_JL2srOzgWN-gu2-RC7jUp68FPieMZc}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[admin info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key recovered {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, requestId: compartment-key-request_9a17caefaf1e567d54895ea0ce96e249, senderMemberId: wrap:EL0AS8fscXRiuwbZmI4zNBl7hIqAokzb-3sY-uMLPec, senderDeviceId: wrap:ZTl6kNqD-9xTIahJxjV6vkUbzAYwJF4dZKHQLgs854s, scopeType: wrap:3EnlENNYRgE_GVxdK9F51kUu-bRt1bIlj-NbixY7LVk}
[admin info] [matterhorn app-bridge] compartment key recovery replay deferred {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, eventCount: 1, missingKeyCount: 1, reasonCounts: Object}
[moderator info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-request-available, epoch: 2}
[moderator info] [matterhorn app-bridge] compartment key requests received {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, epoch: 2, count: 7}
[member info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-request-available, epoch: 2}
[moderator info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[moderator info] [matterhorn app-bridge] compartment key response published {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, requestId: compartment-key-request_9a17caefaf1e567d54895ea0ce96e249, recipientMemberId: wrap:MYM3bsTDlEhW224tFepo8fRUZdVkZyO-IDPVdNvdUbM, recipientDeviceId: wrap:t_-upM9BHvkYPtvXXji1Ne3xMAabqy25NnCjBjPRmtI}
[moderator info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[moderator info] [matterhorn app-bridge] compartment key response published {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, requestId: compartment-key-request_e13cfbdc57391970802c353bb54670c9, recipientMemberId: wrap:MYM3bsTDlEhW224tFepo8fRUZdVkZyO-IDPVdNvdUbM, recipientDeviceId: wrap:t_-upM9BHvkYPtvXXji1Ne3xMAabqy25NnCjBjPRmtI}
[member info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[member info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[member info] [matterhorn app-bridge] compartment key requests received {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, epoch: 2, count: 7}
[moderator info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[member info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[member info] [matterhorn app-bridge] compartment key response published {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, requestId: compartment-key-request_e13cfbdc57391970802c353bb54670c9, recipientMemberId: wrap:MYM3bsTDlEhW224tFepo8fRUZdVkZyO-IDPVdNvdUbM, recipientDeviceId: wrap:t_-upM9BHvkYPtvXXji1Ne3xMAabqy25NnCjBjPRmtI}
[admin info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-request-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key recovered {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, requestId: compartment-key-request_e13cfbdc57391970802c353bb54670c9, senderMemberId: wrap:ZJAo_9rsPm8nnooRIn3p7WV51kWRArpf3lJDXXVj9UA, senderDeviceId: wrap:vFQWShLmMjeKWFF-i4zFD-ww4zxx6JVk9qcI7nM-L2Y, scopeType: wrap:ws2qQmFvGsDH_JL2srOzgWN-gu2-RC7jUp68FPieMZc}
[admin info] [matterhorn app-bridge] compartment key requests received {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, epoch: 2, count: 7}
[moderator info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[member info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[moderator info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[member info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key response published {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, requestId: compartment-key-request_b21560afe6fa054733a3bfe6e79beed2, recipientMemberId: wrap:EL0AS8fscXRiuwbZmI4zNBl7hIqAokzb-3sY-uMLPec, recipientDeviceId: wrap:ZTl6kNqD-9xTIahJxjV6vkUbzAYwJF4dZKHQLgs854s}
[admin info] [matterhorn app-bridge] compartment key recovery record available {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, recordType: relay/mls-compartment-key-delivery-available, epoch: 2}
[admin info] [matterhorn app-bridge] compartment key response published {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, requestId: compartment-key-request_93fd1a229b8a76cfbf3eeea2e6ff46a7, recipientMemberId: wrap:ZJAo_9rsPm8nnooRIn3p7WV51kWRArpf3lJDXXVj9UA, recipientDeviceId: wrap:vFQWShLmMjeKWFF-i4zFD-ww4zxx6JVk9qcI7nM-L2Y}
[guest info] [matterhorn app-bridge] create starting {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, roomPeerId: matterhorn-dev-local-3a6e03dbdf2c98a1890ae5dddd575528-standalone, relayAddress: peerjs:matterhorn-dev-local-3a6e03dbdf2c98a1890ae5…5528-standalone-relay@ws://127.0.0.1:33115/peerjs, hasSecret: false, hasInviteKey: true}
[guest info] [matterhorn app-bridge] profile loaded {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, profileId: user_344522273492836352, hasRootKey: true, configUserId: undefined}
[guest info] [matterhorn app-bridge] relay session ready {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, clientId: user_344522273492836352, peerId: 8b271f24-428b-4188-91ee-4777c19584b9, peerAddress: peerjs:8b271f24-428b-4188-91ee-4777c19584b9@ws://127.0.0.1:33115/peerjs, relayStatus: connected}
[guest info] [matterhorn app-bridge] requesting room info {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, peerId: 8b271f24-428b-4188-91ee-4777c19584b9}
[guest info] [matterhorn app-bridge] room info received {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, runtimeMode: encrypted-event-v3-mls, frontendId: gg.matterhorn.mosh.player, appPackId: gg.matterhorn.mosh}
[guest info] [matterhorn app-bridge] invite grant resolved {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, inviteId: invite_hHrtJA49ePb7EJviQ93g-w, fromEncryptedMetadata: true}
[guest info] [matterhorn app-bridge] actor resolved {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: wrap:PxW3m6VcU0wfx4DjwyWEpYfgINOerOVbTN8GW7y6wxw, deviceId: wrap:i2wP7kbZBhpkbF5bwaBhZVpQVyokSqDFsAv-LqvppS8, role: guest}
[guest info] [matterhorn app-bridge] hello sent {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, clientId: user_344522273492836352}
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] [matterhorn direct launch] startup failed Error: Room frontend file download failed: 404
    at ale (http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:57508)
    at async http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:57983
    at async Promise.all (index 0)
    at async sle (http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:57936)
    at async ile (http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:56092)
    at async nle (http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:55942)
    at async SM (http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:61236)
    at async hle (http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:61469)
    at async gle (http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:61949)
    at async $M (http://127.0.0.1:37836/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:832:19145)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest error] Failed to load resource: the server responded with a status of 404 (Not Found)
[guest info] [matterhorn app-bridge] resuming durable MLS external Commit {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: wrap:PxW3m6VcU0wfx4DjwyWEpYfgINOerOVbTN8GW7y6wxw, deviceId: wrap:i2wP7kbZBhpkbF5bwaBhZVpQVyokSqDFsAv-LqvppS8, parentHeadHash: sha256-b598cab65cc05d380a12de3467ce43beaa7b72cd0a34008b19968298509eb7d4, candidateHash: sha256-99ee27addaacad55ac58485e276ef457dd45571db9be728039dd8f08d4bda031}
[guest info] [matterhorn app-bridge] MLS external Commit admitted {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, role: guest, epoch: 3, attempts: 1}
[guest info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: user_344522206922756096, epochId: mls-epoch-2, pendingCount: 1}
[guest info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: user_344522206922756096, epochId: mls-epoch-2, pendingCount: 1}
[guest info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, epoch: 3, pendingPresenceCount: 1}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[guest info] [matterhorn app-bridge] installed {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, mode: injected, relayStatus: connected}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: user_344522273492836352, epochId: mls-epoch-3, pendingCount: 1}
[member info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: user_344522273492836352, epochId: mls-epoch-3, pendingCount: 2}
[moderator info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: user_344522273492836352, epochId: mls-epoch-3, pendingCount: 1}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[member info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: user_344522178297565184, epochId: mls-epoch-1, pendingCount: 2}
[member info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, epoch: 3, pendingPresenceCount: 1}
[moderator warning] [matterhorn replay] encrypted history received {"roomName":"local-3a6e03dbdf2c98a1890ae5dddd575528","actorId":"wrap:ZJAo_9rsPm8nnooRIn3p7WV51kWRArpf3lJDXXVj9UA","eventCount":6,"total":6,"checkpointEvents":0}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, epoch: 3, pendingPresenceCount: 0}
[moderator info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, epoch: 3, pendingPresenceCount: 0}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[guest info] [matterhorn app-bridge] presence publication failed {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, error: Room relay session closed.}
[guest info] [matterhorn app-bridge] presence publish rejected {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, memberId: wrap:PxW3m6VcU0wfx4DjwyWEpYfgINOerOVbTN8GW7y6wxw, epochId: mls-epoch-3}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
[moderator info] [mosh.voice] media state {roomName: local-3a6e03dbdf2c98a1890ae5dddd575528, transport: sfu, status: unavailable, mediaRoomId: undefined, sessionId: undefined}
```