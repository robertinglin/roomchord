import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManageAdminTab } from "./ManageAdminTab";

describe("ManageAdminTab invite management", () => {
  it("submits role, expiry, and maximum joins through the parent callback", async () => {
    const user = userEvent.setup();
    const onCreateInvite = vi.fn().mockResolvedValue(undefined);
    render(
      <ManageAdminTab
        actor={{ memberId: "alice", role: "admin" } as any}
        canManageMembers
        managementSnapshot={{
          roles: [
            { id: "member", name: "Member", rules: [], systemRole: true },
            { id: "reviewer", name: "Reviewer", rules: [] }
          ],
          invites: [],
          members: [],
          actions: [],
          scopes: [],
          canManage: true,
          canManageRoles: true,
          canManageMembers: true,
          canManageInvites: true
        }}
        state={{ channels: [], members: {}, presence: {}, guests: {}, publicInvites: [], joinRequests: {} } as any}
        onApproveJoinRequest={vi.fn()}
        onBanMember={vi.fn()}
        onDenyJoinRequest={vi.fn()}
        onDisableInvite={vi.fn()}
        onModerateMember={vi.fn()}
        onRemoveInvite={vi.fn()}
        onUnbanMember={vi.fn()}
        onCreateInvite={onCreateInvite}
      />
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Invite role" }), "reviewer");
    await user.selectOptions(screen.getByRole("combobox", { name: "Invite expiry" }), "30");
    await user.type(screen.getByRole("spinbutton", { name: "Maximum joins" }), "3");
    await user.click(screen.getByRole("button", { name: "Create invite" }));

    expect(onCreateInvite).toHaveBeenCalledWith(expect.objectContaining({ roleId: "reviewer", maxUses: 3 }));
    expect(onCreateInvite.mock.calls[0][0].expiresAt).toBeGreaterThan(Date.now());
  });

  it("does not expose invite creation to a non-admin member", () => {
    render(
      <ManageAdminTab
        actor={{ memberId: "moderator", role: "moderator" } as any}
        canManageMembers
        managementSnapshot={{
          roles: [{ id: "reviewer", name: "Reviewer", rules: [] }],
          invites: [], members: [], actions: [], scopes: [],
          canManage: true, canManageRoles: false, canManageMembers: true, canManageInvites: true
        }}
        state={{ channels: [], members: {}, presence: {}, guests: {}, publicInvites: [], joinRequests: {} } as any}
        onApproveJoinRequest={vi.fn()}
        onBanMember={vi.fn()}
        onDenyJoinRequest={vi.fn()}
        onDisableInvite={vi.fn()}
        onModerateMember={vi.fn()}
        onRemoveInvite={vi.fn()}
        onUnbanMember={vi.fn()}
        onCreateInvite={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Create invite" })).not.toBeInTheDocument();
  });
});
