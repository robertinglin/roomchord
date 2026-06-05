const publisher = {
  id: "com.roomkit.examples",
  name: "RoomKit Examples",
  publicKey: "rk_pub_examples"
};

const trust = {
  signatures: [{ publicKey: "rk_pub_examples", signature: "sig_examples" }]
};

function roleAtLeast(actor, roles) {
  return actor && roles.includes(actor.role);
}

function actorName(actor) {
  return actor?.displayName || actor?.memberId || "Unknown";
}

function createExampleActor(overrides = {}) {
  const role = overrides.role || "admin";
  const memberId = overrides.memberId || role;
  return {
    memberId,
    deviceId: overrides.deviceId || `dev_${memberId}`,
    role,
    displayName: overrides.displayName || memberId,
    ...overrides
  };
}

module.exports = { actorName, createExampleActor, publisher, roleAtLeast, trust };
