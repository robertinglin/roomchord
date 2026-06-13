const { manifestHash } = require("@mh-gg/base");
const { HostPluginRuntime, createMemoryOperationLog, createMemoryRoomStore } = require("@mh-gg/host-runtime");
const { ensureOperationIdentity } = require("@mh-gg/protocol");
const { createExampleActor } = require("./identity.cjs");

function createExampleRuntime({ appPack, hostPlugin, hostPlugins, roomId = "example_room", actorVerifier, now = () => 1000, capabilities = ["room.state", "room.roles"] } = {}) {
  if (!appPack) throw new Error("appPack is required");
  const runtimePlugins = hostPlugins || (hostPlugin ? [hostPlugin] : []);
  if (!runtimePlugins.length) throw new Error("hostPlugin or hostPlugins is required");
  return new HostPluginRuntime({
    room: {
      id: roomId,
      appPack: {
        id: appPack.id,
        version: appPack.version,
        hash: manifestHash(appPack),
        protocolHash: appPack.compatibility.appProtocolHash
      }
    },
    plugins: runtimePlugins,
    store: createMemoryRoomStore(),
    operationLog: createMemoryOperationLog(),
    capabilities,
    now,
    authenticateActor: async (auth, actor) => {
      if (typeof actorVerifier === "function") return actorVerifier(auth, actor);
      if (!auth || auth.signature !== "sig") throw new Error("Bad example signature");
      return actor;
    }
  });
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
    const operation = {
      clientOperationId: overrides.id || `demo_${opSeq}`,
      roomId: overrides.roomId || roomId,
      appPackId: appPack.id,
      appPackHash: manifestHash(appPack),
      pluginId: overrides.pluginId || defaultPlugin.id,
      type,
      actor: opActor,
      seq: opSeq,
      createdAt: overrides.createdAt ?? (startTime + opSeq),
      payload,
      hlc: overrides.hlc,
      auth: overrides.auth || { credentialId: `cred_${opActor.memberId}`, signature: "sig" }
    };
    return ensureOperationIdentity(operation, { now: operation.createdAt, nodeId: opActor.deviceId || opActor.memberId || "example" });
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
