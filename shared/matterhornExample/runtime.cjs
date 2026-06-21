const { createExampleActor } = require("./identity.cjs");

let testingApiPromise;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function loadTestingApi() {
  testingApiPromise = testingApiPromise || import("matterhorn-sdk/testing");
  return testingApiPromise;
}

function currentAppPackHash(appPack) {
  return appPack?.composition?.schemaHash || appPack?.compatibility?.appProtocolHash || `${appPack?.id || "app"}@${appPack?.version || "0"}`;
}

function actionForType(appPack, type) {
  const matches = (appPack?.composition?.actions || []).filter((action) => action.type === type);
  return matches.length === 1 ? matches[0] : undefined;
}

function operationAction(appPack, operation) {
  const actionName = operation.action || operation.schemaAction;
  if (actionName) return actionName;
  const action = actionForType(appPack, operation.type);
  if (!action) throw new Error(`Operation ${operation.type || "unknown"} is not declared by a unique application action`);
  return action.name;
}

function createExampleRuntime({ appPack, hostPlugin, hostPlugins, roomId = "example_room", now = () => 1000 } = {}) {
  if (!appPack) throw new Error("appPack is required");
  const runtimePlugins = hostPlugins || (hostPlugin ? [hostPlugin] : []);
  if (!runtimePlugins.length) throw new Error("hostPlugin or hostPlugins is required");

  const operationIds = [];
  const roomPromise = loadTestingApi().then(({ createTestRoom }) => createTestRoom(
    { toJSON: () => ({ appPack }) },
    { now, operationId: () => operationIds.shift() || `test_${Date.now()}` }
  ));

  async function room() {
    return roomPromise;
  }

  return {
    async start() {
      await room();
    },
    async handleOperation(operation) {
      const action = operationAction(appPack, operation);
      operationIds.push(operation.id || operation.clientOperationId || `op_${operation.seq || Date.now()}`);
      try {
        await (await room()).as(operation.actor || createExampleActor()).dispatch(action, operation.input || operation.payload || {});
        return { ok: true, acceptedLedgerId: operation.id || operation.clientOperationId };
      } catch (error) {
        return { ok: false, reason: error?.message || String(error) };
      }
    },
    async getState() {
      return {
        room: { id: roomId, appPack: { id: appPack.id, version: appPack.version, hash: currentAppPackHash(appPack) } },
        plugins: { [runtimePlugins[0].id]: (await room()).state }
      };
    },
    async publicView() {
      return this.getState();
    }
  };
}

function createExampleOperationFactory({ appPack, hostPlugin, hostPlugins, roomId = "example_room", actor, startSeq = 1, startTime = 1000 } = {}) {
  if (!appPack) throw new Error("appPack is required");
  const defaultPlugin = hostPlugin || (Array.isArray(hostPlugins) ? hostPlugins[0] : undefined);
  if (!defaultPlugin) throw new Error("hostPlugin or hostPlugins is required");
  let seq = startSeq - 1;
  return function makeOperation(type, payload, overrides = {}) {
    seq += 1;
    const opSeq = overrides.seq ?? seq;
    const opActor = overrides.actor || actor || createExampleActor({ role: "admin", memberId: "admin", displayName: "Admin" });
    const action = actionForType(appPack, type);
    return {
      id: overrides.id || `demo_${opSeq}`,
      clientOperationId: overrides.id || `demo_${opSeq}`,
      roomId: overrides.roomId || roomId,
      appPackId: appPack.id,
      appPackHash: currentAppPackHash(appPack),
      action: action?.name,
      schemaAction: action?.name,
      pluginId: overrides.pluginId || defaultPlugin.id,
      type,
      actor: opActor,
      seq: opSeq,
      createdAt: overrides.createdAt ?? (startTime + opSeq),
      payload,
      input: payload,
      auth: overrides.auth || { credentialId: `cred_${opActor.memberId}`, signature: "sig" }
    };
  };
}

async function applyExampleOperations(runtime, operations) {
  const results = [];
  for (const operation of operations) {
    const result = await runtime.handleOperation(operation);
    if (!result.ok) {
      const error = new Error(result.reason || `Operation ${operation.id} rejected`);
      error.result = result;
      error.operation = operation;
      throw error;
    }
    results.push(result);
  }
  return results;
}

module.exports = { applyExampleOperations, createExampleOperationFactory, createExampleRuntime };
