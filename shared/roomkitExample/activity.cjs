const { actorName } = require("./identity.cjs");

function entityId(prefix, op) {
  const source = typeof op === "string" ? op : op.id;
  return `${prefix}_${source.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function activity(state, op, message, extra = {}) {
  return [
    ...(state.activity || []),
    {
      id: entityId("activity", op),
      actorId: op.actor.memberId,
      actorName: actorName(op.actor),
      operationId: op.id,
      message,
      createdAt: op.createdAt,
      ...extra
    }
  ];
}

function latestActivity(pluginState, limit = 5) {
  return (pluginState.activity || []).slice(-limit).reverse();
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

module.exports = { activity, countBy, entityId, latestActivity };
