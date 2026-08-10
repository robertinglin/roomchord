const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { loadConfig } = require("../src/config.cjs");

const required = {
  MATTERHORN_ROOM_INVITE: " https://launcher.test/invite/bot ",
  MATTERHORN_SERVICE_STORE_SECRET: " secret ",
  LFM_BOT_NAME: "Micro",
  LFM_BOT_SERVICE_ID: "mosh.lfm-2.5-230m"
};

test("loads safe defaults and resolves service-owned paths", () => {
  const config = loadConfig(required, "/service");
  assert.equal(config.inviteUrl, "https://launcher.test/invite/bot");
  assert.equal(config.storageSecret, "secret");
  assert.equal(config.storagePath, path.resolve("/service/.matterhorn/lfm-bot.enc"));
  assert.equal(config.modelCache, path.resolve("/service/.cache/models"));
  assert.equal(config.modelId, "LiquidAI/LFM2.5-230M-ONNX");
  assert.equal(config.dtype, "q4");
  assert.equal(config.displayName, "Micro");
  assert.equal(config.serviceId, "mosh.lfm-2.5-230m");
  assert.equal(config.avatar, undefined);
  assert.equal(config.personaFile, undefined);
  assert.equal(config.prefix, "@micro");
  assert.deepEqual(config.allowedChannelIds, []);
  assert.equal(config.contextMessages, 8);
  assert.equal(config.queueCapacity, 32);
  assert.equal(config.reconnectBaseMs, 500);
  assert.equal(config.maxConversationTurns, 4);
  assert.equal(config.connectAttempts, 5);
  assert.equal(config.maxNewTokens, 160);
  assert.equal(config.temperature, 0.2);
  assert.equal(config.warmup, true);
});

test("loads explicit settings and removes duplicate channels", () => {
  const config = loadConfig({
    ...required,
    MATTERHORN_LAUNCHER_URL: " https://launcher.test ",
    MATTERHORN_SERVICE_STORAGE: "credentials.enc",
    LFM_MODEL_ID: "local/model",
    LFM_MODEL_DTYPE: "q8",
    LFM_MODEL_CACHE: "weights",
    LFM_BOT_NAME: "Sunny",
    LFM_BOT_SERVICE_ID: "mosh.sunny",
    LFM_BOT_AVATAR: "https://example.test/sunny.png",
    LFM_BOT_PERSONA_FILE: "persona.txt",
    LFM_BOT_PREFIX: "!ask",
    LFM_BOT_CHANNELS: "help, general,help",
    LFM_CONTEXT_MESSAGES: "0",
    LFM_MAX_NEW_TOKENS: "32",
    LFM_TEMPERATURE: "0",
    LFM_WARMUP: "false"
  }, "/service");
  assert.equal(config.launcherUrl, "https://launcher.test");
  assert.equal(config.storagePath, "/service/credentials.enc");
  assert.equal(config.modelId, "local/model");
  assert.equal(config.dtype, "q8");
  assert.equal(config.modelCache, "/service/weights");
  assert.equal(config.displayName, "Sunny");
  assert.equal(config.serviceId, "mosh.sunny");
  assert.equal(config.avatar, "https://example.test/sunny.png");
  assert.equal(config.personaFile, "/service/persona.txt");
  assert.equal(config.prefix, "!ask");
  assert.deepEqual(config.allowedChannelIds, ["help", "general"]);
  assert.equal(config.contextMessages, 0);
  assert.equal(config.maxNewTokens, 32);
  assert.equal(config.temperature, 0);
  assert.equal(config.warmup, false);
});

test("rejects missing and malformed settings", () => {
  assert.throws(() => loadConfig({}), /MATTERHORN_ROOM_INVITE/);
  assert.throws(() => loadConfig({ MATTERHORN_ROOM_INVITE: "invite" }), /MATTERHORN_SERVICE_STORE_SECRET/);
  assert.throws(() => loadConfig({ MATTERHORN_ROOM_INVITE: "invite", MATTERHORN_SERVICE_STORE_SECRET: "secret" }), /LFM_BOT_NAME/);
  assert.throws(() => loadConfig({ ...required, LFM_CONTEXT_MESSAGES: "1.5" }), /integer/);
  assert.throws(() => loadConfig({ ...required, LFM_MAX_NEW_TOKENS: "513" }), /between/);
  assert.throws(() => loadConfig({ ...required, LFM_TEMPERATURE: "warm" }), /between/);
  assert.throws(() => loadConfig({ ...required, LFM_WARMUP: "yes" }), /true or false/);
  assert.throws(() => loadConfig({ ...required, LFM_QUEUE_CAPACITY: "0" }), /between/);
});
