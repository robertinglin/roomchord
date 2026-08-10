import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageAdminTab } from "./ManageAdminTab";
import { ManageMembersTab } from "./ManageMembersTab";
import { ManageOverviewDialog } from "../ManageOverviewDialog";

const actor = { memberId: "mina", role: "admin", name: "Mina" } as never;
const state = {
  channels: [{ id: "general", name: "General", archivedAt: null }],
  members: {},
  presence: {},
  guests: {},
  publicInvites: [],
  joinRequests: {},
  roleDefinitions: {}
} as never;

const noop = vi.fn();

describe("management safety integration", () => {
  it("passes moderator safety callbacks into the admin surface", () => {
    render(<ManageAdminTab
      actor={actor}
      canManageMembers
      state={state}
      onApproveJoinRequest={noop}
      onBanMember={noop}
      onDenyJoinRequest={noop}
      onDisableInvite={noop}
      onModerateMember={noop}
      onRemoveInvite={noop}
      onUnbanMember={noop}
      canModerateSafety
      onTimeoutMember={vi.fn(async () => undefined)}
      onQuarantineMember={vi.fn(async () => undefined)}
      onSetSlowmode={vi.fn(async () => undefined)}
      onActiveAutoMod={vi.fn(async () => undefined)}
      onEvaluateAutoMod={vi.fn(async () => ({ ok: true, action: "allow" as const, policyVersion: 0 }))}
    />);
    expect(screen.getByRole("region", { name: "Safety controls" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Timeout member" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set slow mode" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Automated moderation" })).toBeInTheDocument();
  });

  it("renders private reporting in a member-only profile surface", () => {
    render(<ManageMembersTab
      canManageRoles={false}
      initialMemberId="mina"
      members={[{ id: "mina", name: "Mina", roleIds: [], status: "online" }]}
      profileOnly
      roles={[]}
      onAssignMemberRoles={vi.fn(async () => undefined)}
      onSetMemberBlock={noop}
      onSetMemberIgnore={noop}
      onSetMemberNickname={noop}
      onSetMemberNote={noop}
      canReport
      onReportMember={vi.fn(async () => undefined)}
    />);
    expect(screen.getByRole("region", { name: "Safety controls" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit private report" })).toBeInTheDocument();
  });

  it("shows the authoritative bot marker in member profiles", () => {
    render(<ManageMembersTab
      canManageRoles={false}
      initialMemberId="helper"
      members={[{ id: "helper", name: "Helper", kind: "bot", roleIds: ["member"], status: "online" }]}
      profileOnly
      roles={[]}
      onAssignMemberRoles={vi.fn(async () => undefined)}
      onSetMemberBlock={noop}
      onSetMemberIgnore={noop}
      onSetMemberNickname={noop}
      onSetMemberNote={noop}
    />);
    expect(screen.getByRole("heading", { name: /Profile for Helper/ })).toContainElement(screen.getByLabelText("Bot account"));
  });

  it("forwards safety capabilities and handlers through the management dialog", () => {
    render(<ManageOverviewDialog
      actor={actor}
      state={state}
      roomName="Mosh"
      canCreateChannels={false}
      canManageRooms={false}
      canManageRoles={false}
      canManageMembers
      initialTab="admin"
      memberPreferences={{}}
      voicePreferences={{} as never}
      onClose={noop}
      onCreateChannel={noop}
      onUpdateChannel={noop}
      onArchiveChannel={noop}
      onCreateRoom={noop}
      onUpdateRoom={noop}
      onArchiveRoom={noop}
      onCreateRole={noop}
      onUpdateRole={noop}
      onArchiveRole={noop}
      onAssignMemberRoles={vi.fn(async () => undefined)}
      onApproveJoinRequest={noop}
      onBanMember={noop}
      onDenyJoinRequest={noop}
      onDisableInvite={noop}
      onModerateMember={noop}
      onRemoveInvite={noop}
      onSetMemberBlock={noop}
      onSetMemberIgnore={noop}
      onSetMemberNickname={noop}
      onSetMemberNote={noop}
      onUnbanMember={noop}
      onUpdateVoicePreferences={noop}
      canModerateSafety
      onTimeoutMember={vi.fn(async () => undefined)}
      onQuarantineMember={vi.fn(async () => undefined)}
      onSetSlowmode={vi.fn(async () => undefined)}
    />);
    expect(screen.getByRole("region", { name: "Safety controls" })).toBeInTheDocument();
  });
});
