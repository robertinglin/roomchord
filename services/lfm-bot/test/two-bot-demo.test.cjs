const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const test = require("node:test");
const path = require("node:path");
const { MAX_TURNS, SAFE_DEMO_REPLIES, childService, conversationPrompt, createDemoBot, demoConfig, readableReply, runDemo, waitForLease, workerMain } = require("../src/two-bot-demo.cjs");

function environment() {
  return {
    LFM_DEMO_SUNNY_INVITE: "https://room.test/sunny",
    LFM_DEMO_SUNNY_SECRET: "sunny-secret",
    LFM_DEMO_CLOUDY_INVITE: "https://room.test/cloudy",
    LFM_DEMO_CLOUDY_SECRET: "cloudy-secret"
  };
}

test("loads two invite-bound bot identities with separate encrypted stores", () => {
  const config = demoConfig(environment(), "/service");
  assert.equal(config.bots[0].serviceId, "mosh.weather.sunny");
  assert.equal(config.bots[1].serviceId, "mosh.weather.cloudy");
  assert.equal(config.bots[0].storagePath, path.resolve("/service/.matterhorn/sunny-scout.enc"));
  assert.equal(config.bots[1].storageSecret, "cloudy-secret");
  assert.equal(config.autoStart, false);
  assert.throws(() => demoConfig({}, "/service"), /LFM_DEMO_SUNNY_INVITE is required/);
});

test("requests only authoritative bot admission, message send, state, and presence", async () => {
  let options;
  const service = { presence: { set: async () => undefined } };
  const bot = demoConfig(environment(), "/service").bots[0];
  assert.equal(await createDemoBot(bot, {
    encryptedFileStore(storagePath, storeOptions) {
      assert.equal(storagePath, `${bot.storagePath}.bot-state`);
      assert.deepEqual(storeOptions, { secret: bot.storageSecret });
      return "store";
    },
    async createBotRoomService(value) { options = value; return service; }
  }), service);
  assert.deepEqual(options.bot, { serviceId: "mosh.weather.sunny", displayName: "Sunny Scout" });
  assert.deepEqual(options.requestedCapabilities, {
    readState: ["messages", "members"],
    writeOperations: ["message.send"],
    presence: true
  });
  assert.equal(options.storage, "store");
});

test("runs one explicit lease for exactly 30 alternating messages", async () => {
  const sent = [];
  const services = [0, 1].map((botIndex) => ({
    presence: { set: async () => undefined },
    async dispatch(operation, payload, options) { sent.push({ botIndex, operation, payload, options }); },
    async close() {}
  }));
  let created = 0;
  let leaseCount = 0;
  const config = demoConfig({ ...environment(), LFM_DEMO_AUTO_START: "true" }, "/service");
  const result = await runDemo(config, {
    encryptedFileStore: () => ({}),
    createBotRoomService: async () => services[created++],
    createLocalModel: () => ({ ready: async () => undefined, generate: async () => "A short weather plan." }),
    waitForLease: async (autoStart) => { assert.equal(autoStart, true); leaseCount += 1; }
  });
  assert.equal(leaseCount, 1);
  assert.equal(result.transcript.length, MAX_TURNS);
  assert.equal(sent.length, MAX_TURNS);
  assert.deepEqual(sent.map((item) => item.botIndex), Array.from({ length: MAX_TURNS }, (_, index) => index % 2));
  assert.equal(sent[0].operation, "message.send");
  assert.match(sent[0].payload.body, /^01\/30 /u);
  assert.match(sent.at(-1).payload.body, /^30\/30 /u);
});

test("keeps the prompt bounded and names the fixed lease", () => {
  const transcript = Array.from({ length: 12 }, (_, index) => ({ name: "Bot", body: `turn ${index}` }));
  const prompt = conversationPrompt("A persona.", transcript, 1);
  assert.equal(prompt.length, 10);
  assert.match(prompt[0].content, /exactly 30-turn/u);
  assert.match(prompt.at(-1).content, /Continue the conversation/u);
});

test("replaces degenerate micro-model output with readable bounded dialogue", async () => {
  assert.equal(readableReply("It should stay mild, so I will walk to the market today."), true);
  assert.equal(readableReply("00:00:00:00:00:00:00:00"), false);
  assert.equal(SAFE_DEMO_REPLIES.length, MAX_TURNS);

  const sent = [];
  const services = [0, 1].map(() => ({
    presence: { set: async () => undefined },
    async dispatch(_operation, payload) { sent.push(payload.body); },
    async close() {}
  }));
  let created = 0;
  await runDemo(demoConfig(environment(), "/service"), {
    encryptedFileStore: () => ({}),
    createBotRoomService: async () => services[created++],
    createLocalModel: () => ({ ready: async () => undefined, generate: async (_prompt) => {
      if (sent.length === 0) throw new Error("empty model output");
      return "00:00:00:00:00";
    } }),
    waitForLease: async () => undefined
  });
  assert.equal(sent.length, MAX_TURNS);
  assert.equal(sent[0], `01/30 ${SAFE_DEMO_REPLIES[0]}`);
  assert.equal(sent.at(-1), `30/30 ${SAFE_DEMO_REPLIES.at(-1)}`);
});

test("coordinates each bot through an isolated child process", async () => {
  class FakeChild extends EventEmitter {
    constructor() { super(); this.sent = []; this.disconnected = false; }
    send(message) {
      this.sent.push(message);
      if (message.type === "call") setImmediate(() => this.emit("message", { id: message.id, value: "ok" }));
    }
    disconnect() { this.disconnected = true; }
  }
  const child = new FakeChild();
  const service = childService({ serviceId: "bot" }, {
    fork(file, args, options) {
      assert.match(file, /two-bot-demo\.cjs$/u);
      assert.deepEqual(args, ["--bot-worker"]);
      assert.match(options.env.MOSH_LFM_DEMO_BOT, /"serviceId":"bot"/u);
      return child;
    }
  });
  child.emit("message", { type: "ready" });
  await service.ready;
  assert.equal(await service.dispatch("message.send", { body: "hello" }), "ok");
  assert.equal(await service.presence.set({ status: "online" }), "ok");
  await service.close();
  assert.equal(child.disconnected, true);
  assert.deepEqual(child.sent.map((message) => message.method), ["dispatch", "presence.set", "close"]);

  const failingChild = new FakeChild();
  failingChild.send = function send(message) { this.sent.push(message); };
  const failingService = childService({ serviceId: "failing" }, { fork: () => failingChild });
  failingChild.emit("message", { type: "ready" });
  await failingService.ready;
  const pending = failingService.dispatch("message.send", { body: "pending" });
  failingChild.emit("error", new Error("child crashed"));
  await assert.rejects(pending, /child crashed/);
});

test("supports interactive and automatic lease grants", async () => {
  await waitForLease(true);
  const input = new PassThrough();
  const output = new PassThrough();
  const waiting = waitForLease(false, input, output);
  input.write("\n");
  await waiting;
  assert.match(output.read().toString(), /30-turn lease/u);
});

test("closes an admitted bot when the second admission fails", async () => {
  let attempts = 0;
  let closes = 0;
  await assert.rejects(() => runDemo(demoConfig(environment(), "/service"), {
    encryptedFileStore: () => ({}),
    async createBotRoomService() {
      attempts += 1;
      if (attempts === 2) throw new Error("second admission failed");
      return {
        presence: { set: async () => undefined },
        async close() { closes += 1; }
      };
    }
  }), /second admission failed/);
  assert.equal(closes, 1);
});

test("runs the isolated bot IPC endpoint", async () => {
  const processApi = new EventEmitter();
  processApi.messages = [];
  processApi.send = (message) => processApi.messages.push(message);
  const calls = [];
  await workerMain({
    botJson: JSON.stringify({ inviteUrl: "invite", storagePath: "/bot", storageSecret: "secret", serviceId: "bot", displayName: "Bot" }),
    process: processApi,
    dependencies: {
      encryptedFileStore: () => ({}),
      createBotRoomService: async () => ({
        presence: { set: async () => undefined },
        async dispatch(...args) { calls.push(args); return "sent"; },
        async close() {}
      })
    }
  });
  processApi.emit("message", { type: "call", id: 7, method: "dispatch", args: ["message.send", { body: "hello" }] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, [["message.send", { body: "hello" }]]);
  assert.deepEqual(processApi.messages, [{ type: "ready" }, { id: 7, value: "sent" }]);
});
