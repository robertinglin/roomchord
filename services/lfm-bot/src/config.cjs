const path = require("node:path");

function required(environment, name) {
  const value = String(environment[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function integer(environment, name, fallback, minimum, maximum) {
  if (environment[name] === undefined || environment[name] === "") return fallback;
  const value = Number(environment[name]);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function decimal(environment, name, fallback, minimum, maximum) {
  if (environment[name] === undefined || environment[name] === "") return fallback;
  const value = Number(environment[name]);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function boolean(environment, name, fallback) {
  const raw = environment[name];
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function csv(value) {
  return [...new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean))];
}

function loadConfig(environment = process.env, serviceRoot = path.join(__dirname, "..")) {
  return {
    inviteUrl: required(environment, "MATTERHORN_ROOM_INVITE"),
    storageSecret: required(environment, "MATTERHORN_SERVICE_STORE_SECRET"),
    launcherUrl: String(environment.MATTERHORN_LAUNCHER_URL || "").trim() || undefined,
    storagePath: path.resolve(serviceRoot, environment.MATTERHORN_SERVICE_STORAGE || ".matterhorn/lfm-bot.enc"),
    modelId: String(environment.LFM_MODEL_ID || "LiquidAI/LFM2.5-230M-ONNX").trim(),
    dtype: String(environment.LFM_MODEL_DTYPE || "q4").trim(),
    modelCache: path.resolve(serviceRoot, environment.LFM_MODEL_CACHE || ".cache/models"),
    displayName: required(environment, "LFM_BOT_NAME"),
    serviceId: required(environment, "LFM_BOT_SERVICE_ID"),
    avatar: String(environment.LFM_BOT_AVATAR || "").trim() || undefined,
    personaFile: String(environment.LFM_BOT_PERSONA_FILE || "").trim()
      ? path.resolve(serviceRoot, environment.LFM_BOT_PERSONA_FILE)
      : undefined,
    prefix: String(environment.LFM_BOT_PREFIX || "@micro").trim(),
    allowedChannelIds: csv(environment.LFM_BOT_CHANNELS),
    contextMessages: integer(environment, "LFM_CONTEXT_MESSAGES", 8, 0, 32),
    queueCapacity: integer(environment, "LFM_QUEUE_CAPACITY", 32, 1, 1024),
    maxConversationTurns: integer(environment, "LFM_MAX_CONVERSATION_TURNS", 4, 1, 20),
    perMemberLimit: integer(environment, "LFM_MEMBER_REQUESTS_PER_MINUTE", 6, 1, 120),
    perChannelLimit: integer(environment, "LFM_CHANNEL_REQUESTS_PER_MINUTE", 20, 1, 600),
    shutdownTimeoutMs: integer(environment, "LFM_SHUTDOWN_TIMEOUT_MS", 15_000, 1_000, 120_000),
    connectAttempts: integer(environment, "MATTERHORN_CONNECT_ATTEMPTS", 5, 1, 20),
    reconnectBaseMs: integer(environment, "MATTERHORN_RECONNECT_BASE_MS", 500, 100, 30_000),
    modelLoadAttempts: integer(environment, "LFM_MODEL_LOAD_ATTEMPTS", 3, 1, 10),
    maxNewTokens: integer(environment, "LFM_MAX_NEW_TOKENS", 160, 1, 512),
    temperature: decimal(environment, "LFM_TEMPERATURE", 0.2, 0, 2),
    warmup: boolean(environment, "LFM_WARMUP", true)
  };
}

module.exports = { loadConfig };
