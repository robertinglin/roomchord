async function setBotRoomProfile(service, profile) {
  const displayName = String(profile.displayName || "").trim();
  if (!displayName) throw new Error("Bot display name is required.");
  if (typeof service.profile?.updateRoomProfile !== "function") {
    throw new Error("Matterhorn room profile updates are unavailable.");
  }
  const patch = { nickname: displayName };
  if (profile.avatar) patch.avatar = profile.avatar;
  const result = await service.profile.updateRoomProfile(patch, { awaitPublication: true });
  if (result?.publication?.committed !== true) throw new Error("Bot room profile publication was not committed.");
  return result;
}

module.exports = { setBotRoomProfile };
