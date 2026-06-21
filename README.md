# Mosh

Discord-style collaboration room with text channels, threaded replies, reactions, pins, edits/deletes, moderator controls, core Matterhorn direct messages, presence, camera-capable media rooms, and screen-share state.

This example has three runtime areas:

1. `src/index.cjs` exports the app pack, host plugin, player pack, player actions, replayable demo scenario, and summary helpers.
2. `src/preview.mjs` exports browser-safe fixture data and preview summaries.
3. `src/` is a package-owned Vite player preview that can run without a relay or E2E environment.

## Notable operations

- `channel.create`, `channel.rename`, `channel.archive`
- `message.send`, `message.reply`, `message.edit`, `message.react`, `message.pin`, `message.delete`
- direct messages are sent through the Matterhorn host bridge, not Mosh app reducer operations
- `media.room.create`, `media.room.join`, `media.room.leave`, `media.room.update`, `media.room.moderate`
- `screenshare.start`, `screenshare.stop`
- `presence.update`

## Run

```bash
pnpm install
pnpm run dev
pnpm run build:frontend:watch
pnpm run test
node -e 'require(".").createDemo().then((demo) => console.log(demo.summary))'
```

Local development uses 4xxxx ports: the frontend runs on `http://localhost:42732` and the local Matterhorn backend runs on `http://localhost:43732`.

Launch uses standard ports through `https://launch.matterhorn.gg/`. Do not append the local frontend or backend ports to that URL.

```bash
pnpm exec matterhorn . test-mosh --serve dev
```

This app links the local `matterhorn-sdk` from `../matterhorn/packages/matterhorn-sdk` during development. Matterhorn APIs are imported through `matterhorn-sdk` only.

## Frontend Architecture

`src/src` uses Feature-Sliced Design:

- `app` for bootstrapping, global styles, and app-level types.
- `pages` for route-level chat composition.
- `widgets` for the chat shell.
- `features` for interactive chat capabilities.
- `entities` for chat state, actions, business types, and Matterhorn client hooks.
- `shared` for reusable UI, shims, and test setup.

Run `pnpm run check` to validate TypeScript and dependency-cruiser FSD boundaries. Lower layers may not import higher layers, and slices inside the same layer are isolated from sibling slices.
