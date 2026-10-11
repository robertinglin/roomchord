const assert = require("node:assert/strict");
const test = require("node:test");
const sdkApp = require("../mosh.cjs");

const app = sdkApp.toExports();

function primaryOperation(type) {
  return app.compositionSchema.primaryPlugin.model.operations[type];
}

test("category schema seeds stable categories and channel references", () => {
  const initial = app.compositionSchema.primaryPlugin.model.state.initial;
  assert.deepEqual(initial.categories.map(({ id, name, position }) => ({ id, name, position })), [
    { id: "general", name: "General", position: 0 },
    { id: "guest", name: "Guest", position: 1 },
    { id: "voice-rooms", name: "Voice Rooms", position: 2 }
  ]);
  assert.deepEqual(initial.voiceRoomPlacements, [
    { id: "voice", roomId: "voice", categoryId: "voice-rooms", position: 0 },
    { id: "guest_voice", roomId: "guest_voice", categoryId: "voice-rooms", position: 1 }
  ]);
  assert.deepEqual(initial.channels.map(({ id, categoryId, position }) => ({ id, categoryId, position })), [
    { id: "general", categoryId: "general", position: 0 },
    { id: "guest", categoryId: "guest", position: 0 }
  ]);
});

test("category lifecycle operations are Admin-scoped and channel writes retain legacy group", () => {
  for (const type of ["category.create", "category.update", "category.archive", "category.reorder"]) {
    assert.deepEqual(primaryOperation(type).authorize, { roles: ["admin"] });
  }
  const create = primaryOperation("channel.create");
  const categoryCreate = primaryOperation("category.create");
  assert.ok(categoryCreate.payload.optional.visibility);
  assert.ok(categoryCreate.payload.optional.allowedRoleIds);
  assert.ok(categoryCreate.payload.optional.allowedMemberIds);
  assert.ok(create.payload.optional.categoryId);
  assert.ok(create.payload.optional.group);
  assert.ok(create.payload.optional.visibility);
  assert.ok(create.payload.required.requiredRole);
  assert.ok(primaryOperation("channel.rename").payload.optional.categoryId);
  assert.ok(primaryOperation("channel.rename").payload.optional.requiredRole);
  const reorder = primaryOperation("channel.reorder");
  assert.ok(reorder.payload.required.categoryId);
  assert.ok(reorder.payload.required.position);
  assert.equal(reorder.payload.optional?.name, undefined);
});
