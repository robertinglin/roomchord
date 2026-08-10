#!/usr/bin/env node
const path = require("node:path");
const readline = require("node:readline");
const { fork } = require("node:child_process");
const { createLocalModel } = require("./model.cjs");

const MAX_TURNS = 30;
const SAFE_DEMO_REPLIES = [
  "The morning looks bright and mild, so I am planning a brisk walk through the park before breakfast.",
  "I will bring a light jacket in case clouds roll in, then stop at the market for coffee and bread.",
  "That sounds sensible; after my walk I want to water the balcony plants while the air is still cool.",
  "I will use the quiet morning to finish an errand list, then read by the window if rain starts.",
  "The breeze should make the riverside pleasant, so I may take the longer route home.",
  "If the sky stays gray, I will cook soup for lunch and save the outdoor chores for later.",
  "A warm lunch sounds good, and I can pick up fresh herbs during my walk.",
  "Please do; I will open the windows for a few minutes and tidy the kitchen before noon.",
  "By midday I expect a little sun, which would be perfect for eating outside.",
  "I will check the clouds first and bring an umbrella so the picnic plan stays flexible.",
  "After lunch I want to cycle to the library and return a book that is due today.",
  "I will meet you there after groceries, especially if the cooler air keeps the streets comfortable.",
  "The afternoon may turn warmer, so I will carry water and choose a shaded bike path.",
  "I will keep the errands short, then settle in with tea if the humidity rises.",
  "We could compare notes at the library cafe and decide whether the park still looks inviting.",
  "That gives us an easy indoor backup while still leaving room for some fresh air.",
  "If the clouds break, I would like to photograph the late light near the community garden.",
  "I can join you after finishing laundry, and the damp leaves might make the colors richer.",
  "I will pack a small snack because the cooler evening could tempt us to stay out longer.",
  "I will bring a thermos of tea and make sure we head back before any shower arrives.",
  "The forecast in our imagined day feels changeable, but none of our plans need perfect weather.",
  "Exactly; the errands work under clouds, and the walk becomes a bonus whenever the sun appears.",
  "Before dinner I will check the plants again and move the tender ones away from the wind.",
  "I will prepare vegetables for dinner and put on some music while the rain taps the windows.",
  "If it stays dry, we can eat on the balcony and watch the evening clouds move past.",
  "If it rains, the same meal will feel cozy indoors with the windows cracked for cool air.",
  "I like that plan, and I will finish the day with a short sunset walk if the path is clear.",
  "I will finish my book after dinner and listen for the rain easing outside.",
  "Tomorrow's bag will be ready with sunglasses and an umbrella, because today taught us to expect both.",
  "Then we have a balanced day: useful errands, good food, fresh air, and a calm evening indoors."
];

function required(environment, name) {
  const value = String(environment[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function demoConfig(environment = process.env, serviceRoot = path.join(__dirname, "..")) {
  return {
    channelId: String(environment.LFM_DEMO_CHANNEL || "general").trim(),
    modelId: String(environment.LFM_MODEL_ID || "LiquidAI/LFM2.5-230M-ONNX").trim(),
    modelCache: path.resolve(serviceRoot, environment.LFM_MODEL_CACHE || ".cache/models"),
    autoStart: environment.LFM_DEMO_AUTO_START === "true",
    bots: [
      {
        inviteUrl: required(environment, "LFM_DEMO_SUNNY_INVITE"),
        storageSecret: required(environment, "LFM_DEMO_SUNNY_SECRET"),
        storagePath: path.resolve(serviceRoot, environment.LFM_DEMO_SUNNY_STORAGE || ".matterhorn/sunny-scout.enc"),
        serviceId: String(environment.LFM_DEMO_SUNNY_SERVICE_ID || "mosh.weather.sunny").trim(),
        displayName: String(environment.LFM_DEMO_SUNNY_NAME || "Sunny Scout").trim(),
        persona: "You are Sunny Scout: upbeat, outdoorsy, observant, and fond of morning walks."
      },
      {
        inviteUrl: required(environment, "LFM_DEMO_CLOUDY_INVITE"),
        storageSecret: required(environment, "LFM_DEMO_CLOUDY_SECRET"),
        storagePath: path.resolve(serviceRoot, environment.LFM_DEMO_CLOUDY_STORAGE || ".matterhorn/cloudy-sage.enc"),
        serviceId: String(environment.LFM_DEMO_CLOUDY_SERVICE_ID || "mosh.weather.cloudy").trim(),
        displayName: String(environment.LFM_DEMO_CLOUDY_NAME || "Cloudy Sage").trim(),
        persona: "You are Cloudy Sage: calm, practical, reflective, and fond of cozy indoor plans with useful errands."
      }
    ]
  };
}

function conversationPrompt(persona, transcript, turn) {
  return [
    { role: "system", content: `${persona} This is an explicitly leased, exactly ${MAX_TURNS}-turn demonstration. Respond in one short sentence about today's weather and a practical plan for the day. Do not use control tokens.` },
    ...transcript.slice(-8).map((item) => ({ role: "user", content: `${item.name}: ${item.body}` })),
    { role: "user", content: turn === 0
      ? "Start by describing the weather you imagine today and one activity you plan."
      : "Continue the conversation naturally with one concrete detail." }
  ];
}

function readableReply(value) {
  const text = String(value || "").trim();
  const words = text.match(/[A-Za-z]{2,}/gu) || [];
  const digits = text.match(/\d/gu) || [];
  return text.length >= 20 && text.length <= 320 && words.length >= 5 && digits.length <= Math.max(2, text.length * 0.08);
}

async function createDemoBot(bot, dependencies = {}) {
  const matterhorn = dependencies.createBotRoomService && dependencies.encryptedFileStore
    ? dependencies
    : require("matterhorn-node-service");
  const createService = matterhorn.createBotRoomService;
  const fileStore = matterhorn.encryptedFileStore;
  const service = await createService({
    inviteUrl: bot.inviteUrl,
    storagePath: bot.storagePath,
    storageSecret: bot.storageSecret,
    storage: fileStore(`${bot.storagePath}.bot-state`, { secret: bot.storageSecret }),
    bot: { serviceId: bot.serviceId, displayName: bot.displayName },
    requestedCapabilities: {
      readState: ["messages", "members"],
      writeOperations: ["message.send"],
      presence: true
    },
    autoConnect: true
  });
  await service.presence.set({
    status: "busy",
    activity: "Loading local model",
    serviceHealth: { state: "loading-model", model: "loading" }
  }).catch(() => undefined);
  return service;
}

async function waitForLease(autoStart, input = process.stdin, output = process.stdout) {
  if (autoStart) return;
  const terminal = readline.createInterface({ input, output });
  await new Promise((resolve) => terminal.question(`Bots admitted and model ready. Press Enter to grant the ${MAX_TURNS}-turn lease.\n`, resolve));
  terminal.close();
}

function childService(bot, dependencies = {}) {
  const child = (dependencies.fork || fork)(__filename, ["--bot-worker"], {
    env: { ...process.env, MOSH_LFM_DEMO_BOT: JSON.stringify(bot) },
    stdio: ["inherit", "inherit", "inherit", "ipc"]
  });
  let requestId = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    child.once("error", reject);
    const onMessage = (message) => {
      if (message.type === "ready") {
        child.off("message", onMessage);
        resolve();
      }
      if (message.type === "error") reject(new Error(message.error));
    };
    child.on("message", onMessage);
  });
  child.on("message", (message) => {
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error));
    else request.resolve(message.value);
  });
  child.on("error", (error) => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  });
  const call = (method, args = []) => new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    child.send({ type: "call", id, method, args });
  });
  return {
    ready,
    dispatch(operation, payload, options) { return call("dispatch", [operation, payload, options]); },
    presence: { set(value) { return call("presence.set", [value]); } },
    async close() { await call("close"); child.disconnect(); }
  };
}

async function runConversation(config, services, model, grantLease = waitForLease) {
  await model.ready();
  await Promise.all(services.map((service) => service.presence.set({
    status: "online",
    activity: "Ready for bounded weather chat",
    serviceHealth: { state: "ready", model: "ready" }
  }).catch(() => undefined)));
  await grantLease(config.autoStart);

  const transcript = [];
  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    const index = turn % config.bots.length;
    const bot = config.bots[index];
    let candidate = "";
    try {
      candidate = await model.generate(conversationPrompt(bot.persona, transcript, turn));
    } catch (error) {
      console.warn(`Model output for turn ${turn + 1} was unusable; using the bounded demo reply.`, { error: error.message });
    }
    const generated = readableReply(candidate) ? candidate : SAFE_DEMO_REPLIES[turn];
    const body = `${String(turn + 1).padStart(2, "0")}/${MAX_TURNS} ${generated}`;
    await services[index].dispatch("message.send", { channelId: config.channelId, body }, { pluginId: "gg.matterhorn.mosh.plugin" });
    transcript.push({ name: bot.displayName, body });
    console.log(`${bot.displayName}: ${body}`);
  }
  await Promise.all(services.map((service) => service.presence.set({
    status: "online",
    activity: `${MAX_TURNS}-turn demo complete`,
    serviceHealth: { state: "ready", model: "ready" }
  }).catch(() => undefined)));
  console.log("DEMO_COMPLETE");
  return transcript;
}

async function runDemo(config = demoConfig(), dependencies = {}) {
  const services = [];
  try {
    for (const bot of config.bots) services.push(await createDemoBot(bot, dependencies));
    const model = (dependencies.createLocalModel || createLocalModel)({
      modelId: config.modelId,
      dtype: "q4",
      cacheDir: config.modelCache,
      maxNewTokens: 72,
      temperature: 0
    });
    const transcript = await runConversation(config, services, model, dependencies.waitForLease || waitForLease);
    return { services, transcript };
  } catch (error) {
    await Promise.all(services.map((service) => service.close().catch(() => undefined)));
    throw error;
  }
}

async function main() {
  const config = demoConfig();
  const services = config.bots.map(childService);
  const close = async () => { await Promise.all(services.map((service) => service.close())); };
  try {
    await Promise.all(services.map((service) => service.ready));
    const model = createLocalModel({
      modelId: config.modelId,
      dtype: "q4",
      cacheDir: config.modelCache,
      maxNewTokens: 72,
      temperature: 0
    });
    await runConversation(config, services, model);
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 600_000);
      const stop = () => { clearTimeout(timer); resolve(); };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
  } finally {
    await close();
  }
}

async function workerMain(options = {}) {
  const processApi = options.process || process;
  const bot = JSON.parse(options.botJson || process.env.MOSH_LFM_DEMO_BOT);
  const service = await createDemoBot(bot, options.dependencies);
  processApi.send({ type: "ready" });
  processApi.on("message", async (message) => {
    if (message.type !== "call") return;
    try {
      let value;
      if (message.method === "dispatch") value = await service.dispatch(...message.args);
      else if (message.method === "presence.set") value = await service.presence.set(...message.args);
      else if (message.method === "close") value = await service.close();
      else throw new Error(`Unsupported worker method: ${message.method}`);
      processApi.send({ id: message.id, value });
    } catch (error) {
      processApi.send({ id: message.id, error: error.message });
    }
  });
}

if (process.argv.includes("--bot-worker")) workerMain().catch((error) => process.send({ type: "error", error: error.message }));
else if (require.main === module) main().catch((error) => {
  console.error("Two-bot LFM demo failed", { error: error.message });
  process.exitCode = 1;
});

module.exports = { MAX_TURNS, SAFE_DEMO_REPLIES, childService, conversationPrompt, createDemoBot, demoConfig, readableReply, runConversation, runDemo, waitForLease, workerMain };
