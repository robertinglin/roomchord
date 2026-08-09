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
  return { createInvite, dispatch, handlers: managementActions({ live, view: {} } as never) };
}

describe("role management actions", () => {
  it("materializes fail-closed private channel role access with administrator recovery", async () => {
    const { dispatch, handlers } = setup();
    await handlers.createTextChannel({ name: "staff", visibility: "private", allowedRoleIds: ["moderator"], allowedMemberIds: ["alice"] });
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

  it("creates scoped media rooms parent-first and cleans up a failed create", async () => {
    const { dispatch, handlers } = setup();
    dispatch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("create failed")).mockResolvedValueOnce(undefined);

    await expect(handlers.createMediaRoom({ name: "Standup", allowsVideo: true })).rejects.toThrow("create failed");

    const parent = dispatch.mock.calls[0][1];
    expect(dispatch.mock.calls[0]).toEqual(["scopeParentSet", expect.objectContaining({ scopeType: "media-room", parentScopeType: "channel", parentScopeId: "general" })]);
    expect(dispatch.mock.calls[1]).toEqual(["mediaRoomCreateScoped", expect.objectContaining({ roomId: parent.scopeId, parentScopeType: "channel", parentScopeId: "general" })]);
    expect(dispatch.mock.calls[1][1]).not.toHaveProperty("roleAccess");
    expect(dispatch.mock.calls[2]).toEqual(["scopeParentRemove", { scopeType: "media-room", scopeId: parent.scopeId }]);
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
