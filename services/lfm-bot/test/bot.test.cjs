const assert = require("node:assert/strict");
const test = require("node:test");
const { BOT_INBOX_STORAGE_KEY, activatedText, createMoshBot, promptFor, recentContext, replyIdentity, roomStateForBot } = require("../src/bot.cjs");

function fixture(options = {}) {
  const state = {
    messages: {
      old: { id: "old", channelId: "general", authorId: "alice", body: "Earlier", createdAt: 1 },
      deleted: { id: "deleted", channelId: "general", authorId: "alice", body: "Gone", deletedAt: 3, createdAt: 2 },
      other: { id: "other", channelId: "random", authorId: "alice", body: "Elsewhere", createdAt: 3 }
    },
    members: { alice: { displayName: "Alice" } },
    guests: {}
  };
  let onCreate;
  const dispatches = [];
  const stored = new Map();
  const service = {
    actor: { memberId: "micro", role: "member" },
    state: { path: (name) => state[name] },
    watch: { collection: (name) => {
      assert.equal(name, "messages");
      return { onCreate(handler) { onCreate = handler; return () => { onCreate = undefined; }; } };
    } },
    storage: {
      async get(key) { return stored.get(key); },
      async set(key, value) { stored.set(key, structuredClone(value)); }
    },
    async dispatch(type, payload, dispatchOptions) {
      dispatches.push({ type, payload, options: dispatchOptions });
      return await options.dispatch?.(type, payload, dispatchOptions);
    }
  };
  return {
    dispatches,
    emit(message) { onCreate?.(message); },
    service,
    stored,
    state
  };
}

const settings = { prefix: "@micro", allowedChannelIds: [], contextMessages: 8 };

test("activates only valid mentions and prefixes", () => {
  const actor = { memberId: "micro" };
  const message = (value) => ({ id: `message-${value.body}`, ...value });
  assert.equal(activatedText(message({ channelId: "general", authorId: "alice", body: "@Micro hello" }), actor, settings), "hello");
  assert.equal(activatedText(message({ channelId: "general", authorId: "alice", body: "hello", mentionIds: ["micro"] }), actor, settings), "hello");
  assert.equal(activatedText(message({ channelId: "general", authorId: "alice", body: "@micro" }), actor, settings), "");
  assert.equal(activatedText(message({ channelId: "general", authorId: "alice", body: "hello" }), actor, settings), undefined);
  assert.equal(activatedText(message({ channelId: "general", authorId: "micro", body: "@micro loop" }), actor, settings), undefined);
  assert.equal(activatedText(message({ channelId: "general", authorId: "alice", body: "@micro gone", deletedAt: 1 }), actor, settings), undefined);
  assert.equal(activatedText(message({ authorId: "alice", body: "@micro no channel" }), actor, settings), undefined);
  assert.equal(activatedText(message({ channelId: "random", authorId: "alice", body: "@micro no" }), actor, { ...settings, allowedChannelIds: ["general"] }), undefined);
});

test("builds bounded same-channel context with member labels", () => {
  const { state } = fixture();
  state.messages.newer = { id: "newer", channelId: "general", authorId: "guest", authorName: "Visitor", body: "Newest", createdAt: 4 };
  const current = { id: "current", channelId: "general", authorId: "alice", body: "@micro help", createdAt: 5 };
  assert.deepEqual(recentContext(state, current, 1), [{ role: "user", content: "Visitor: Newest" }]);
  assert.deepEqual(recentContext(state, current, 0), []);
  const prompt = promptFor(state, current, "help", { ...settings, contextMessages: 1, systemPrompt: "system" });
  assert.deepEqual(prompt, [
    { role: "system", content: "system" },
    { role: "user", content: "Visitor: Newest" },
    { role: "user", content: "Alice: help" }
  ]);

  state.messages.future = { id: "z-future", channelId: "general", authorId: "alice", body: "Future", createdAt: 5 };
  assert.equal(recentContext(state, current, 10).some((item) => item.content.includes("Future")), false);
});

test("ignores bot authors and replies to this bot so two bots cannot recurse", () => {
  const { state } = fixture();
  state.members.bot = { displayName: "Other Bot", kind: "bot" };
  assert.equal(activatedText({ id: "bot-message", channelId: "general", authorId: "bot", body: "hello", mentionIds: ["micro"] }, { memberId: "micro" }, settings, state), undefined);
  state.messages.own = { id: "own", channelId: "general", authorId: "micro", body: "answer" };
  assert.equal(activatedText({ id: "reply", replyToId: "own", channelId: "general", authorId: "alice", body: "again", mentionIds: ["micro"] }, { memberId: "micro" }, settings, state), undefined);
});

test("does not infer bot identity from spoofable message or profile fields", () => {
  const { state } = fixture();
  state.members.spoof = { displayName: "Weather BOT", serviceId: "fake.service" };
  const message = { id: "spoof", channelId: "general", authorId: "spoof", authorKind: "bot", body: "@micro hello" };
  assert.equal(activatedText(message, { memberId: "micro" }, settings, state), "hello");
  state.members.spoof.kind = "bot";
  assert.equal(activatedText(message, { memberId: "micro" }, settings, state), undefined);
});

test("excludes authoritative bot messages from model context", () => {
  const { state } = fixture();
  state.members.bot = { displayName: "Other Bot", kind: "bot" };
  state.messages.bot = { id: "bot-context", channelId: "general", authorId: "bot", body: "hidden bot text", createdAt: 4 };
  const current = { id: "current", channelId: "general", authorId: "alice", body: "@micro help", createdAt: 5 };
  assert.equal(recentContext(state, current, 10).some((item) => item.content.includes("hidden bot text")), false);
});

test("reads only the three locally requested state paths", () => {
  const { service, state } = fixture();
  assert.deepEqual(roomStateForBot(service), state);
});

test("replies once to an activated message and ignores unrelated messages", async () => {
  const room = fixture();
  const prompts = [];
  const bot = createMoshBot(room.service, { async generate(prompt) { prompts.push(prompt); return "Local answer"; } }, settings);
  room.emit({ id: "ignored", channelId: "general", authorId: "alice", body: "hello", createdAt: 5 });
  room.emit({ id: "question", channelId: "general", authorId: "alice", body: "@micro help", createdAt: 6 });
  room.emit({ id: "question", channelId: "general", authorId: "alice", body: "@micro help", createdAt: 6 });
  await bot.idle();
  assert.equal(prompts.length, 1);
  assert.deepEqual(room.dispatches, [{
    type: "message.reply",
    payload: { channelId: "general", replyToId: "question", body: "Local answer", mentionIds: ["alice"] },
    options: {
      pluginId: "gg.matterhorn.mosh.plugin",
      idempotencyKey: room.dispatches[0].options.idempotencyKey,
      clientOperationId: room.dispatches[0].options.clientOperationId
    }
  }]);
  assert.equal(room.dispatches[0].options.idempotencyKey, room.dispatches[0].options.clientOperationId);
  await bot.close();
});

test("serializes responses and reports failures without logging message text", async () => {
  const room = fixture();
  const failures = [];
  let active = 0;
  let maximumActive = 0;
  const bot = createMoshBot(room.service, {
    async generate() {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      if (!failures.length) throw new Error("failed");
      return "second";
    }
  }, { ...settings, maxAttempts: 1, retryBaseMs: 0, onError(error, context) { failures.push({ error: error.message, context }); } });
  room.emit({ id: "first", channelId: "general", authorId: "alice", body: "@micro secret one" });
  room.emit({ id: "second", channelId: "general", authorId: "alice", body: "@micro secret two" });
  await bot.idle();
  assert.equal(maximumActive, 1);
  assert.deepEqual(failures, [{ error: "failed", context: { messageId: "first", phase: "inference" } }]);
  assert.deepEqual(room.dispatches.map((dispatch) => dispatch.payload.replyToId), ["first", "second"]);
  await bot.close();
});

test("does not dispatch a response after closing during inference", async () => {
  const room = fixture();
  let release;
  const model = { generate: () => new Promise((resolve) => { release = resolve; }) };
  const bot = createMoshBot(room.service, model, settings);
  room.emit({ id: "question", channelId: "general", authorId: "alice", body: "@micro wait" });
  await new Promise((resolve) => setImmediate(resolve));
  const closing = bot.close();
  release("late answer");
  await closing;
  assert.deepEqual(room.dispatches, []);
  room.emit({ id: "later", channelId: "general", authorId: "alice", body: "@micro ignored" });
});

test("captures messages immediately while model warmup is still pending", async () => {
  const room = fixture();
  let release;
  const model = { generate: () => new Promise((resolve) => { release = resolve; }) };
  const bot = createMoshBot(room.service, model, settings);
  room.emit({ id: "during-warmup", channelId: "general", authorId: "alice", body: "@micro queued", createdAt: 10 });
  await bot.ready();
  await new Promise((resolve) => setImmediate(resolve));
  release("after warmup");
  await bot.idle();
  assert.equal(room.dispatches[0].payload.replyToId, "during-warmup");
  await bot.close();
});

test("recovers durable pending triggers and uses a stable reply identity", async () => {
  const room = fixture();
  const identity = replyIdentity("pending-message");
  room.stored.set(BOT_INBOX_STORAGE_KEY, {
    version: 1,
    pending: [{
      messageId: "pending-message",
      channelId: "general",
      authorId: "alice",
      prompt: [{ role: "user", content: "Alice: recover" }],
      queuedAt: 1,
      attempts: 0
    }],
    completed: [],
    observedThrough: { id: "pending-message", createdAt: 1 }
  });
  const bot = createMoshBot(room.service, { async generate() { return "recovered"; } }, settings);
  await bot.idle();
  assert.equal(room.dispatches[0].options.idempotencyKey, identity);
  assert.equal(room.dispatches[0].options.clientOperationId, identity);
  assert.deepEqual(room.stored.get(BOT_INBOX_STORAGE_KEY).completed, ["pending-message"]);
  await bot.close();
});

test("bounds bursts and emits one explicit overflow response per channel window", async () => {
  const room = fixture();
  let release;
  let blocked = true;
  const gate = new Promise((resolve) => { release = () => { blocked = false; resolve(); }; });
  const model = { async generate() { if (blocked) await gate; return "done"; } };
  const drops = [];
  const bot = createMoshBot(room.service, model, {
    ...settings,
    queueCapacity: 2,
    perMemberLimit: 100,
    perChannelLimit: 100,
    onDrop: (event) => drops.push(event)
  });
  await bot.ready();
  for (let index = 0; index < 5; index += 1) {
    room.emit({ id: `burst-${index}`, channelId: "general", authorId: "alice", body: "@micro work", createdAt: index + 1 });
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(drops.some((event) => event.reason === "overflow"), true);
  assert.equal(room.dispatches.filter((dispatch) => dispatch.payload.body.includes("capacity")).length, 1);
  release("done");
  await bot.close({ timeoutMs: 50 });
});

test("retries inference without dropping the active trigger from a full inbox", async () => {
  const room = fixture();
  const drops = [];
  let attempts = 0;
  const bot = createMoshBot(room.service, {
    async generate() {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary model failure");
      return "recovered";
    }
  }, { ...settings, queueCapacity: 1, retryBaseMs: 0, onDrop: (event) => drops.push(event) });
  await bot.ready();
  room.emit({ id: "retry-model", channelId: "general", authorId: "alice", body: "@micro retry" });
  await bot.idle();
  assert.equal(attempts, 2);
  assert.equal(room.dispatches.at(-1).payload.body, "recovered");
  assert.deepEqual(drops, []);
  await bot.close();
});

test("retries relay delivery with the same idempotency key", async () => {
  let deliveryAttempts = 0;
  const room = fixture({
    async dispatch() {
      deliveryAttempts += 1;
      if (deliveryAttempts === 1) throw new Error("relay disconnected");
      return { committed: true };
    }
  });
  const bot = createMoshBot(room.service, { async generate() { return "one answer"; } }, {
    ...settings,
    retryBaseMs: 0,
    onError() {}
  });
  await bot.ready();
  room.emit({ id: "retry-delivery", channelId: "general", authorId: "alice", body: "@micro send" });
  await bot.idle();
  assert.equal(deliveryAttempts, 2);
  assert.equal(room.dispatches[0].options.idempotencyKey, room.dispatches[1].options.idempotencyKey);
  assert.deepEqual(room.stored.get(BOT_INBOX_STORAGE_KEY).completed, ["retry-delivery"]);
  await bot.close();
});
