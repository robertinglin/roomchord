#!/usr/bin/env node
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { permissions } = require("matterhorn-sdk");
const { createExampleActor } = require("./matterhornExample/identity.cjs");

const SHARED_PLUGIN_IDS = Object.freeze({
  comments: "gg.matterhorn.examples.plugins.comments",
  presence: "gg.matterhorn.examples.plugins.presence",
  mediaRooms: "gg.matterhorn.examples.plugins.media-rooms",
  screenShare: "gg.matterhorn.examples.plugins.screen-share",
  embeds: "gg.matterhorn.examples.plugins.embeds",
  reactions: "gg.matterhorn.examples.plugins.reactions"
});

let testingApiPromise;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function loadTestingApi() {
  testingApiPromise = testingApiPromise || import("matterhorn-sdk/testing");
  return testingApiPromise;
}

function loadMatterhornExampleApp(appRoot = process.cwd()) {
  const resolved = path.resolve(appRoot);
  const entry = path.join(resolved, "../mosh.cjs");
  if (!fs.existsSync(entry)) throw new Error(`Matterhorn example app entry not found: ${entry}`);
  return { appRoot: resolved, app: require(entry).toMatterhornExports() };
}

function appSlug(appRoot, app) {
  return app?.appDefinition?.slug || path.basename(appRoot);
}

function appRoomId(appRoot, app, roomId) {
  return roomId || `${appSlug(appRoot, app)}_live_room`;
}

function actorFromRequest(value = {}) {
  const actor = createExampleActor({
    memberId: value.memberId || "local-admin",
    deviceId: value.deviceId || `dev_${value.memberId || "local-admin"}`,
    role: value.role || "admin",
    displayName: value.displayName || value.name || "Local Admin"
  });
  return ["guest", "member", "moderator", "admin", "owner"].includes(actor.role) ? actor : { ...actor, role: "member" };
}

function pluginSelectionId(app, selection) {
  if (!selection || selection === "primary" || selection === "$primary") return app.hostPlugin.id;
  if (selection === "core" || selection === "matterhorn.core") return "matterhorn.core";
  const schemaPlugin = app.compositionSchema?.plugins?.find((plugin) => plugin.key === selection || plugin.id === selection);
  if (schemaPlugin?.id) return schemaPlugin.id;
  const packPlugin = app.appPack?.composition?.plugins?.find((plugin) => plugin.key === selection || plugin.id === selection);
  if (packPlugin?.id) return packPlugin.id;
  return SHARED_PLUGIN_IDS[selection] || selection;
}

function compositionActions(app) {
  return app.compositionSchema?.actions || app.appPack?.composition?.actions || [];
}

function actionByName(app, name) {
  return compositionActions(app).find((entry) => entry?.name === name);
}

function actionByType(app, type) {
  const matches = compositionActions(app).filter((entry) => entry?.type === type);
  return matches.length === 1 ? matches[0] : undefined;
}

function pluginIdForOperationType(app, type, explicitPluginId) {
  if (explicitPluginId) return explicitPluginId;
  const action = actionByType(app, type);
  if (!action) throw new Error(`Operation ${type} is not declared by a unique application schema action`);
  return pluginSelectionId(app, action.plugin);
}

function actionForDraft(app, draft = {}) {
  const declared = typeof draft.schemaAction === "string" && draft.schemaAction
    ? draft.schemaAction
    : (typeof draft.action === "string" && draft.action ? draft.action : undefined);
  let action = declared ? actionByName(app, declared) : undefined;
  if (!action && draft.type && (!declared || declared === draft.type)) action = actionByType(app, draft.type);
  if (!action) throw new Error(declared ? `Application schema action ${declared} is not declared` : `Operation ${draft.type || "unknown"} must use an application schema action`);
  if (draft.type && draft.type !== action.type && draft.type !== action.name) throw new Error(`Application schema action ${action.name} maps to ${action.type}, not ${draft.type}`);
  const pluginId = pluginSelectionId(app, action.plugin);
  if (draft.pluginId && draft.pluginId !== pluginId) throw new Error(`Application schema action ${action.name} maps to plugin ${pluginId}, not ${draft.pluginId}`);
  return { action, pluginId };
}

function currentAppPackHash(app) {
  return app.compositionSchema?.schemaHash || app.appPack?.compatibility?.appProtocolHash || `${app.appPack.id}@${app.appPack.version}`;
}

function operationFromDraft(app, roomId, draft = {}, sequence, now = Date.now()) {
  const target = actionForDraft(app, draft);
  const actor = actorFromRequest(draft.actor || {});
  const createdAt = Number.isFinite(Number(draft.createdAt)) ? Number(draft.createdAt) : now;
  const payload = { ...(target.action.payloadDefaults || {}), ...(draft.payload || draft.input || {}) };
  const id = draft.clientOperationId || draft.id || `live_${sequence}`;
  return {
    id,
    clientOperationId: id,
    roomId,
    appPackId: app.appPack.id,
    appPackHash: currentAppPackHash(app),
    action: target.action.name,
    schemaAction: target.action.name,
    pluginId: target.pluginId,
    type: target.action.type,
    actor,
    seq: sequence,
    createdAt,
    payload,
    input: payload,
    auth: {
      credentialId: draft.auth?.credentialId || `cred_${actor.memberId}`,
      signature: draft.auth?.signature || "sig"
    }
  };
}

function operationWithCurrentAppPack(app, roomId, operation) {
  if (!operation || typeof operation !== "object") throw new Error("Persisted operation must be an object");
  const target = actionForDraft(app, operation);
  const appPackHash = currentAppPackHash(app);
  const shouldUpgrade = operation.roomId === roomId && operation.appPackId === app.appPack.id && operation.appPackHash !== appPackHash;
  return {
    operation: {
      ...operation,
      appPackHash: shouldUpgrade ? appPackHash : operation.appPackHash,
      action: target.action.name,
      schemaAction: target.action.name,
      pluginId: target.pluginId,
      type: target.action.type,
      input: operation.input || operation.payload || {},
      payload: operation.payload || operation.input || {}
    },
    upgraded: shouldUpgrade
  };
}

function operationsWithCurrentAppPack(app, roomId, operations = []) {
  let upgraded = false;
  const next = operations.map((operation) => {
    const result = operationWithCurrentAppPack(app, roomId, operation);
    upgraded = upgraded || result.upgraded;
    return result.operation;
  });
  return { operations: next, upgraded };
}

function defaultMediaRooms(app) {
  const plugin = app.compositionSchema?.plugins?.find((item) => item.key === "mediaRooms");
  return (plugin?.config?.defaultRooms || []).map((room) => ({ ...clone(room), roleAccess: room.roleAccess || {}, participants: {} }));
}

function projectStateForFrontend(app, primary = {}, actor = actorFromRequest()) {
  const projected = {
    ...clone(primary),
    comments: {},
    commentThreads: {},
    directKeys: {},
    directMessages: {},
    directThreads: {},
    embeds: {},
    members: {},
    presence: {},
    reactions: {},
    rooms: defaultMediaRooms(app),
    screenShares: {}
  };
  return permissions.filterStateForActor(projected, actor, {
    metadata: { composition: app.compositionSchema, appPack: { composition: app.appPack?.composition } }
  });
}

function safeObjectFileName(value) {
  return String(value || "").replace(/[^A-Za-z0-9_.:-]+/g, "_").slice(0, 240) || "object";
}

function gitObjectStoreDir(appRoot, roomId) {
  return path.join(appRoot, ".matterhorn-live-objects", roomId.replace(/[^A-Za-z0-9_.-]/g, "_"));
}

function gitObjectFile(appRoot, roomId, objectId) {
  return path.join(gitObjectStoreDir(appRoot, roomId), `${safeObjectFileName(objectId)}.json`);
}

function saveGitObjectEnvelope(appRoot, roomId, envelope = {}) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new Error("Object envelope must be an object");
  if (!envelope.objectId || typeof envelope.objectId !== "string") throw new Error("objectId is required");
  if (!envelope.kind || typeof envelope.kind !== "string") throw new Error("kind is required");
  const file = gitObjectFile(appRoot, roomId, envelope.objectId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(envelope));
  return { objectId: envelope.objectId, kind: envelope.kind, bytes: fs.statSync(file).size };
}

function loadGitObjectEnvelope(appRoot, roomId, objectId) {
  const file = gitObjectFile(appRoot, roomId, objectId);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function dataFileFor(appRoot, roomId) {
  return path.join(appRoot, ".matterhorn-live", `${roomId.replace(/[^A-Za-z0-9_.-]/g, "_")}.json`);
}

function loadPersisted(file) {
  if (!file || !fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(parsed.operations) ? parsed.operations : [];
}

function savePersisted(file, operations) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ version: 1, operations }, null, 2));
}

async function createRoom(app) {
  const { createTestRoom } = await loadTestingApi();
  const operationIds = [];
  const room = createTestRoom({ toJSON: () => app.compositionSchema }, {
    operationId: () => operationIds.shift() || `live_${Date.now()}`
  });
  return { room, operationIds };
}

async function dispatchOperation(room, operationIds, operation) {
  operationIds.push(operation.id || operation.clientOperationId || `op_${operation.seq || Date.now()}`);
  return room.as(operation.actor || actorFromRequest()).dispatch(operation.action || operation.schemaAction, operation.input || operation.payload || {});
}

async function createLiveExampleBackend(options = {}) {
  const { appRoot, app } = loadMatterhornExampleApp(options.appRoot || process.cwd());
  const roomId = appRoomId(appRoot, app, options.roomId);
  const persistedFile = options.persist === false ? undefined : (options.dataFile || dataFileFor(appRoot, roomId));
  const { room, operationIds } = await createRoom(app);
  const persisted = operationsWithCurrentAppPack(app, roomId, loadPersisted(persistedFile));
  for (const operation of persisted.operations) await dispatchOperation(room, operationIds, operation);
  if (persisted.upgraded) savePersisted(persistedFile, persisted.operations);
  let operations = persisted.operations.slice();
  let seq = operations.reduce((max, operation) => Math.max(max, Number(operation.seq) || 0), 0);

  async function projectedState(actor = actorFromRequest()) {
    return projectStateForFrontend(app, room.state, actor);
  }

  async function handleDraftOperation(draft = {}) {
    seq += 1;
    const operation = operationFromDraft(app, roomId, draft, seq, Date.now());
    try {
      await dispatchOperation(room, operationIds, operation);
    } catch (error) {
      return { ok: false, reason: error?.message || String(error), state: await projectedState(operation.actor), operation };
    }
    operations.push(operation);
    savePersisted(persistedFile, operations);
    return { ok: true, state: await projectedState(operation.actor), operation };
  }

  return {
    app,
    appRoot,
    roomId,
    persistedFile,
    getState: projectedState,
    sendOperation: handleDraftOperation,
    async rawState() {
      return { plugins: { [app.hostPlugin.id]: room.state } };
    }
  };
}

function readJson(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}


function actorFromUrl(url) {
  const raw = url.searchParams.get("actor");
  if (!raw) return actorFromRequest();
  try {
    return actorFromRequest(JSON.parse(raw));
  } catch {
    return actorFromRequest();
  }
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store"
  });
  res.end(body);
}

async function startLiveExampleServer(options = {}) {
  const backend = await createLiveExampleBackend(options);
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") return sendJson(res, 204, {});
      const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
      if (req.method === "GET" && url.pathname === "/matterhorn/health") return sendJson(res, 200, { ok: true, roomId: backend.roomId, appId: backend.app.appPack.id });
      if (req.method === "GET" && url.pathname === "/matterhorn/app") return sendJson(res, 200, { ok: true, roomId: backend.roomId, appPack: backend.app.appPack, composition: backend.app.compositionSchema });
      if (req.method === "GET" && url.pathname === "/matterhorn/state") return sendJson(res, 200, { ok: true, state: await backend.getState(actorFromUrl(url)) });
      if (req.method === "POST" && url.pathname === "/matterhorn/git/object") return sendJson(res, 200, { ok: true, object: saveGitObjectEnvelope(backend.appRoot, backend.roomId, await readJson(req, 32 * 1024 * 1024)) });
      if (req.method === "GET" && url.pathname.startsWith("/matterhorn/git/object/")) {
        const objectId = decodeURIComponent(url.pathname.slice("/matterhorn/git/object/".length));
        const object = loadGitObjectEnvelope(backend.appRoot, backend.roomId, objectId);
        return object ? sendJson(res, 200, { ok: true, object }) : sendJson(res, 404, { ok: false, reason: "Object not found" });
      }
      if (req.method === "POST" && url.pathname === "/matterhorn/operation") return sendJson(res, 200, await backend.sendOperation(await readJson(req)));
      sendJson(res, 404, { ok: false, reason: "Not found" });
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: error?.message || String(error) });
    }
  });
  const port = Number(options.port || process.env.MATTERHORN_EXAMPLE_BACKEND_PORT || 0);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, options.host || "127.0.0.1", resolve);
  });
  return {
    ...backend,
    server,
    port: server.address().port,
    url: `http://${options.host || "127.0.0.1"}:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

function parseArgs(argv) {
  const args = { appRoot: process.cwd(), seedDemo: true, persist: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--app") args.appRoot = argv[++i];
    else if (arg === "--port") args.port = Number(argv[++i]);
    else if (arg === "--room") args.roomId = argv[++i];
    else if (arg === "--no-seed") args.seedDemo = false;
    else if (arg === "--no-persist") args.persist = false;
    else if (arg === "--data-file") args.dataFile = argv[++i];
  }
  return args;
}

if (require.main === module) {
  startLiveExampleServer(parseArgs(process.argv.slice(2))).then((server) => {
    console.log(`Matterhorn live example backend for ${server.app.appPack.id} listening on ${server.url}`);
    console.log(`Room: ${server.roomId}`);
    if (server.persistedFile) console.log(`Data: ${server.persistedFile}`);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createLiveExampleBackend,
  currentAppPackHash,
  loadMatterhornExampleApp,
  operationFromDraft,
  pluginIdForOperationType,
  projectStateForFrontend,
  loadGitObjectEnvelope,
  saveGitObjectEnvelope,
  startLiveExampleServer
};
