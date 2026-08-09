# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:82:3

# Error details

```
Error: admin did not become ready. URL=http://127.0.0.1:40387/matterhorn/?roomPeerId=matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A36795%2Fpeerjs#/room/local-b70c26d8b29a25012055419e68be57e2?inviteId=invite_42GnFq9eg7m1-N-O0bKlqg&genesisHash=sha256%3A418b442a369a55185c92219895143c9e0956e7da1057b72b248e9a94af4a8da2&inviteKey=2_cbkfSD2yGwR4ozm1N9pdx9oEI_CH4bLItvvvfJtrA&runtimeMode=encrypted-event-v3-mls
Page=http://127.0.0.1:40387/matterhorn/?roomPeerId=matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A36795%2Fpeerjs#/room/local-b70c26d8b29a25012055419e68be57e2?inviteId=invite_42GnFq9eg7m1-N-O0bKlqg&genesisHash=sha256%3A418b442a369a55185c92219895143c9e0956e7da1057b72b248e9a94af4a8da2&inviteKey=2_cbkfSD2yGwR4ozm1N9pdx9oEI_CH4bLItvvvfJtrA&runtimeMode=encrypted-event-v3-mls
(node:1186707) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
Publishing . and bootstrapping room local-b70c26d8b29a25012055419e68be57e2.
Started Matterhorn dev standalone relay peerjs:matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay.
(node:1186723) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1186741) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
matterhorn room relay peer is live as matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone
matterhorn relay mesh peer is live as matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay
matterhorn relay IPC is live.
IPC:        ws://127.0.0.1:44242/room
Room peer:  matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone
Mesh peer:  matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay
Mesh addr:  peerjs:matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay@ws://127.0.0.1:36795/peerjs
Profile:    development
Name:       local-b70c26d8b29a25012055419e68be57e2-standalone#0000
Identity:   sha256-spki:PHfQ9ipqKYjv-KlQ9v4139r49gi18KDcD3zOTBdFpFg
PeerJS:     http://127.0.0.1:36795/peerjs
Storage:    /tmp/mosh-playwright-Xwt0Ug/.matterhorn/dev/relay/local-b70c26d8b29a25012055419e68be57e2/relay
matterhorn dev launcher build stderr: $ pnpm run build:client
matterhorn dev launcher build stderr: $ vite build --config client/vite.config.ts
matterhorn dev launcher build stdout: vite v8.0.16 building client environment for production...
matterhorn dev launcher build stdout: transforming...
matterhorn dev launcher build stderr: [plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/encryption.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
matterhorn dev launcher build stderr: [plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/nostrMapping.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
[plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/signing.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
[plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/ngramIndex.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
[plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/validation/payload.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
[plugin rolldown:vite-resolve] Module "node:crypto" has been externalized for browser compatibility, imported by "/home/robert/workspace/matterhorn/packages/matterhorn-event/src/encoding.cjs". See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
matterhorn dev launcher build stdout: ✓ 364 modules transformed.
matterhorn dev launcher build stdout: rendering chunks...
matterhorn dev launcher build stdout: computing gzip size...
matterhorn dev launcher build stdout: client/dist/vault.html                                     0.95 kB │ gzip:   0.41 kB
client/dist/app.html                                       1.14 kB │ gzip:   0.57 kB
client/dist/launcher.html                                  1.17 kB │ gzip:   0.45 kB
client/dist/vault-unlock.html                              1.72 kB │ gzip:   0.82 kB
client/dist/assets/appBridgeBroker-DMZwYzML.js             2.35 kB
client/dist/index.html                                     4.85 kB │ gzip:   1.46 kB
client/dist/assets/sharedWorker-DMIxUoOu.js            1,459.29 kB
client/dist/openmls-wasm.wasm                          1,952.95 kB │ gzip: 728.20 kB
client/dist/assets/index-BBi7tRL-.css                      0.17 kB │ gzip:   0.15 kB
client/dist/assets/styles-BAaYzhRj.css                    46.16 kB │ gzip:   8.29 kB
client/dist/assets/launchDiagnostics-DqVI4Mqx.js           0.07 kB │ gzip:   0.09 kB
client/dist/assets/vaultOriginPolicy-BR7MUAqt.js           0.48 kB │ gzip:   0.31 kB
client/dist/assets/modulepreload-polyfill-CWIbYaaI.js      0.71 kB │ gzip:   0.40 kB
client/dist/assets/rolldown-runtime-M0oDzQ_3.js            0.82 kB │ gzip:   0.47 kB
client/dist/assets/vault-DOKmdP3L.js                       1.01 kB │ gzip:   0.58 kB
client/dist/assets/app-CduFrESE.js                         2.98 kB │ gzip:   1.34 kB
client/dist/assets/index-DZJZ3Gr-.js                       4.41 kB │ gzip:   1.77 kB
client/dist/assets/vaultUnlock-DTzbTQVo.js                 4.41 kB │ gzip:   1.98 kB
client/dist/assets/directRoomStartup-ymvT81nw.js          10.96 kB │ gzip:   3.85 kB
client/dist/assets/launcher-1xG2Tmyt.js                  106.12 kB │ gzip:  28.05 kB
client/dist/assets/vendor-Dzn9AMrg.js                    207.89 kB │ gzip:  67.58 kB
client/dist/assets/matterhorn-sdk-BKo6krEb.js          1,862.77 kB │ gzip: 474.32 kB
matterhorn dev launcher build stderr: [INEFFECTIVE_DYNAMIC_IMPORT] node_modules/.pnpm/peerjs@1.5.5/node_modules/peerjs/dist/bundler.mjs is dynamically imported by packages/matterhorn-sdk/src/launcher/appBridgeMedia.ts but also statically imported by packages/matterhorn-sdk/src/launcher/profileTransfer.ts, packages/matterhorn-sdk/src/launcher/relaySession.ts, dynamic import will not move module into another chunk.
matterhorn dev launcher build stderr: [plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
matterhorn dev launcher build stderr: [INEFFECTIVE_DYNAMIC_IMPORT] packages/matterhorn-sdk/src/launcher/relaySession.ts is dynamically imported by packages/matterhorn-sdk/src/launcher/appBridge.ts, packages/matterhorn-sdk/src/launcher/personalState.ts, packages/matterhorn-sdk/src/launcher/relaySessionPort.ts but also statically imported by packages/matterhorn-sdk/src/launcher/bundleDownload.ts, packages/matterhorn-sdk/src/launcher/profileTransfer.ts, packages/matterhorn-sdk/src/launcher/relayManagementOwnerData.ts, dynamic import will not move module into another chunk.
matterhorn dev launcher build stdout: ✓ built in 1.41s
Matterhorn dev launcher is live at http://127.0.0.1:40387/matterhorn/
Matterhorn app: Mosh (gg.matterhorn.mosh@1.0.0)
[mtn-debug-tools] developer plugin installed for published room local-b70c26d8b29a25012055419e68be57e2
Frontend release: /tmp/mosh-playwright-Xwt0Ug/dist/matterhorn-mosh.js
Using the local development repository. This preview is non-shareable and remains available only while matterhorn dev is running.
Room genesis durably stored by peerjs:matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay@ws://127.0.0.1:36795/peerjs.
owner invite: http://127.0.0.1:40387/matterhorn/?roomPeerId=matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A36795%2Fpeerjs#/room/local-b70c26d8b29a25012055419e68be57e2?inviteId=invite_42GnFq9eg7m1-N-O0bKlqg&genesisHash=sha256%3A418b442a369a55185c92219895143c9e0956e7da1057b72b248e9a94af4a8da2&inviteKey=2_cbkfSD2yGwR4ozm1N9pdx9oEI_CH4bLItvvvfJtrA&runtimeMode=encrypted-event-v3-mls
member invite: http://127.0.0.1:40387/matterhorn/?roomPeerId=matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A36795%2Fpeerjs#/room/local-b70c26d8b29a25012055419e68be57e2?inviteId=invite_azLoStO0eq-B62fxUPLwjA&genesisHash=sha256%3A418b442a369a55185c92219895143c9e0956e7da1057b72b248e9a94af4a8da2&inviteKey=qzWaf2xmdfsv0ZLbdTkpS3EaJaNWfqI7f8hb4MqXF-4&runtimeMode=encrypted-event-v3-mls
guest invite: http://127.0.0.1:40387/matterhorn/?roomPeerId=matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone&relayAddress=peerjs%3Amatterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone-relay%40ws%3A%2F%2F127.0.0.1%3A36795%2Fpeerjs#/room/local-b70c26d8b29a25012055419e68be57e2?inviteId=invite_6_h7ILiGCKS4iZBnw0Y5LQ&genesisHash=sha256%3A418b442a369a55185c92219895143c9e0956e7da1057b72b248e9a94af4a8da2&inviteKey=ty56QvjuK9YKVWsCtEyptCRRYaVPQL1sbPjjRqQuxnk&runtimeMode=encrypted-event-v3-mls

[admin info] [matterhorn app-bridge] create starting {roomName: local-b70c26d8b29a25012055419e68be57e2, roomPeerId: matterhorn-dev-local-b70c26d8b29a25012055419e68be57e2-standalone, relayAddress: peerjs:matterhorn-dev-local-b70c26d8b29a2501205541…57e2-standalone-relay@ws://127.0.0.1:36795/peerjs, hasSecret: false, hasInviteKey: true}
[admin info] [matterhorn app-bridge] profile loaded {roomName: local-b70c26d8b29a25012055419e68be57e2, profileId: user_344520993738211328, hasRootKey: true, configUserId: undefined}
[admin info] [matterhorn app-bridge] relay session ready {roomName: local-b70c26d8b29a25012055419e68be57e2, clientId: user_344520993738211328, peerId: 50700f8f-3ab4-4d2c-8848-839c82bdbbc4, peerAddress: peerjs:50700f8f-3ab4-4d2c-8848-839c82bdbbc4@ws://127.0.0.1:36795/peerjs, relayStatus: connected}
[admin info] [matterhorn app-bridge] requesting room info {roomName: local-b70c26d8b29a25012055419e68be57e2, peerId: 50700f8f-3ab4-4d2c-8848-839c82bdbbc4}
[admin info] [matterhorn app-bridge] room info received {roomName: local-b70c26d8b29a25012055419e68be57e2, runtimeMode: encrypted-event-v3-mls, frontendId: gg.matterhorn.mosh.player, appPackId: gg.matterhorn.mosh}
[admin info] [matterhorn app-bridge] invite grant resolved {roomName: local-b70c26d8b29a25012055419e68be57e2, inviteId: invite_42GnFq9eg7m1-N-O0bKlqg, fromEncryptedMetadata: true}
[admin info] [matterhorn app-bridge] actor resolved {roomName: local-b70c26d8b29a25012055419e68be57e2, memberId: wrap:zbkWmGoVfJ7v6w_h9Qajsx2ieTVcs3ESI507tJiC1Ho, deviceId: wrap:SuHqb81kzBQ8mLfL1c_4DLvsZ_tZsMrMahAkT5Cpv6k, role: admin}
[admin info] [matterhorn app-bridge] hello sent {roomName: local-b70c26d8b29a25012055419e68be57e2, clientId: user_344520993738211328}
[admin error] Failed to load resource: the server responded with a status of 404 (Not Found)
[admin info] [matterhorn app-bridge] create failed {roomName: local-b70c26d8b29a25012055419e68be57e2, clientId: user_344520993738211328, relayStatus: connected, message: WASM download failed: 404, stack: Error: WASM download failed: 404
    at http://127…horn/assets/matterhorn-sdk-36yHt7i2.js:829:67844)}
[admin error] [matterhorn direct launch] startup failed Error: WASM download failed: 404
    at http://127.0.0.1:40387/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:789:368140
    at async vk (http://127.0.0.1:40387/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:789:368411)
    at async mae (http://127.0.0.1:40387/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:789:373864)
    at async Pae (http://127.0.0.1:40387/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:789:490859)
    at async Ble (http://127.0.0.1:40387/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:69284)
    at async http://127.0.0.1:40387/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:67525
    at async Mle (http://127.0.0.1:40387/matterhorn/assets/matterhorn-sdk-36yHt7i2.js:829:67844)
```