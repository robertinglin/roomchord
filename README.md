# Chord

Discord-style collaboration room with text channels, threaded replies, reactions, pins, edits/deletes, moderator controls, core RoomKit direct messages, presence, camera-capable media rooms, and screen-share state.

This example has three layers:

1. `src/index.cjs` exports the app pack, host plugin, player pack, player actions, replayable demo scenario, and summary helpers.
2. `src/preview.mjs` exports browser-safe fixture data and preview summaries.
3. `frontend/` is a package-owned Vite player preview that can run without a relay or E2E environment.

## Notable operations

- `channel.create`, `channel.rename`, `channel.archive`
- `message.send`, `message.reply`, `message.edit`, `message.react`, `message.pin`, `message.delete`
- direct messages are sent through the RoomKit host bridge, not Chord app reducer operations
- `media.room.create`, `media.room.join`, `media.room.leave`, `media.room.update`, `media.room.moderate`
- `screenshare.start`, `screenshare.stop`
- `presence.update`

## Run

```bash
pnpm install
pnpm run dev
pnpm run test
node -e 'require(".").createDemo().then((demo) => console.log(demo.summary))'
```

Local development uses 4xxxx ports: the frontend runs on `http://localhost:42732` and the local RoomKit backend runs on `http://localhost:43732`.

Launch uses standard ports through `https://launch.roomkit.app/`. Do not append the local frontend or backend ports to that URL.

```bash
pnpm exec roomkit . test-chord --serve dev
```

This app links the local `roomkit-sdk` from `../roomkit/packages/roomkit-sdk` during development. RoomKit APIs are imported through `roomkit-sdk` only.
