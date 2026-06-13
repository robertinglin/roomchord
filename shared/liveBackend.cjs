#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { manifestHash } = require('@mh-gg/base');
const { ensureOperationIdentity, validateRoomOperation } = require('@mh-gg/protocol');
const { applyExampleOperations, createExampleRuntime } = require('./matterhornExample/runtime.cjs');
const { createExampleActor } = require('./matterhornExample/identity.cjs');

const SHARED_PLUGIN_IDS = Object.freeze({
  comments: 'gg.matterhorn.examples.plugins.comments',
  presence: 'gg.matterhorn.examples.plugins.presence',
  mediaRooms: 'gg.matterhorn.examples.plugins.media-rooms',
  screenShare: 'gg.matterhorn.examples.plugins.screen-share',
  embeds: 'gg.matterhorn.examples.plugins.embeds',
  reactions: 'gg.matterhorn.examples.plugins.reactions',
  attachments: 'gg.matterhorn.examples.plugins.attachments',
  approvals: 'gg.matterhorn.examples.plugins.approvals',
  labels: 'gg.matterhorn.examples.plugins.labels',
  checklists: 'gg.matterhorn.examples.plugins.checklists',
  calendar: 'gg.matterhorn.examples.plugins.calendar',
  markdown: 'gg.matterhorn.examples.plugins.markdown',
  locationPins: 'gg.matterhorn.examples.plugins.location-pins'
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function loadMatterhornExampleApp(appRoot = process.cwd()) {
  const resolved = path.resolve(appRoot);
  const entry = path.join(resolved, 'src', 'sdk-app.cjs');
  if (!fs.existsSync(entry)) throw new Error(`Matterhorn example app entry not found: ${entry}`);
  const definition = require(entry);
  return { appRoot: resolved, app: definition.toMatterhornExports() };
}

function appSlug(appRoot, app) {
  return app?.appDefinition?.slug || path.basename(appRoot);
}

function appRoomId(appRoot, app, roomId) {
  return roomId || `${appSlug(appRoot, app)}_live_room`;
}

function actorFromRequest(value = {}) {
  const actor = createExampleActor({
    memberId: value.memberId || 'local-admin',
    deviceId: value.deviceId || `dev_${value.memberId || 'local-admin'}`,
    role: value.role || 'admin',
    displayName: value.displayName || value.name || 'Local Admin'
  });
  const allowed = new Set(['guest', 'member', 'moderator', 'admin', 'owner']);
  if (!allowed.has(actor.role)) actor.role = 'member';
  return actor;
}

function pluginSelectionId(app, selection) {
  if (!selection || selection === 'primary' || selection === '$primary') return app.hostPlugin.id;
  if (selection === 'core' || selection === 'matterhorn.core') return 'matterhorn.core';
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

function actionForDraft(app, draft = {}) {
  const declared = typeof draft.schemaAction === 'string' && draft.schemaAction ? draft.schemaAction : (typeof draft.action === 'string' && draft.action ? draft.action : undefined);
  let action = declared ? actionByName(app, declared) : undefined;
  if (!action && draft.type && (!declared || declared === draft.type)) action = actionByType(app, draft.type);
  if (!action) {
    throw new Error(declared
      ? `Application schema action ${declared} is not declared`
      : `Operation ${draft.type || 'unknown'} must be sent through an application schema action alias`);
  }
  if (draft.type && draft.type !== action.type && draft.type !== action.name) {
    throw new Error(`Application schema action ${action.name} maps to ${action.type}, not ${draft.type}`);
  }
  const pluginId = pluginSelectionId(app, action.plugin);
  if (draft.pluginId && draft.pluginId !== pluginId) {
    throw new Error(`Application schema action ${action.name} maps to plugin ${pluginId}, not ${draft.pluginId}`);
  }
  return { action, pluginId };
}

function pluginIdForOperationType(app, type, explicitPluginId) {
  if (explicitPluginId) return explicitPluginId;
  const action = actionByType(app, type);
  if (action) return pluginSelectionId(app, action.plugin);
  throw new Error(`Operation ${type} is not declared by a unique application schema action`);
}

function normalizeDraftForApp(app, draft = {}) {
  const appId = String(app.appPack?.id || '').toLowerCase();
  const next = { ...draft, payload: { ...(draft.payload || {}) } };
  if (appId.includes('polls')) {
    if (next.type === 'poll.create') {
      const rawOptions = next.payload.options;
      const options = Array.isArray(rawOptions) ? rawOptions.map(String) : String(rawOptions || 'Yes,No').split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
      next.payload = { ...next.payload, title: next.payload.title || next.payload.question || 'Untitled poll', options, kind: next.payload.kind || 'single' };
      delete next.payload.question;
    } else if (next.type === 'poll.vote') {
      next.type = 'vote.cast';
      next.payload = { pollId: next.payload.pollId, choice: next.payload.choice || next.payload.optionId || (Array.isArray(next.payload.optionIds) ? next.payload.optionIds[0] : undefined) };
    } else if (next.type === 'poll.comment') {
      next.type = 'comments.add';
      next.pluginId = pluginSelectionId(app, 'comments');
      next.payload = { scopeType: 'poll', scopeId: next.payload.pollId, body: next.payload.body || next.payload.comment || 'Comment' };
    }
  }
  if (appId.includes('wiki')) {
    if (next.type === 'page.link') {
      next.type = 'link.add';
      next.payload = { fromPageId: next.payload.fromPageId || next.payload.pageId, toPageId: next.payload.toPageId || next.payload.targetPageId };
    } else if (next.type === 'page.comment') {
      next.type = 'comments.add';
      next.pluginId = pluginSelectionId(app, 'comments');
      next.payload = { scopeType: 'page', scopeId: next.payload.pageId, body: next.payload.body || next.payload.comment || 'Comment' };
    }
  }
  if (appId.includes('budget')) {
    if (next.type === 'expense.add') next.payload = { ...next.payload, title: next.payload.title || next.payload.description || 'Expense' };
    if (next.type === 'settlement.record') next.payload = { ...next.payload, from: next.payload.from || next.payload.fromMemberId, to: next.payload.to || next.payload.toMemberId };
  }
  return next;
}

function operationFromDraft(app, roomId, draft = {}, sequence, now = Date.now()) {
  draft = normalizeDraftForApp(app, draft);
  const target = actionForDraft(app, draft);
  const actor = actorFromRequest(draft.actor || {});
  const createdAt = Number.isFinite(Number(draft.createdAt)) ? Number(draft.createdAt) : now;
  const payload = {
    ...(target.action.payloadDefaults || {}),
    ...(draft.payload || {})
  };
  const operation = {
    clientOperationId: draft.clientOperationId || draft.id || `live_${sequence}`,
    roomId,
    appPackId: app.appPack.id,
    appPackHash: manifestHash(app.appPack),
    schemaAction: target.action.name,
    pluginId: target.pluginId,
    type: target.action.type,
    actor,
    seq: sequence,
    createdAt,
    hlc: draft.hlc,
    payload,
    auth: {
      credentialId: draft.auth?.credentialId || `cred_${actor.memberId}`,
      signature: draft.auth?.signature || 'sig'
    }
  };
  return ensureOperationIdentity(operation, { now: createdAt, nodeId: actor.deviceId || actor.memberId || 'live' });
}

function values(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function commentsByScope(commentsState = {}) {
  const grouped = {};
  for (const comment of Object.values(commentsState.comments || {})) {
    const thread = commentsState.threads?.[comment.threadId];
    const key = thread?.scopeId || comment.threadId;
    if (!key) continue;
    grouped[key] = grouped[key] || [];
    grouped[key].push(comment);
  }
  return grouped;
}

function publicMembersView(members = {}) {
  const view = {};
  for (const [key, member] of Object.entries(members || {})) {
    const id = member?.memberId || member?.id || key;
    if (!id) continue;
    view[id] = {
      id,
      memberId: id,
      name: member.name,
      displayName: member.displayName,
      role: member.role,
      status: member.status,
      revokedAt: member.revokedAt,
      bannedAt: member.bannedAt
    };
  }
  return view;
}

function projectFrameworkState(primary = {}, plugins = {}) {
  return {
    ...clone(primary),
    tasks: values(primary.tasks),
    notes: values(primary.notes),
    presence: clone(plugins[SHARED_PLUGIN_IDS.presence]?.members || {}),
    mediaRooms: values(plugins[SHARED_PLUGIN_IDS.mediaRooms]?.rooms).map((room) => ({
      ...room,
      participants: Object.keys(room.participants || {})
    })),
    screenShares: values(plugins[SHARED_PLUGIN_IDS.screenShare]?.shares)
  };
}

function projectEventsState(primary = {}, plugins = {}) {
  return {
    ...clone(primary),
    access: clone(primary.access || {}),
    comments: clone(plugins[SHARED_PLUGIN_IDS.comments] || { threads: {}, comments: {}, activity: [] }),
    locationPins: clone(plugins[SHARED_PLUGIN_IDS.locationPins]?.pins || {}),
    rooms: values(plugins[SHARED_PLUGIN_IDS.mediaRooms]?.rooms),
    screenShares: clone(plugins[SHARED_PLUGIN_IDS.screenShare]?.shares || {}),
    presence: clone(plugins[SHARED_PLUGIN_IDS.presence]?.members || {}),
    documents: clone(plugins[SHARED_PLUGIN_IDS.markdown]?.documents || {}),
    attachments: clone(plugins[SHARED_PLUGIN_IDS.attachments]?.attachments || {}),
    approvals: clone(plugins[SHARED_PLUGIN_IDS.approvals]?.requests || {}),
    calendarEvents: clone(plugins[SHARED_PLUGIN_IDS.calendar]?.events || {}),
    checklists: clone(plugins[SHARED_PLUGIN_IDS.checklists]?.checklists || {})
  };
}

function projectStateForFrontend(app, runtimeState) {
  const plugins = runtimeState?.plugins || {};
  const primary = { ...clone(plugins[app.hostPlugin.id] || {}), access: clone(runtimeState?.access || {}) };
  const slug = appSlug(app.matterhornApp?.frontend?.root || '', app);
  const lowerId = String(app.appPack?.id || '').toLowerCase();

  if (lowerId.includes('react') || lowerId.includes('svelte') || lowerId.includes('vue') || lowerId.includes('lit') || lowerId.includes('vanilla')) {
    return projectFrameworkState(primary, plugins);
  }

  const projected = { ...primary };
  const comments = plugins[SHARED_PLUGIN_IDS.comments];
  if (comments?.comments) projected.comments = commentsByScope(comments);
  const mediaRooms = plugins[SHARED_PLUGIN_IDS.mediaRooms];
  if (mediaRooms?.rooms) projected.rooms = values(mediaRooms.rooms);
  const screenShares = plugins[SHARED_PLUGIN_IDS.screenShare];
  if (screenShares?.shares) projected.screenShares = clone(screenShares.shares);
  const presence = plugins[SHARED_PLUGIN_IDS.presence];
  if (presence?.members) projected.presence = clone(presence.members);
  const embeds = plugins[SHARED_PLUGIN_IDS.embeds];
  if (embeds?.embeds) projected.embeds = clone(embeds.embeds);
  const reactions = plugins[SHARED_PLUGIN_IDS.reactions];
  if (reactions?.reactions) projected.reactions = clone(reactions.reactions);

  if (lowerId.includes('chat')) {
    projected.commentThreads = clone(comments?.threads || {});
    projected.comments = clone(comments?.comments || {});
    projected.embeds = clone(embeds?.embeds || {});
    projected.reactions = clone(reactions?.reactions || {});
    projected.members = publicMembersView(runtimeState?.members || {});
    projected.directThreads = clone(runtimeState?.direct?.threads || {});
    projected.directMessages = clone(runtimeState?.direct?.messages || {});
    projected.directKeys = clone(runtimeState?.direct?.keys || {});
    return projected;
  }
  if (lowerId.includes('event')) return projectEventsState(primary, plugins);
  if (lowerId.includes('kanban')) {
    projected.comments = projected.comments || {};
    return projected;
  }
  if (lowerId.includes('wiki')) {
    const revisions = primary.revisions || {};
    const links = primary.links || {};
    const commentsByPage = projected.comments || {};
    const pages = {};
    for (const [pageId, page] of Object.entries(primary.pages || {})) {
      pages[pageId] = {
        ...page,
        tags: page.tags || [],
        links: Object.values(links).filter((link) => link.fromPageId === pageId).map((link) => link.toPageId),
        comments: commentsByPage[pageId] || [],
        revisions: Object.values(revisions).filter((revision) => revision.pageId === pageId),
        updatedAt: page.updatedAt || page.createdAt || 0
      };
    }
    return { ...projected, pages, order: Object.keys(pages) };
  }
  if (lowerId.includes('polls')) {
    const polls = {};
    const commentsByPoll = projected.comments || {};
    for (const [pollId, poll] of Object.entries(primary.polls || {})) {
      const votes = {};
      for (const vote of Object.values(primary.votes || {})) {
        if (vote.pollId !== pollId) continue;
        votes[vote.voterId || vote.actorId || vote.id] = { optionId: vote.choice, votedAt: vote.createdAt };
      }
      polls[pollId] = {
        ...poll,
        question: poll.question || poll.title,
        mode: poll.kind === 'ranked' ? 'multiple' : 'single',
        options: (poll.options || []).map((option, index) => typeof option === 'string' ? { id: option, label: option } : { id: option.id || `${pollId}_opt_${index + 1}`, label: option.label || String(option) }),
        votes,
        comments: commentsByPoll[pollId] || []
      };
    }
    return { ...projected, polls, order: Object.keys(polls) };
  }
  if (lowerId.includes('budget')) {
    const expenses = {};
    for (const [id, expense] of Object.entries(primary.expenses || {})) expenses[id] = { ...expense, description: expense.description || expense.title || 'Expense', paidByName: expense.paidByName || expense.paidBy };
    const settlements = {};
    for (const [id, settlement] of Object.entries(primary.settlements || {})) settlements[id] = { ...settlement, fromMemberId: settlement.fromMemberId || settlement.from, toMemberId: settlement.toMemberId || settlement.to };
    return { ...projected, currency: primary.currency || primary.settings?.currency || 'USD', expenses, settlements };
  }
  if (lowerId.includes('crm')) {
    return { ...projected, stageOrder: primary.stageOrder || Object.keys(primary.stages || {}) };
  }
  return projected;
}

function safeObjectFileName(value) {
  return String(value || '').replace(/[^A-Za-z0-9_.:-]+/g, '_').slice(0, 240) || 'object';
}

function gitObjectStoreDir(appRoot, roomId) {
  return path.join(appRoot, '.matterhorn-live-objects', roomId.replace(/[^A-Za-z0-9_.-]/g, '_'));
}

function gitObjectFile(appRoot, roomId, objectId) {
  return path.join(gitObjectStoreDir(appRoot, roomId), `${safeObjectFileName(objectId)}.json`);
}

function saveGitObjectEnvelope(appRoot, roomId, envelope = {}) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('Object envelope must be an object');
  if (!envelope.objectId || typeof envelope.objectId !== 'string') throw new Error('objectId is required');
  if (!envelope.kind || typeof envelope.kind !== 'string') throw new Error('kind is required');
  const file = gitObjectFile(appRoot, roomId, envelope.objectId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(envelope));
  return { objectId: envelope.objectId, kind: envelope.kind, bytes: fs.statSync(file).size };
}

function loadGitObjectEnvelope(appRoot, roomId, objectId) {
  const file = gitObjectFile(appRoot, roomId, objectId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function dataFileFor(appRoot, roomId) {
  const dataDir = path.join(appRoot, '.matterhorn-live');
  return path.join(dataDir, `${roomId.replace(/[^A-Za-z0-9_.-]/g, '_')}.json`);
}

function loadPersisted(file) {
  if (!file || !fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(parsed.operations) ? parsed.operations : [];
}

function savePersisted(file, operations) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ version: 1, operations }, null, 2));
}

function currentAppPackHash(app) {
  return manifestHash(app.appPack);
}

function operationWithCurrentAppPack(app, roomId, operation) {
  validateRoomOperation(operation);
  const appPackHash = currentAppPackHash(app);
  if (operation.appPackHash === appPackHash) return { operation, upgraded: false };
  if (operation.roomId !== roomId || operation.appPackId !== app.appPack.id) return { operation, upgraded: false };
  const upgraded = ensureOperationIdentity({ ...operation, appPackHash }, {
    now: operation.createdAt,
    nodeId: operation.actor?.deviceId || operation.actor?.memberId || 'live'
  });
  return { operation: upgraded, upgraded: true };
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

async function createLiveExampleBackend(options = {}) {
  const { appRoot, app } = loadMatterhornExampleApp(options.appRoot || process.cwd());
  const roomId = appRoomId(appRoot, app, options.roomId);
  const persistedFile = options.persist === false ? undefined : (options.dataFile || dataFileFor(appRoot, roomId));
  const runtime = createExampleRuntime({
    appPack: app.appPack,
    hostPlugins: app.hostPlugins,
    roomId,
    now: () => Date.now(),
    actorVerifier: async (_auth, actor) => actorFromRequest(actor)
  });
  await runtime.start();

  const persisted = operationsWithCurrentAppPack(app, roomId, loadPersisted(persistedFile));
  if (persisted.operations.length) {
    await applyExampleOperations(runtime, persisted.operations);
    if (persisted.upgraded) savePersisted(persistedFile, persisted.operations);
  } else if (options.seedDemo !== false && typeof app.createDemoOperations === 'function') {
    const seedOps = app.createDemoOperations(roomId);
    await applyExampleOperations(runtime, seedOps);
    savePersisted(persistedFile, seedOps);
  }
  let operations = persisted.operations.length ? persisted.operations.slice() : (options.seedDemo === false ? [] : (typeof app.createDemoOperations === 'function' ? app.createDemoOperations(roomId) : []));
  let seq = operations.length;

  async function projectedState(actor = actorFromRequest()) {
    return projectStateForFrontend(app, await runtime.publicView(actor));
  }

  async function handleDraftOperation(draft = {}) {
    seq += 1;
    const operation = operationFromDraft(app, roomId, draft, seq, Date.now());
    const result = await runtime.handleOperation(operation);
    if (!result.ok) {
      return {
        ok: false,
        code: result.code,
        field: result.field,
        reason: result.reason || result.error || 'Operation rejected',
        state: await projectedState(operation.actor),
        operation
      };
    }
    operations.push(operation);
    savePersisted(persistedFile, operations);
    return { ok: true, state: await projectedState(operation.actor), operation };
  }

  return {
    app,
    appRoot,
    roomId,
    runtime,
    persistedFile,
    getState: projectedState,
    sendOperation: handleDraftOperation,
    async rawState() { return runtime.getState(); }
  };
}

function readJson(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store'
  });
  res.end(body);
}

async function startLiveExampleServer(options = {}) {
  const backend = await createLiveExampleBackend(options);
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return sendJson(res, 204, {});
      const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      if (req.method === 'GET' && url.pathname === '/matterhorn/health') return sendJson(res, 200, { ok: true, roomId: backend.roomId, appId: backend.app.appPack.id });
      if (req.method === 'GET' && url.pathname === '/matterhorn/app') return sendJson(res, 200, { ok: true, roomId: backend.roomId, appPack: backend.app.appPack, composition: backend.app.compositionSchema });
      if (req.method === 'GET' && url.pathname === '/matterhorn/state') return sendJson(res, 200, { ok: true, state: await backend.getState() });
      if (req.method === 'POST' && url.pathname === '/matterhorn/git/object') return sendJson(res, 200, { ok: true, object: saveGitObjectEnvelope(backend.appRoot, backend.roomId, await readJson(req, 32 * 1024 * 1024)) });
      if (req.method === 'GET' && url.pathname.startsWith('/matterhorn/git/object/')) {
        const objectId = decodeURIComponent(url.pathname.slice('/matterhorn/git/object/'.length));
        const object = loadGitObjectEnvelope(backend.appRoot, backend.roomId, objectId);
        return object ? sendJson(res, 200, { ok: true, object }) : sendJson(res, 404, { ok: false, reason: 'Object not found' });
      }
      if (req.method === 'POST' && url.pathname === '/matterhorn/operation') return sendJson(res, 200, await backend.sendOperation(await readJson(req)));
      sendJson(res, 404, { ok: false, reason: 'Not found' });
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: error?.message || String(error) });
    }
  });
  const port = Number(options.port || process.env.MATTERHORN_EXAMPLE_BACKEND_PORT || 0);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, options.host || '127.0.0.1', resolve);
  });
  return {
    ...backend,
    server,
    port: server.address().port,
    url: `http://${options.host || '127.0.0.1'}:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

function parseArgs(argv) {
  const args = { appRoot: process.cwd(), seedDemo: true, persist: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--app') args.appRoot = argv[++i];
    else if (arg === '--port') args.port = Number(argv[++i]);
    else if (arg === '--room') args.roomId = argv[++i];
    else if (arg === '--no-seed') args.seedDemo = false;
    else if (arg === '--no-persist') args.persist = false;
    else if (arg === '--data-file') args.dataFile = argv[++i];
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
  loadMatterhornExampleApp,
  operationFromDraft,
  pluginIdForOperationType,
  projectStateForFrontend,
  loadGitObjectEnvelope,
  saveGitObjectEnvelope,
  startLiveExampleServer
};
