const assert = require("node:assert/strict");
const test = require("node:test");
const { delay, disconnectedStatus, main, retry, terminalConnectionError } = require("../src/index.cjs");

function config(overrides = {}) {
  return {
    inviteUrl: "matterhorn://invite",
    storagePath: "/tmp/lfm-test-room.enc",
    storageSecret: "test-storage-secret",
    displayName: "Sunny",
    serviceId: "mosh.sunny",
    prefix: "@sunny",
    allowedChannelIds: [],
    contextMessages: 4,
    queueCapacity: 8,
    maxConversationTurns: 4,
    perMemberLimit: 6,
    perChannelLimit: 20,
    shutdownTimeoutMs: 50,
    connectAttempts: 1,
    reconnectBaseMs: 0,
    modelLoadAttempts: 1,
    modelId: "model",
    dtype: "q4",
    modelCache: "/tmp/models",
    maxNewTokens: 20,
    temperature: 0,
    warmup: true,
    ...overrides
  };
}

function service(order, handlers = {}) {
  return {
    actor: { memberId: "bot-member" },
    status: "connected",
    storage: { async get() {}, async set() {} },
    events: { on(name, handler) { handlers[name] = handler; return () => { delete handlers[name]; }; } },
    presence: {
      async set(value) { order.push(`presence:${value.status}`); },
      heartbeat() { order.push("heartbeat"); return () => order.push("heartbeat-stop"); }
    },
    async close() { order.push("service-close"); this.status = "closed"; }
  };
}

test("bootstrap delegates profile ownership to the service and subscribes before model warmup", async () => {
  const order = [];
  const roomService = service(order);
  let serviceOptions;
  const runtime = await main({
    installSignalHandlers: false,
    loadConfig: () => config(),
    loadPersona: async () => "You are Sunny.",
    encryptedFileStore: () => roomService.storage,
    createBotRoomService: async (options) => { serviceOptions = options; order.push("connect"); return roomService; },
    setBotRoomProfile: async (received) => { assert.equal(received, roomService); order.push("profile"); },
    createMoshBot: () => {
      order.push("subscribe");
      return { async ready() {}, async close() { order.push("bot-close"); }, metrics() { return { queued: 0 }; } };
    },
    createLocalModel: () => ({ async ready() { order.push("model-ready"); } })
  });

  assert.equal(serviceOptions.roomClient, undefined);
  assert.equal(serviceOptions.inviteUrl, "matterhorn://invite");
  assert.deepEqual(serviceOptions.bot, { serviceId: "mosh.sunny", displayName: "Sunny" });
  assert.deepEqual(serviceOptions.requestedCapabilities.profile, { updateRoomProfile: true });
  assert.equal(serviceOptions.requestedCapabilities.presence, true);
  assert.deepEqual(serviceOptions.requestedCapabilities.writeOperations, ["message.reply"]);
  assert.equal(order.indexOf("subscribe") < order.indexOf("model-ready"), true);
  assert.equal(runtime.health().state, "ready");
  await runtime.close();
  assert.equal(order.includes("bot-close"), true);
  assert.equal(order.includes("service-close"), true);
});

test("startup failure closes every resource acquired before model warmup fails", async () => {
  const order = [];
  const roomService = service(order);
  await assert.rejects(() => main({
    installSignalHandlers: false,
    loadConfig: () => config(),
    loadPersona: async () => "persona",
    encryptedFileStore: () => roomService.storage,
    createBotRoomService: async () => roomService,
    setBotRoomProfile: async () => undefined,
    createMoshBot: () => ({ async ready() {}, async close() { order.push("bot-close"); }, metrics() { return {}; } }),
    createLocalModel: () => ({ async ready() { throw new Error("model unavailable"); } })
  }), /model unavailable/);
  assert.equal(order.includes("bot-close"), true);
  assert.equal(order.includes("service-close"), true);
});

test("supervision retries transient failures but not revoked credentials", async () => {
  let attempts = 0;
  assert.equal(await retry("test", 3, new AbortController().signal, async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary disconnect");
    return "connected";
  }, { baseDelayMs: 0, random: () => 0 }), "connected");
  assert.equal(attempts, 2);
  assert.equal(terminalConnectionError(new Error("membership revoked")), true);
  assert.equal(disconnectedStatus("offline"), true);
  assert.equal(disconnectedStatus("connected"), false);
  await assert.rejects(() => retry("test", 3, new AbortController().signal, async () => {
    throw new Error("credential expired");
  }), /expired/);
});

test("runtime reconnects after a transient room disconnection", async (t) => {
  t.mock.method(console, "warn", () => undefined);
  t.mock.method(console, "log", () => undefined);
  const order = [];
  const handlers = {};
  const roomService = service(order, handlers);
  let reconnectAttempts = 0;
  roomService.connect = async function connect() {
    reconnectAttempts += 1;
    if (reconnectAttempts === 1) throw new Error("relay unavailable");
    this.status = "connected";
    return this;
  };
  const runtime = await main({
    installSignalHandlers: false,
    loadConfig: () => config({ warmup: false, connectAttempts: 2 }),
    loadPersona: async () => "persona",
    encryptedFileStore: () => roomService.storage,
    createBotRoomService: async () => roomService,
    setBotRoomProfile: async () => undefined,
    createMoshBot: () => ({ async ready() {}, async close() {}, metrics() { return {}; } }),
    createLocalModel: () => ({ async ready() {} })
  });

  roomService.status = "idle";
  handlers["status.changed"]({ status: "idle" });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reconnectAttempts, 2);
  assert.equal(runtime.health().state, "ready");
  assert.equal(runtime.health().connection, "connected");
  await runtime.close();
});

test("delay completes and responds to cancellation", async () => {
  await delay(1, new AbortController().signal);
  const controller = new AbortController();
  const cancelled = delay(10_000, controller.signal);
  const reason = new Error("cancelled");
  controller.abort(reason);
  await assert.rejects(cancelled, /cancelled/);
});

test("health reports service and bot degradation without exposing message bodies", async (t) => {
  t.mock.method(console, "error", () => undefined);
  t.mock.method(console, "warn", () => undefined);
  t.mock.method(console, "log", () => undefined);
  const order = [];
  const handlers = {};
  const roomService = service(order, handlers);
  let botOptions;
  const beforeSigint = process.listenerCount("SIGINT");
  const beforeSigterm = process.listenerCount("SIGTERM");
  const runtime = await main({
    loadConfig: () => config({ warmup: false }),
    loadPersona: async () => "persona",
    encryptedFileStore: () => roomService.storage,
    createBotRoomService: async () => roomService,
    setBotRoomProfile: async () => undefined,
    createMoshBot: (_service, _model, options) => {
      botOptions = options;
      return { async ready() {}, async close() {}, metrics() { return { queued: 2 }; } };
    },
    createLocalModel: () => ({ async ready() {} })
  });

  assert.equal(process.listenerCount("SIGINT"), beforeSigint + 1);
  assert.equal(process.listenerCount("SIGTERM"), beforeSigterm + 1);
  assert.equal(runtime.health().model, "lazy");
  handlers["status.changed"]({ status: "reconnecting" });
  assert.equal(runtime.health().connection, "reconnecting");
  handlers.error({ error: new Error("temporary service error") });
  assert.equal(runtime.health().state, "degraded");
  botOptions.onError(new Error("inference failed"), { messageId: "message-1", phase: "inference" });
  assert.equal(runtime.health().state, "degraded");
  botOptions.onDrop({ messageId: "message-2", reason: "overflow" });
  assert.equal(runtime.health().bot.queued, 2);

  await runtime.close();
  assert.equal(process.listenerCount("SIGINT"), beforeSigint);
  assert.equal(process.listenerCount("SIGTERM"), beforeSigterm);
});

test("runtime stops after terminal credential revocation", async (t) => {
  t.mock.method(console, "error", () => undefined);
  t.mock.method(console, "log", () => undefined);
  const order = [];
  const handlers = {};
  const roomService = service(order, handlers);
  const runtime = await main({
    installSignalHandlers: false,
    loadConfig: () => config({ warmup: false }),
    loadPersona: async () => "persona",
    encryptedFileStore: () => roomService.storage,
    createBotRoomService: async () => roomService,
    setBotRoomProfile: async () => undefined,
    createMoshBot: () => ({ async ready() {}, async close() { order.push("bot-close"); }, metrics() { return {}; } }),
    createLocalModel: () => ({ async ready() {} })
  });

  handlers.error({ error: new Error("membership revoked") });
  await runtime.close();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.health().state, "revoked");
  assert.equal(order.includes("bot-close"), true);
  assert.equal(order.includes("service-close"), true);
});
