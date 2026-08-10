const assert = require("node:assert/strict");
const test = require("node:test");
const { setBotRoomProfile } = require("../src/profile.cjs");

test("sets the bot name through Matterhorn's room-profile API", async () => {
  const patches = [];
  const service = {
    profile: {
      async updateRoomProfile(patch, options) {
        patches.push({ patch, options });
        return { profile: { roomProfile: patch }, publication: { committed: true } };
      }
    }
  };

  const profile = await setBotRoomProfile(service, { displayName: "  Sunny  ", avatar: "sunny.png" });

  assert.deepEqual(patches, [{ patch: { nickname: "Sunny", avatar: "sunny.png" }, options: { awaitPublication: true } }]);
  assert.deepEqual(profile, { profile: { roomProfile: { nickname: "Sunny", avatar: "sunny.png" } }, publication: { committed: true } });
});

test("requires a name and the existing Matterhorn profile capability", async () => {
  await assert.rejects(() => setBotRoomProfile({}, { displayName: "Sunny" }), /profile updates are unavailable/);
  await assert.rejects(() => setBotRoomProfile({ profile: {} }, { displayName: " " }), /display name is required/);
  await assert.rejects(() => setBotRoomProfile({
    profile: { updateRoomProfile: async () => ({ publication: { committed: false } }) }
  }, { displayName: "Sunny" }), /was not committed/);
});
