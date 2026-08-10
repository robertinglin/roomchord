# Mosh Micro bot

This standalone Node bot service joins a Mosh room through Matterhorn's bot-specific admission surface and runs `LiquidAI/LFM2.5-230M-ONNX` locally through Transformers.js. The generic Matterhorn Node client remains a full regular member client for CLIs, TUIs, and other interfaces. The default Q4 model is about 200 MB and is downloaded into `.cache/models` on first startup.

The required `LFM_BOT_SERVICE_ID` and `LFM_BOT_NAME` values must exactly match the bot-bound invite. The bot sets that display name as its Matterhorn room nickname and waits for the signed profile publication before reporting ready. It responds only when a message starts with its configured prefix or explicitly mentions its admitted member ID. It replies to the triggering message, processes one inference at a time, and never sends prompts to an external inference API.

The message subscription starts before model warmup. Qualifying triggers enter a bounded, encrypted inbox and remain pending until the reply operation commits. Reply operations use a stable idempotency identity derived from the trigger. A restart recovers pending triggers without duplicating completed replies.

## Run it

1. In Mosh room settings, open **Bots** and create a bot invite with a stable service ID and display name.
2. Copy `.env.example` to `.env. Set `LFM_BOT_SERVICE_ID` and `LFM_BOT_NAME` to the exact values bound into the invite, then add the invite and a long random storage secret.
3. After admission, give the bot editor access only to the channels where it should reply.
4. From this directory, run `pnpm install`, `pnpm test`, and `pnpm start`.

The encrypted file in `.matterhorn/` is the bot's durable MLS/device state. The adjacent `.bot-state` directory contains its encrypted pending/completed trigger ledger. Back up both together with the storage secret. Do not commit either one.

Set `LFM_BOT_PERSONA_FILE` to a mounted UTF-8 text file to configure the system prompt. If it is omitted, the default prompt uses `LFM_BOT_NAME`; it is not hardcoded to Micro. Reserved Liquid model tokens are escaped from all prompt content.

## Delivery and loop policy

- The inbox is bounded by `LFM_QUEUE_CAPACITY`.
- Channels are processed in round-robin order.
- Context is captured when the trigger arrives and never includes later messages.
- Equal timestamps are ordered by message ID.
- Bot-marked authors and replies to this bot are ignored by default.
- Reply chains stop at `LFM_MAX_CONVERSATION_TURNS`.
- Per-member and per-channel request limits prevent sustained loops.
- Queue overflow produces at most one visible busy reply per channel and window.
- Model load failures are retryable. Unsafe or empty output gets a deterministic failure reply.
- Transient room disconnects use exponential retry with jitter.
- Revoked or expired credentials stop the runtime.

Runtime health reports connection state, model state, queue depth, oldest queued age, inference duration, retries, drops, and committed replies. Metrics do not contain message text.

## Least-privilege request

The service locally restricts itself to reading `messages`, `members`, and `guests`, plus this application write:

- `message.reply`

Encrypted ephemeral presence is a separate requested capability. It is not a Mosh application operation.

It also requests `profile.updateRoomProfile` through the node-service profile capability. This delegates to the existing Matterhorn room profile API; it is not a Mosh operation.

The signed room grant and channel access rules remain authoritative and can narrow this further.

Matterhorn binds the bot kind, service ID, display name, root identity, and device identity into signed room admission. Mosh uses only that authoritative projection for bot badges and bot administration. The Bots panel can revoke a bot or rotate one bot device without removing its other devices.

Do not use Matterhorn integration webhooks for this bot. The bot service already owns the MLS session and signed operation path.

Review the [LFM Open License](https://www.liquid.ai/lfm-open-license) before distributing model weights or a bundled deployment.

## Bounded two-bot demo

`pnpm bot:lfm:demo` starts Sunny Scout and Cloudy Sage with separate authoritative bot-bound invites and encrypted device stores. Set `LFM_DEMO_SUNNY_INVITE`, `LFM_DEMO_SUNNY_SECRET`, `LFM_DEMO_CLOUDY_INVITE`, and `LFM_DEMO_CLOUDY_SECRET` in `services/lfm-bot/.env.demo`. The invite-bound service IDs default to `mosh.weather.sunny` and `mosh.weather.cloudy`; override the corresponding `LFM_DEMO_*_SERVICE_ID` variables only when the invites use different IDs.

The script loads one local LFM2.5-230M model, waits for an explicit Enter key lease, alternates exactly 30 messages, and then stops generating. `LFM_DEMO_AUTO_START=true` grants that fixed lease immediately for unattended demos. This is a finite demonstration, not a bot message subscription or a general bot-to-bot conversation mode.
