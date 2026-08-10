#!/usr/bin/env node
const { createBotRoomService, encryptedFileStore } = require("matterhorn-node-service");
const { createMoshBot } = require("./bot.cjs");
const { loadConfig } = require("./config.cjs");
const { createLocalModel } = require("./model.cjs");
const { loadPersona } = require("./persona.cjs");
const { setBotRoomProfile } = require("./profile.cjs");

function terminalConnectionError(error) {
  return /revoked|expired|invalid (?:invite|credential)|banned|unauthorized|permission denied/i.test(String(error?.message || error));
}

function disconnectedStatus(status) {
  return ["disconnected", "failed", "idle", "offline"].includes(status);
}

function delay(ms, signal) {
  if (signal?.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const done = () => { signal?.removeEventListener("abort", abort); resolve(); };
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(done, ms);
    timer.unref?.();
    signal?.addEventListener("abort", abort, { once: true });
  });
}

async function retry(name, attempts, signal, operation, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(attempt); }
    catch (error) {
      lastError = error;
      if (signal.aborted || terminalConnectionError(error) || attempt === attempts) throw error;
      const backoff = Math.min(30_000, (options.baseDelayMs ?? 500) * 2 ** (attempt - 1));
      const jitter = Math.floor(backoff * 0.2 * (options.random || Math.random)());
      console.warn(`${name} failed; retrying`, { attempt, error: error.message, retryInMs: backoff + jitter });
      if (backoff + jitter > 0) await delay(backoff + jitter, signal);
    }
  }
  throw lastError;
}

async function main(dependencies = {}) {
  const config = (dependencies.loadConfig || loadConfig)();
  const controller = new AbortController();
  const health = {
    state: "starting",
    connection: "disconnected",
    model: "not-loaded",
    ready: false,
    startedAt: Date.now(),
    lastError: undefined
  };
  let service;
  let bot;
  let model;
  let stopHeartbeat = () => undefined;
  let closing;
  let reconnecting;
  const signalHandlersInstalled = dependencies.installSignalHandlers !== false;

  function serviceHealth(queueSaturated = false) {
    const state = ["connecting", "loading-model", "ready", "degraded", "stopping"].includes(health.state)
      ? health.state
      : "degraded";
    const modelState = health.model === "not-loaded" ? "loading" : health.model;
    return { state, model: modelState, ...(queueSaturated ? { queueSaturated: true } : {}) };
  }

  async function close(reason = "shutdown") {
    closing ||= (async () => {
      health.state = "stopping";
      health.ready = false;
      if (signalHandlersInstalled) {
        process.removeListener("SIGINT", onSignal);
        process.removeListener("SIGTERM", onSignal);
      }
      stopHeartbeat();
      if (service?.status === "connected") {
        let presenceTimer;
        await Promise.race([
          service.presence.set({ status: "offline", activity: "Bot stopped", serviceHealth: serviceHealth() }).catch(() => undefined),
          new Promise((resolve) => { presenceTimer = setTimeout(resolve, 1_000); presenceTimer.unref?.(); })
        ]);
        clearTimeout(presenceTimer);
      }
      controller.abort(new Error(`Bot ${reason}.`));
      await reconnecting?.catch(() => undefined);
      await bot?.close({ timeoutMs: config.shutdownTimeoutMs });
      await service?.close();
      health.connection = "disconnected";
      health.state = "stopped";
    })();
    return closing;
  }

  const onSignal = (signal) => void close(signal).catch((error) => {
    console.error("Bot shutdown failed", { error: error.message });
    process.exitCode = 1;
  });
  if (signalHandlersInstalled) {
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
  }

  try {
    const systemPrompt = await (dependencies.loadPersona || loadPersona)(config.personaFile, config.displayName);
    health.state = "connecting";
    service = await retry("Matterhorn connection", config.connectAttempts || 5, controller.signal, async () => {
      const created = await (dependencies.createBotRoomService || createBotRoomService)({
        inviteUrl: config.inviteUrl,
        storagePath: config.storagePath,
        storageSecret: config.storageSecret,
        launcherUrl: config.launcherUrl,
        signal: controller.signal,
        storage: (dependencies.encryptedFileStore || encryptedFileStore)(`${config.storagePath}.bot-state`, { secret: config.storageSecret }),
        bot: { serviceId: config.serviceId, displayName: config.displayName },
        requestedCapabilities: {
          readState: ["messages", "members", "guests"],
          writeOperations: ["message.reply"],
          presence: true,
          profile: { updateRoomProfile: true }
        },
        autoConnect: true
      });
      return created;
    });
    health.connection = "connected";
    await service.presence.set({ status: "busy", activity: "Starting bot", serviceHealth: serviceHealth() });
    service.events.on("status.changed", (event) => {
      const status = event?.status;
      if (typeof status !== "string") return;
      health.connection = status;
      if (!disconnectedStatus(status) || closing || controller.signal.aborted || reconnecting) return;
      health.state = "connecting";
      health.ready = false;
      reconnecting = retry("Matterhorn reconnection", config.connectAttempts || 5, controller.signal, () => service.connect(), {
        baseDelayMs: config.reconnectBaseMs ?? 500
      }).then(() => {
        health.connection = "connected";
        health.state = "ready";
        health.ready = true;
      }).catch((error) => {
        health.lastError = error.message;
        health.state = terminalConnectionError(error) ? "revoked" : "degraded";
      }).finally(() => { reconnecting = undefined; });
    });
    service.events.on("error", ({ error }) => {
      health.lastError = error?.message || "Unknown Matterhorn service error";
      const terminal = terminalConnectionError(error);
      health.state = terminal ? "revoked" : "degraded";
      health.ready = false;
      console.error("Matterhorn service error", { error: health.lastError });
      if (terminal) void close("credentials revoked").then(() => { health.state = "revoked"; });
    });

    await (dependencies.setBotRoomProfile || setBotRoomProfile)(service, {
      displayName: config.displayName,
      avatar: config.avatar
    });
    model = (dependencies.createLocalModel || createLocalModel)({
      modelId: config.modelId,
      dtype: config.dtype,
      cacheDir: config.modelCache,
      maxNewTokens: config.maxNewTokens,
      temperature: config.temperature
    });
    bot = (dependencies.createMoshBot || createMoshBot)(service, model, {
      prefix: config.prefix,
      displayName: config.displayName,
      systemPrompt,
      allowedChannelIds: config.allowedChannelIds,
      contextMessages: config.contextMessages,
      queueCapacity: config.queueCapacity,
      maxConversationTurns: config.maxConversationTurns,
      perMemberLimit: config.perMemberLimit,
      perChannelLimit: config.perChannelLimit,
      onError(error, context) {
        health.lastError = error.message;
        health.state = "degraded";
        void service.presence.set({ status: "busy", activity: "Bot degraded", serviceHealth: serviceHealth() }).catch(() => undefined);
        console.error("Bot response failed", { messageId: context.messageId, phase: context.phase, error: error.message });
      },
      onDrop(context) {
        console.warn("Bot trigger dropped", { messageId: context.messageId, reason: context.reason });
        void service.presence.set({ status: "busy", activity: "Bot queue full", serviceHealth: serviceHealth(true) }).catch(() => undefined);
      }
    });
    await bot.ready();

    if (config.warmup) {
      health.state = "loading-model";
      await service.presence.set({ status: "busy", activity: "Loading local model", serviceHealth: serviceHealth() });
      await retry("Local model loading", config.modelLoadAttempts, controller.signal, () => model.ready({ signal: controller.signal }));
    }
    health.model = config.warmup ? "ready" : "lazy";
    health.state = "ready";
    health.ready = true;
    stopHeartbeat = service.presence.heartbeat({
      status: "online",
      activity: `Mention ${config.prefix} for a local reply`,
      serviceHealth: serviceHealth()
    });
    console.log(`${config.displayName} is online as room member ${service.actor.memberId}.`);
    return { bot, close, health: () => ({ ...health, bot: bot.metrics() }), model, service };
  } catch (error) {
    health.lastError = error.message;
    health.state = terminalConnectionError(error) ? "revoked" : "failed";
    await close("startup failure").catch(() => undefined);
    throw error;
  }
}

if (require.main === module) main().catch((error) => {
  console.error("LFM bot failed to start", { error: error.message });
  process.exitCode = 1;
});

module.exports = { delay, disconnectedStatus, main, retry, terminalConnectionError };
