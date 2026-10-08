import { describe, expect, it, vi } from "vitest";
import { managementActions } from "./managementActions";

function setup(role: string = "admin") {
  const dispatch = vi.fn().mockResolvedValue(undefined);
  const createInvite = vi.fn(async (value) => ({ id: "invite-1", status: "active", createdAt: 1, ...value }));
  const live = {
    actor: { memberId: "alice", role },
    dispatch,
    state: {
      channels: [],
      roleDefinitions: {},
      scopedRoles: {
        roles: {
          launch: { roleId: "launch", generation: 1, revision: 2, definitionHash: "sha256:old", name: "Launch", rules: [] }
        },
        assignments: {}
      }
    },
    management: {
      getSnapshot: vi.fn(async () => ({ members: [], invites: [] })),
      invites: { create: createInvite }
    }
  };
  return { createInvite, dispatch, live, handlers: managementActions({ live, view: {} } as never) };
}

describe("role management actions", () => {
  it("materializes private category access with administrator recovery", async () => {
    const { dispatch, handlers } = setup();
    await handlers.createCategory({ name: "Staff", visibility: "private", allowedRoleIds: ["moderator"], allowedMemberIds: ["alice"] });

    expect(dispatch).toHaveBeenCalledWith("categoryCreate", expect.objectContaining({
      name: "Staff",
      visibility: "private",
      allowedRoleIds: ["admin", "owner", "moderator"],
      allowedMemberIds: ["alice"]
    }));
  });

  it("materializes fail-closed private channel role access with administrator recovery", async () => {
    const { dispatch, handlers } = setup();
    const staffChannelId = await handlers.createTextChannel({ name: "staff", visibility: "private", allowedRoleIds: ["moderator"], allowedMemberIds: ["alice"] });
    expect(staffChannelId).toMatch(/^channel_/);
    await handlers.createTextChannel({ name: "public", visibility: "public" });

    expect(dispatch).toHaveBeenNthCalledWith(1, "channelCreate", expect.objectContaining({ requiredRole: "__private__", allowedRoleIds: ["admin", "owner", "moderator"], allowedMemberIds: ["alice"] }));
    expect(dispatch).toHaveBeenNthCalledWith(2, "channelCreate", expect.objectContaining({ requiredRole: "member", allowedRoleIds: [], allowedMemberIds: [] }));
  });

  it("sets a category parent before creating a channel with one stable id", async () => {
    const { dispatch, handlers } = setup();
    await handlers.createTextChannel({ name: "launch", categoryId: "planning" });

    const parent = dispatch.mock.calls[0];
    const create = dispatch.mock.calls[1];
    expect(parent[0]).toBe("scopeParentSet");
    expect(parent[1]).toMatchObject({ scopeType: "channel", parentScopeType: "category", parentScopeId: "planning" });
    expect(create[0]).toBe("channelCreate");
    expect(create[1].channelId).toBe(parent[1].scopeId);
  });

  it("creates and binds a voice text channel, then removes it if binding fails", async () => {
    const { dispatch, handlers } = setup();
    const channelId = await handlers.createVoiceTextChannel({ roomId: "voice-1", name: "Standup Chat", categoryId: "voice-rooms" });
    expect(channelId).toMatch(/^channel_/);
    expect(dispatch).toHaveBeenNthCalledWith(1, "scopeParentSet", expect.objectContaining({ scopeType: "channel", parentScopeId: "voice-rooms" }));
    expect(dispatch).toHaveBeenNthCalledWith(2, "channelCreate", expect.objectContaining({ channelId, name: "Standup Chat" }));
    expect(dispatch).toHaveBeenNthCalledWith(3, "channelVoiceTextBind", { channelId, mediaRoomId: "voice-1" });

    dispatch.mockClear();
    dispatch.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("binding failed")).mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    await expect(handlers.createVoiceTextChannel({ roomId: "voice-2", name: "Fallback Chat", categoryId: "voice-rooms" })).rejects.toThrow("binding failed");
    const createdId = dispatch.mock.calls[0][1].scopeId;
    expect(dispatch).toHaveBeenNthCalledWith(1, "scopeParentSet", expect.objectContaining({ scopeId: createdId }));
    expect(dispatch).toHaveBeenNthCalledWith(2, "channelCreate", expect.objectContaining({ channelId: createdId }));
    expect(dispatch).toHaveBeenNthCalledWith(3, "channelVoiceTextBind", { channelId: createdId, mediaRoomId: "voice-2" });
    expect(dispatch).toHaveBeenNthCalledWith(4, "channelArchive", { channelId: createdId });
    expect(dispatch).toHaveBeenNthCalledWith(5, "scopeParentRemove", { scopeType: "channel", scopeId: createdId });
  });

  it("persists channel ordering positions on create and update", async () => {
    const { dispatch, handlers, live } = setup();
    await handlers.createTextChannel({ name: "first", categoryId: "planning", position: 3 });

    const created = dispatch.mock.calls.find(([name]) => name === "channelCreate");
    expect(created?.[1]).toMatchObject({ name: "first", categoryId: "planning", position: 3 });

    dispatch.mockClear();
    live.state.channels.push({ id: "first", name: "First", topic: "Planning", group: "Work", categoryId: "planning", position: 3, visibility: "public" } as never);
    await handlers.updateTextChannel("first", { position: 1 });

    expect(dispatch).toHaveBeenCalledWith("channelRename", expect.objectContaining({
      channelId: "first",
      name: "First",
      topic: "Planning",
      group: "Work",
      categoryId: "planning",
      position: 1
    }));
  });

  it("reorders channels without sending mutable channel fields", async () => {
    const { dispatch, handlers, live } = setup();
    live.state.channels.push({ id: "first", name: "First", categoryId: "planning", position: 3 } as never);

    await handlers.reorderTextChannel("first", "shipping", 1);

    expect(dispatch).toHaveBeenNthCalledWith(1, "scopeParentSet", expect.objectContaining({ scopeId: "first", parentScopeId: "shipping" }));
    expect(dispatch).toHaveBeenNthCalledWith(2, "channelReorder", { channelId: "first", categoryId: "shipping", position: 1 });
    expect(dispatch.mock.calls[1][1]).not.toHaveProperty("name");
  });

  it("writes shared text and voice pin policy through admin actions", async () => {
    const { dispatch, handlers } = setup("admin");

    await handlers.setChannelPinned("channel", "general", true);
    await handlers.setChannelPinned("voice", "voice-1", false);

    expect(dispatch).toHaveBeenNthCalledWith(1, "channelPin", {
      pinId: "channel:general",
      channelId: "general",
      channelKind: "channel"
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, "channelUnpin", {
      pinId: "voice:voice-1",
      channelId: "voice-1",
      channelKind: "voice"
    });
  });

  it("creates scoped media rooms parent-first and cleans up a failed create", async () => {
    const { dispatch, handlers } = setup();
    dispatch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("create failed")).mockResolvedValueOnce(undefined);

    await expect(handlers.createMediaRoom({ name: "Standup", allowsVideo: true })).rejects.toThrow("create failed");

    const parent = dispatch.mock.calls[0][1];
    expect(dispatch.mock.calls[0]).toEqual(["scopeParentSet", expect.objectContaining({ scopeType: "media-room", parentScopeType: "category", parentScopeId: "voice-rooms" })]);
    expect(dispatch.mock.calls[1]).toEqual(["mediaRoomCreateScoped", expect.objectContaining({ roomId: parent.scopeId, parentScopeType: "category", parentScopeId: "voice-rooms" })]);
    expect(dispatch.mock.calls[1][1]).not.toHaveProperty("roleAccess");
    expect(dispatch.mock.calls[2]).toEqual(["mediaRoomArchive", { roomId: parent.scopeId }]);
    expect(dispatch.mock.calls[3]).toEqual(["scopeParentRemove", { scopeType: "media-room", scopeId: parent.scopeId }]);
  });

  it("persists voice room category placement after creation", async () => {
    const { dispatch, handlers } = setup();
    await handlers.createMediaRoom({ name: "Standup", allowsVideo: true, categoryId: "general", position: 2 });

    expect(dispatch).toHaveBeenNthCalledWith(3, "voiceRoomPlacementCreate", expect.objectContaining({ categoryId: "general", position: 2 }));
  });

  it("creates custom roles fail closed by default", async () => {
    const { dispatch, handlers } = setup();
    await handlers.createRole({ roleId: "launch", name: "Launch" });
    expect(dispatch).toHaveBeenCalledWith("roleCreate", expect.objectContaining({
      roleId: "launch",
      rules: [{ scopeType: "*", scopeId: "*", level: "none", allowOperations: [], denyOperations: [] }]
    }));
  });

  it("preserves the submitted scoped rules and CAS metadata on update", async () => {
    const { dispatch, handlers } = setup("owner");
    const rules = [{ scopeType: "channel", scopeId: "general", level: "editor", allowOperations: ["message.send"], denyOperations: [] }];
    await handlers.updateRole("launch", { name: "Launch Lead", rules });
    expect(dispatch).toHaveBeenCalledWith("roleUpdate", expect.objectContaining({
      roleId: "launch",
      generation: 1,
      revision: 2,
      previousHash: "sha256:old",
      rules
    }));
  });

  it("strips role-management operations from custom role rules", async () => {
    const { dispatch, handlers } = setup();
    await handlers.createRole({
      roleId: "launch",
      name: "Launch",
      rules: [{ scopeType: "*", scopeId: "*", level: "editor", allowOperations: ["access.role.define", "message.send"], denyOperations: ["scope.member.override.set"] }]
    });
    expect(dispatch).toHaveBeenCalledWith("roleCreate", expect.objectContaining({
      rules: [{ scopeType: "*", scopeId: "*", level: "editor", allowOperations: ["message.send"], denyOperations: [] }]
    }));
  });

  it("rejects custom-role and moderator actors before dispatch", async () => {
    for (const role of ["moderator", "launch"]) {
      const { dispatch, handlers } = setup(role);
      await expect(handlers.createRole({ roleId: "blocked", name: "Blocked" })).rejects.toThrow("administrator role");
      expect(dispatch).not.toHaveBeenCalled();
    }
  });

  it("creates invites through the authoritative management client", async () => {
    const { createInvite, handlers } = setup("owner");
    await handlers.createInvite({ name: "Reviewers", roleId: "member", maxUses: 4, expiresAt: 123 });
    expect(createInvite).toHaveBeenCalledWith({ name: "Reviewers", roleId: "member", maxUses: 4, expiresAt: 123 });
  });

  it("does not create invites for non-administrators", async () => {
    const { createInvite, handlers } = setup("moderator");
    await expect(handlers.createInvite({ roleId: "member" })).rejects.toThrow("administrator role");
    expect(createInvite).not.toHaveBeenCalled();
  });
});
