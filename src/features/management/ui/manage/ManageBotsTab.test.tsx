import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { botStatus, ManageBotsTab } from "./ManageBotsTab";

describe("ManageBotsTab", () => {
  it("creates a bot-bound invite and manages authoritative bot devices", async () => {
    const onCreateInvite = vi.fn(async (principal) => ({
      id: "invite-bot",
      roleId: "member",
      status: "active",
      createdAt: 1,
      principal: { kind: "bot" as const, ...principal },
      url: "https://launcher.test/invite-bot"
    }));
    const onRotate = vi.fn(async () => ({ id: "rotate", roleId: "member", status: "active", createdAt: 2, url: "https://launcher.test/rotate" }));
    const onRemove = vi.fn(async () => undefined);
    const onSetChannelAccess = vi.fn(async () => undefined);
    render(<ManageBotsTab
      managementSnapshot={{
        roles: [], invites: [], actions: [], scopes: [], canManage: true, canManageRoles: true, canManageMembers: true, canManageInvites: true, updatedAt: 1,
        members: [{ memberId: "bot-member", roleIds: ["member"], status: "active", kind: "bot", serviceId: "mosh.summary", serviceDisplayName: "Summary", devices: [{ deviceId: "bot-device", credentialFingerprint: "sha256:abc" }] }]
      }}
      channels={[{ id: "general", name: "general" }, { id: "private", name: "private" }]}
      healthByMemberId={{ "bot-member": { state: "ready", model: "ready", status: "online" } }}
      onCreateInvite={onCreateInvite}
      onRemove={onRemove}
      onRotate={onRotate}
      onSetChannelAccess={onSetChannelAccess}
    />);
    expect(screen.getByText(/online · model ready/)).toBeInTheDocument();
    expect(screen.getByText(/Device bot-device: sha256:abc/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Service ID"), { target: { value: "mosh.new" } });
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "New Bot" } });
    fireEvent.click(screen.getByRole("button", { name: "Create bot invite" }));
    await waitFor(() => expect(onCreateInvite).toHaveBeenCalledWith({ serviceId: "mosh.new", displayName: "New Bot" }));
    expect(screen.getByLabelText("Bot invite URL")).toHaveValue("https://launcher.test/invite-bot");
    fireEvent.click(screen.getByRole("button", { name: "Rotate device" }));
    await waitFor(() => expect(onRotate).toHaveBeenCalledWith("bot-member", "bot-device"));
    expect(screen.getByLabelText("Rotation invite URL")).toHaveValue("https://launcher.test/rotate");
    fireEvent.click(screen.getByLabelText("#general"));
    fireEvent.click(screen.getByRole("button", { name: "Save channel access" }));
    await waitFor(() => expect(onSetChannelAccess).toHaveBeenCalledWith("bot-member", ["general"]));
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("bot-member"));
  });

  it("reports authoritative lifecycle and service health states", () => {
    expect(botStatus("removed", { state: "ready" })).toBe("revoked");
    expect(botStatus("active", { state: "ready", queueSaturated: true })).toBe("degraded");
    expect(botStatus("active", { state: "ready", status: "online" })).toBe("online");
    expect(botStatus("active", undefined)).toBe("offline");
  });
});
