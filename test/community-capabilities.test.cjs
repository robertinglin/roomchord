const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../mosh.cjs");

const composition = app.toJSON();
const pluginKeys = composition.plugins.map((plugin) => plugin.key || plugin.id);

test("community composes Matterhorn calendar, polls, and channel primitives", () => {
  for (const plugin of ["calendar", "polls", "channels"]) assert.ok(pluginKeys.includes(plugin), `${plugin} must be composed from Matterhorn`);
  for (const unused of ["labels", "approvals", "checklists", "locationPins"]) {
    assert.equal(pluginKeys.includes(unused), false, `${unused} must not be composed without an active Mosh use`);
  }
  const calendarAction = composition.actions.find((action) => action.type === "calendar.event.create");
  assert.ok(calendarAction, "calendar event creation must remain Matterhorn-backed");
  for (const operation of ["poll.create", "poll.vote", "poll.close", "calendar.event.rsvp", "calendar.notification.read", "channel.create", "channel.posting.policy", "channel.thread.policy", "channel.speaker.policy", "channel.voice-text.bind"]) {
    assert.ok(composition.actions.some((action) => action.type === operation), `${operation} must remain Matterhorn-backed`);
  }
  for (const operation of [
    "channel.forum.layout", "channel.forum.tag.create", "channel.forum.tag.update", "channel.forum.tag.archive",
    "comments.thread.archive", "comments.thread.reopen", "comments.thread.lock", "comments.thread.unlock",
    "comments.thread.member.add", "comments.thread.member.remove", "media.room.create.v2",
    "scope.parent.set", "scope.parent.remove"
  ]) {
    assert.ok(composition.actions.some((action) => action.type === operation), `${operation} must be exposed for its Mosh UI`);
  }
  const declaredAliases = app.toMatterhornExports().appPack.composition.actions;
  assert.equal(declaredAliases.find((action) => action.name === "mediaRoomCreateScoped")?.type, "media.room.create.v2");
  assert.equal(declaredAliases.some((action) => action.name === "scopeRoleSet"), false, "Mosh must not declare the legacy scope-role alias");
  for (const view of ["pollsForScope", "pollForId", "calendarNotificationsForMember", "channelsForScope", "channelForId", "postingPolicyForChannel"]) {
    assert.ok(composition.views.some((item) => item.name === view), `${view} must be exposed as a projection`);
  }
});

test("community state remains plugin-owned instead of cosmetic primary room state", () => {
  const initial = composition.primaryPlugin.model.state.initial;
  for (const key of ["polls", "pollVotes", "reports", "ruleAcceptances", "eventRsvps", "channelPolicies"]) {
    assert.equal(Object.prototype.hasOwnProperty.call(initial, key), false, `${key} must not fake unsupported authority`);
  }
});
