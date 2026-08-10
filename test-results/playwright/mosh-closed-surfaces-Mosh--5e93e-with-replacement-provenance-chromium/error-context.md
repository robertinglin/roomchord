# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:96:3

# Error details

```
Error: moderator did not become ready. URL=http://127.0.0.1:45738/matterhorn/?roomPeerId=matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A35899%2Fpeerjs#/room/local-51143587e118eb35040d03f07b949947?inviteId=invite_3guKYcVrELVb56d8Azpuwg&genesisHash=sha256%3Afb7038af64c3d7cf4887e02bd0d9a0de0747c274e02d96f9112297a890b109aa&inviteKey=NaMuGrAeWcQcoLuPzfUO_VNQx6OVoG_sVi_Q8iUUlyA&runtimeMode=encrypted-event-v3-mls
Page=http://127.0.0.1:45738/matterhorn/?roomPeerId=matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A35899%2Fpeerjs#/room/local-51143587e118eb35040d03f07b949947?inviteId=invite_3guKYcVrELVb56d8Azpuwg&genesisHash=sha256%3Afb7038af64c3d7cf4887e02bd0d9a0de0747c274e02d96f9112297a890b109aa&inviteKey=NaMuGrAeWcQcoLuPzfUO_VNQx6OVoG_sVi_Q8iUUlyA&runtimeMode=encrypted-event-v3-mls
wser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/signing.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
[plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/ngramIndex.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
[plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/nostrMapping.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
[plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/validation/payload.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
matterhorn dev launcher build stdout: ✓ 371 modules transformed.
matterhorn dev launcher build stdout: rendering chunks...
matterhorn dev launcher build stdout: computing gzip size...
matterhorn dev launcher build stdout: client/dist/vault.html                                     0.95 kB │ gzip:   0.41 kB
client/dist/app.html                                       1.14 kB │ gzip:   0.57 kB
client/dist/launcher.html                                  1.17 kB │ gzip:   0.45 kB
client/dist/vault-unlock.html                              1.72 kB │ gzip:   0.82 kB
client/dist/assets/appBridgeBroker-DMZwYzML.js             2.35 kB
client/dist/index.html                                     4.85 kB │ gzip:   1.46 kB
client/dist/assets/sharedWorker-ClBJptRj.js            1,538.63 kB
client/dist/openmls-wasm.wasm                          1,952.95 kB │ gzip: 728.20 kB
client/dist/assets/index-BBi7tRL-.css                      0.17 kB │ gzip:   0.15 kB
client/dist/assets/styles-BJeEMOI_.css                    46.55 kB │ gzip:   8.38 kB
client/dist/assets/launchDiagnostics-DqVI4Mqx.js           0.07 kB │ gzip:   0.09 kB
client/dist/assets/vaultOriginPolicy-Kmwwf8Qu.js           0.48 kB │ gzip:   0.32 kB
client/dist/assets/modulepreload-polyfill-CWIbYaaI.js      0.71 kB │ gzip:   0.40 kB
client/dist/assets/rolldown-runtime-M0oDzQ_3.js            0.82 kB │ gzip:   0.47 kB
client/dist/assets/vault-C4IKP4_m.js                       1.01 kB │ gzip:   0.58 kB
client/dist/assets/app-1EDm1mvB.js                         2.98 kB │ gzip:   1.34 kB
client/dist/assets/index-BX8YWPqG.js                       4.41 kB │ gzip:   1.77 kB
client/dist/assets/vaultUnlock-Ds6ybhls.js                 4.41 kB │ gzip:   1.99 kB
client/dist/assets/directRoomStartup-CRkdD0_L.js          11.43 kB │ gzip:   3.97 kB
client/dist/assets/launcher-CwDvuFnv.js                  106.76 kB │ gzip:  28.19 kB
client/dist/assets/vendor-DBS1gDj1.js                    207.89 kB │ gzip:  67.59 kB
client/dist/assets/matterhorn-sdk-CQJcZ2K7.js          1,927.59 kB │ gzip: 491.35 kB
matterhorn dev launcher build stderr: [INEFFECTIVE_DYNAMIC_IMPORT] node_modules/.pnpm/peerjs@1.5.5/node_modules/peerjs/dist/bundler.mjs is dynamically imported by packages/matterhorn-sdk/src/launcher/appBridgeMedia.ts but also statically imported by packages/matterhorn-sdk/src/launcher/profileTransfer.ts, packages/matterhorn-sdk/src/launcher/relaySession.ts, dynamic import will not move module into another chunk.
matterhorn dev launcher build stderr: [plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
matterhorn dev launcher build stderr: [INEFFECTIVE_DYNAMIC_IMPORT] packages/matterhorn-sdk/src/launcher/relaySession.ts is dynamically imported by packages/matterhorn-sdk/src/launcher/appBridge.ts, packages/matterhorn-sdk/src/launcher/personalState.ts, packages/matterhorn-sdk/src/launcher/relaySessionPort.ts but also statically imported by packages/matterhorn-sdk/src/launcher/bundleDownload.ts, packages/matterhorn-sdk/src/launcher/profileTransfer.ts, packages/matterhorn-sdk/src/launcher/relayManagementOwnerData.ts, dynamic import will not move module into another chunk.
matterhorn dev launcher build stdout: ✓ built in 721ms
Matterhorn dev launcher is live at http://127.0.0.1:45738/matterhorn/
Matterhorn app: Mosh (gg.matterhorn.mosh@1.0.0)
[mtn-debug-tools] developer plugin installed for published room local-51143587e118eb35040d03f07b949947
Frontend release: /tmp/mosh-playwright-lYZ5nQ/dist/matterhorn-mosh.js
Using the local development repository. This preview is non-shareable and remains available only while matterhorn dev is running.
Room genesis durably stored by peerjs:matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay@ws://127.0.0.1:35899/peerjs.
owner invite: http://127.0.0.1:45738/matterhorn/?roomPeerId=matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A35899%2Fpeerjs#/room/local-51143587e118eb35040d03f07b949947?inviteId=invite_QA4VAic5QcYvOKdYIJi-Tw&genesisHash=sha256%3Afb7038af64c3d7cf4887e02bd0d9a0de0747c274e02d96f9112297a890b109aa&inviteKey=b5gvoC8z82OUpnYmCul8OcEjM3ieF9Axu7WRqcXzYXI&runtimeMode=encrypted-event-v3-mls
member invite: http://127.0.0.1:45738/matterhorn/?roomPeerId=matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A35899%2Fpeerjs#/room/local-51143587e118eb35040d03f07b949947?inviteId=invite_3guKYcVrELVb56d8Azpuwg&genesisHash=sha256%3Afb7038af64c3d7cf4887e02bd0d9a0de0747c274e02d96f9112297a890b109aa&inviteKey=NaMuGrAeWcQcoLuPzfUO_VNQx6OVoG_sVi_Q8iUUlyA&runtimeMode=encrypted-event-v3-mls
guest invite: http://127.0.0.1:45738/matterhorn/?roomPeerId=matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A35899%2Fpeerjs#/room/local-51143587e118eb35040d03f07b949947?inviteId=invite_MmVxZwoqpRJsO1Imkt3fEQ&genesisHash=sha256%3Afb7038af64c3d7cf4887e02bd0d9a0de0747c274e02d96f9112297a890b109aa&inviteKey=CUAexqDJN-Sb5D5lsrC1_MEDAKVmbLP8F4bOpDbIJY0&runtimeMode=encrypted-event-v3-mls

[admin info] [matterhorn app-bridge] create starting {roomName: local-51143587e118eb35040d03f07b949947, roomPeerId: matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone, relayAddress: peerjs:matterhorn-dev-local-51143587e118eb35040d03…9947-standalone-relay@ws://127.0.0.1:35899/peerjs, hasSecret: false, hasInviteKey: true}
[admin info] [matterhorn app-bridge] profile loaded {roomName: local-51143587e118eb35040d03f07b949947, profileId: user_345147201649377280, hasRootKey: true, configUserId: undefined}
[admin info] [matterhorn app-bridge] relay session ready {roomName: local-51143587e118eb35040d03f07b949947, clientId: user_345147201649377280, peerId: 806b0026-cdbf-4c4b-ba67-38a154a59c4b, peerAddress: peerjs:806b0026-cdbf-4c4b-ba67-38a154a59c4b@ws://127.0.0.1:35899/peerjs, relayStatus: connected}
[admin info] [matterhorn app-bridge] requesting room info {roomName: local-51143587e118eb35040d03f07b949947, peerId: 806b0026-cdbf-4c4b-ba67-38a154a59c4b}
[admin info] [matterhorn app-bridge] room info received {roomName: local-51143587e118eb35040d03f07b949947, runtimeMode: encrypted-event-v3-mls, frontendId: gg.matterhorn.mosh.player, appPackId: gg.matterhorn.mosh}
[admin info] [matterhorn app-bridge] invite grant resolved {roomName: local-51143587e118eb35040d03f07b949947, inviteId: invite_QA4VAic5QcYvOKdYIJi-Tw, fromEncryptedMetadata: true}
[admin info] [matterhorn app-bridge] actor resolved {roomName: local-51143587e118eb35040d03f07b949947, memberId: wrap:iXvtkfyXrNn-xKx741AMLKaZZ2kQ3AeP8zm4Q6aZpQM, deviceId: wrap:sPgnswhXz-qhpD5kTWkcPePvHMX_kTyCQyFZYhIRe0A, role: admin}
[admin info] [matterhorn app-bridge] hello sent {roomName: local-51143587e118eb35040d03f07b949947, clientId: user_345147201649377280}
[launcher asset requestfailed] phase=startup page=admin pageUrl=http://127.0.0.1:45738/matterhorn/?roomPeerId=matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A35899%2Fpeerjs#/room/local-51143587e118eb35040d03f07b949947?inviteId=invite_QA4VAic5QcYvOKdYIJi-Tw&genesisHash=sha256%3Afb7038af64c3d7cf4887e02bd0d9a0de0747c274e02d96f9112297a890b109aa&inviteKey=b5gvoC8z82OUpnYmCul8OcEjM3ieF9Axu7WRqcXzYXI&runtimeMode=encrypted-event-v3-mls status=n/a url=http://127.0.0.1:46825/gg.matterhorn.mosh/sha256-2c198ef4989d39b420d59c9988a5a9b279a41a4eae1f460b0a0bb672d5dfac30/chord-icon.svg error=net::ERR_ABORTED
[launcher asset requestfailed] phase=startup page=admin pageUrl=http://127.0.0.1:45738/matterhorn/?roomPeerId=matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A35899%2Fpeerjs#/room/local-51143587e118eb35040d03f07b949947?inviteId=invite_QA4VAic5QcYvOKdYIJi-Tw&genesisHash=sha256%3Afb7038af64c3d7cf4887e02bd0d9a0de0747c274e02d96f9112297a890b109aa&inviteKey=b5gvoC8z82OUpnYmCul8OcEjM3ieF9Axu7WRqcXzYXI&runtimeMode=encrypted-event-v3-mls status=n/a url=http://127.0.0.1:46825/gg.matterhorn.mosh/sha256-2c198ef4989d39b420d59c9988a5a9b279a41a4eae1f460b0a0bb672d5dfac30/audio-worklet.js error=net::ERR_ABORTED
[admin info] [matterhorn app-bridge] installed {roomName: local-51143587e118eb35040d03f07b949947, mode: injected, relayStatus: connected}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 1}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 1}
[admin info] [matterhorn app-bridge] call runtime transaction resume {roomName: local-51143587e118eb35040d03f07b949947, projections: []}
[moderator info] [matterhorn launch-diagnostics] {"at":"2026-08-10T10:11:51.158Z","stage":"bootstrap-installed","document":"host","details":{"hasHashRoute":true,"hasSearch":true}}
[moderator info] [matterhorn launch-diagnostics] {"at":"2026-08-10T10:11:51.196Z","stage":"host-module-loaded","document":"host","details":{}}
[moderator info] [matterhorn launch-diagnostics] {"at":"2026-08-10T10:11:51.196Z","stage":"host-route-selected","document":"host","details":{"directRoomLaunch":true}}
[moderator info] [matterhorn launch-diagnostics] {"at":"2026-08-10T10:11:51.196Z","stage":"direct-room-module-import-started","document":"host","details":{}}
[moderator info] [matterhorn launch-diagnostics] {"at":"2026-08-10T10:11:51.269Z","stage":"direct-room-module-imported","document":"host","details":{}}
[moderator info] [relay status] {status: connected, roomName: loca…9947, address: peerjs:matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone@ws://127.0.0.1:35899/peerjs, clientId: user…6784}
[moderator warning] [matterhorn] relay-session wait.timeout {label: personal state, timeoutMs: 2500, elapsedMs: 2501, idleMs: 2500}
[moderator info] [matterhorn launcher] bridge resolve starting {roomName: local-51143587e118eb35040d03f07b949947, roomPeerId: matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone, relayAddress: peerjs:matterhorn-dev-local-51143587e118eb35040d03…9947-standalone-relay@ws://127.0.0.1:35899/peerjs, hasSecret: false, inviteId: invite_3guKYcVrELVb56d8Azpuwg}
[moderator info] [matterhorn app-bridge] create starting {roomName: local-51143587e118eb35040d03f07b949947, roomPeerId: matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone, relayAddress: peerjs:matterhorn-dev-local-51143587e118eb35040d03…9947-standalone-relay@ws://127.0.0.1:35899/peerjs, hasSecret: false, hasInviteKey: true}
[moderator info] [matterhorn bundle] relay connection starting {roomName: local-51143587e118eb35040d03f07b949947}
[moderator info] [matterhorn app-bridge] profile loaded {roomName: local-51143587e118eb35040d03f07b949947, profileId: user_345147226295926784, hasRootKey: true, configUserId: undefined}
[moderator info] [matterhorn bundle] relay connection established {roomName: local-51143587e118eb35040d03f07b949947, clientId: user_345147226295926784, peerAddress: peerjs:21ee931a-4023-46fc-8d89-4f1ff714e3bf@ws://127.0.0.1:35899/peerjs}
[moderator info] [matterhorn app-bridge] relay session ready {roomName: local-51143587e118eb35040d03f07b949947, clientId: user_345147226295926784, peerId: 21ee931a-4023-46fc-8d89-4f1ff714e3bf, peerAddress: peerjs:21ee931a-4023-46fc-8d89-4f1ff714e3bf@ws://127.0.0.1:35899/peerjs, relayStatus: connected}
[moderator info] [matterhorn app-bridge] requesting room info {roomName: local-51143587e118eb35040d03f07b949947, peerId: 21ee931a-4023-46fc-8d89-4f1ff714e3bf}
[moderator info] [matterhorn bundle] room metadata pulled {roomName: local-51143587e118eb35040d03f07b949947, runtimeMode: encrypted-event-v3-mls, cachedFrontendIntegrity: undefined, clientHasCurrentBundle: false, frontendId: gg.matterhorn.mosh.player}
[moderator info] [matterhorn app-bridge] room info received {roomName: local-51143587e118eb35040d03f07b949947, runtimeMode: encrypted-event-v3-mls, frontendId: gg.matterhorn.mosh.player, appPackId: gg.matterhorn.mosh}
[moderator info] [matterhorn app-bridge] invite grant resolved {roomName: local-51143587e118eb35040d03f07b949947, inviteId: invite_3guKYcVrELVb56d8Azpuwg, fromEncryptedMetadata: true}
[moderator info] [matterhorn app-bridge] actor resolved {roomName: local-51143587e118eb35040d03f07b949947, memberId: wrap:M89gMvfbB3vb4c8RL-2tWbjjhkM1KbepwGGSK069mXw, deviceId: wrap:qqu1tl4WFqXDp9Qtk18YaUsJ36QyHY7G8IXSWGS-XJE, role: member}
[moderator info] [matterhorn app-bridge] hello sent {roomName: local-51143587e118eb35040d03f07b949947, clientId: user_345147226295926784}
[moderator info] [matterhorn bundle] frontend download started {roomName: local-51143587e118eb35040d03f07b949947, frontendId: gg.matterhorn.mosh.player, integrity: sha256-2c198ef4989d39b420d59c9988a5a9b279a41a4eae1f460b0a0bb672d5dfac30, totalBytes: 28423967}
[moderator info] [matterhorn bundle] frontend download progress {reason: start, completedBytes: 0, totalBytes: 28423967, percent: 0}
[launcher asset requestfailed] phase=startup page=moderator pageUrl=http://127.0.0.1:45738/matterhorn/?roomPeerId=matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A35899%2Fpeerjs#/room/local-51143587e118eb35040d03f07b949947?inviteId=invite_3guKYcVrELVb56d8Azpuwg&genesisHash=sha256%3Afb7038af64c3d7cf4887e02bd0d9a0de0747c274e02d96f9112297a890b109aa&inviteKey=NaMuGrAeWcQcoLuPzfUO_VNQx6OVoG_sVi_Q8iUUlyA&runtimeMode=encrypted-event-v3-mls status=n/a url=http://127.0.0.1:46825/gg.matterhorn.mosh/sha256-2c198ef4989d39b420d59c9988a5a9b279a41a4eae1f460b0a0bb672d5dfac30/chord-icon.svg error=net::ERR_ABORTED
[moderator info] [matterhorn app-bridge] create failed {roomName: local-51143587e118eb35040d03f07b949947, clientId: user_345147226295926784, relayStatus: connected, message: Bootstrap invite is not valid for external admission., stack: Error: Bootstrap invite is not valid for external …horn/assets/matterhorn-sdk-CQJcZ2K7.js:831:69086)}
[moderator info] [relay status] {status: closed, roomName: loca…9947, address: peerjs:matterhorn-dev-local-51143587e118eb35040d03f07b949947-standalone@ws://127.0.0.1:35899/peerjs, clientId: user…6784}
[moderator warning] [matterhorn launcher] live bridge unavailable for "local-51143587e118eb35040d03f07b949947", falling back to cached/offline: Bootstrap invite is not valid for external admission.
[moderator info] [matterhorn bundle] frontend download progress {reason: complete, completedBytes: 28423967, totalBytes: 28423967, percent: 100}
[moderator error] [matterhorn direct launch] startup failed Error: Bootstrap invite is not valid for external admission.
    at ii (http://127.0.0.1:45738/matterhorn/assets/matterhorn-sdk-CQJcZ2K7.js:791:41845)
    at ele (http://127.0.0.1:45738/matterhorn/assets/matterhorn-sdk-CQJcZ2K7.js:791:415645)
    at async wle (http://127.0.0.1:45738/matterhorn/assets/matterhorn-sdk-CQJcZ2K7.js:791:531457)
    at async Ece (http://127.0.0.1:45738/matterhorn/assets/matterhorn-sdk-CQJcZ2K7.js:831:70526)
    at async http://127.0.0.1:45738/matterhorn/assets/matterhorn-sdk-CQJcZ2K7.js:831:68767
    at async bce (http://127.0.0.1:45738/matterhorn/assets/matterhorn-sdk-CQJcZ2K7.js:831:69086)
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 2}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 2}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 3}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 3}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 4}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 4}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 5}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 5}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 6}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 6}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 7}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 7}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 8}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 8}
[admin info] [matterhorn app-bridge] encrypted presence deferred {roomName: local-51143587e118eb35040d03f07b949947, memberId: user_345147201649377280, epochId: mls-epoch-0, pendingCount: 9}
[admin info] [matterhorn app-bridge] encrypted state MLS recovery complete {roomName: local-51143587e118eb35040d03f07b949947, epoch: 0, pendingPresenceCount: 9}
```