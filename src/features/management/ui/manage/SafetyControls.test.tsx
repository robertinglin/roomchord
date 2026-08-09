import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SafetyControls } from "./SafetyControls";

const members = [{ id: "mina", name: "Mina", roleIds: [], status: "online" }];

describe("SafetyControls", () => {
  it("submits a private report without rendering moderation controls", async () => {
    const user = userEvent.setup();
    const onReportMember = vi.fn(async () => undefined);
    render(<SafetyControls members={members} canModerate={false} canReport onReportMember={onReportMember} />);
    await user.type(screen.getByRole("textbox", { name: "Report reason" }), "Needs review");
    fireEvent.submit(screen.getByRole("textbox", { name: "Report reason" }).closest("form")!);
    expect(onReportMember).toHaveBeenCalledWith("mina", "Needs review");
    expect(screen.queryByRole("button", { name: "Timeout member" })).not.toBeInTheDocument();
  });

  it("exposes moderator actions and surfaces failures", async () => {
    const user = userEvent.setup();
    const onTimeoutMember = vi.fn(async () => { throw new Error("stale revision"); });
    const onQuarantineMember = vi.fn(async () => undefined);
    const onSetSlowmode = vi.fn(async () => undefined);
    render(<SafetyControls members={members} channels={[{ id: "general", name: "General" }]} canModerate canReport={false} onTimeoutMember={onTimeoutMember} onQuarantineMember={onQuarantineMember} onSetSlowmode={onSetSlowmode} />);
    await user.type(screen.getByPlaceholderText("Only authorized moderators can view this reason"), "policy");
    await user.selectOptions(screen.getByRole("combobox", { name: "Channel" }), "general");
    await user.click(screen.getByRole("button", { name: "Timeout member" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("stale revision");
    expect(screen.getByRole("button", { name: "Quarantine member" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Set slow mode" }));
    expect(onSetSlowmode).toHaveBeenCalledWith("general", 0, expect.anything());
  });

  it("keeps member moderation available when no active channel is projected", () => {
    render(<SafetyControls members={members} canModerate canReport={false} onTimeoutMember={vi.fn(async () => undefined)} onQuarantineMember={vi.fn(async () => undefined)} />);
    expect(screen.getByRole("button", { name: "Timeout member" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set slow mode" })).not.toBeInTheDocument();
  });

  it("reports successful quarantine and handles an empty member projection", async () => {
    const user = userEvent.setup();
    const onQuarantineMember = vi.fn(async () => undefined);
    const { rerender } = render(<SafetyControls members={members} channels={[{ id: "general", name: "General" }]} canModerate canReport={false} onTimeoutMember={vi.fn(async () => undefined)} onQuarantineMember={onQuarantineMember} />);
    await user.click(screen.getByRole("button", { name: "Quarantine member" }));
    expect(await screen.findByRole("status")).toHaveTextContent("quarantined");
    expect(onQuarantineMember).toHaveBeenCalledWith("mina", expect.objectContaining({ scopeId: "general" }));
    rerender(<SafetyControls members={[]} canModerate={false} canReport onReportMember={vi.fn(async () => undefined)} />);
    expect(screen.queryByRole("region", { name: "Safety controls" })).not.toBeInTheDocument();
  });

  it("renders the residual capability note when only reporting is available", () => {
    render(<SafetyControls members={members} canModerate={false} canReport />);
    expect(screen.getByText(/Automated moderation follows this room's notification settings/)).toBeInTheDocument();
  });

  it("renders controller status, rules, private inbox, and audit actions", async () => {
    const user = userEvent.setup();
    const onGetStatus = vi.fn(async () => ({ memberId: "mina", revision: 7, timeout: { active: true, expiresAt: null, revision: 6 }, quarantine: { active: true, expiresAt: 1000, revision: 5, scopeId: "general" }, slowmode: [] }));
    const onActiveRules = vi.fn(async () => ({ version: 2, required: true, text: "Be kind", accepted: false }));
    const onReportInbox = vi.fn(async () => [{ id: "report-1", reporterMemberId: "lee", targetMemberId: "mina", references: [], reason: "Spam", status: "open" as const, createdAt: 1 }]);
    const onAuditQuery = vi.fn(async () => [{ sequence: 1, operationId: "op-1", action: "member.report", actorMemberId: "lee", reason: "Spam", createdAt: 1 }]);
    render(<SafetyControls
      members={members}
      channels={[{ id: "general", name: "General" }]}
      canModerate
      canReport
      onTimeoutMember={vi.fn(async () => undefined)}
      onQuarantineMember={vi.fn(async () => undefined)}
      onGetStatus={onGetStatus}
      onClearTimeout={vi.fn(async () => undefined)}
      onClearQuarantine={vi.fn(async () => undefined)}
      onActiveRules={onActiveRules}
      onAcceptRules={vi.fn(async () => undefined)}
      onPublishRules={vi.fn(async () => undefined)}
      onReportMember={vi.fn(async () => undefined)}
      onReportInbox={onReportInbox}
      onResolveReport={vi.fn(async () => undefined)}
      onAuditQuery={onAuditQuery}
    />);
    expect(await screen.findByText("Timed out indefinitely.")).toBeInTheDocument();
    expect(screen.queryByText("You accepted the current rules.")).not.toBeInTheDocument();
    const initialStatusCalls = onGetStatus.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Clear timeout" }));
    await waitFor(() => expect(onGetStatus.mock.calls.length).toBeGreaterThan(initialStatusCalls));
    await user.click(screen.getByRole("button", { name: "Clear quarantine" }));
    await user.click(screen.getByRole("button", { name: "Accept rules" }));
    await user.type(screen.getByLabelText("Rules"), "Be kind to everyone");
    await user.type(screen.getByLabelText("Version"), "3");
    await user.click(screen.getByRole("button", { name: "Publish rules" }));
    await user.click(screen.getByRole("button", { name: "Load report inbox" }));
    expect(await screen.findByText("Spam")).toBeInTheDocument();
    const loadedReportCalls = onReportInbox.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(onReportInbox.mock.calls.length).toBeGreaterThan(loadedReportCalls));
    await user.click(screen.getByRole("button", { name: "Load moderation audit" }));
    expect(await screen.findByText("member.report: Spam")).toBeInTheDocument();
    const loadedAuditCalls = onAuditQuery.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Accept rules" }));
    await waitFor(() => expect(onAuditQuery.mock.calls.length).toBeGreaterThan(loadedAuditCalls));
    expect(onGetStatus).toHaveBeenCalled();
    expect(onActiveRules).toHaveBeenCalled();
    expect(onReportInbox).toHaveBeenCalled();
    expect(onAuditQuery).toHaveBeenCalled();
  });

  it("surfaces projection refresh failures after a moderation mutation", async () => {
    const user = userEvent.setup();
    let reportLoads = 0;
    let auditLoads = 0;
    const onReportInbox = vi.fn(async () => { reportLoads += 1; if (reportLoads > 1) throw new Error("reports unavailable"); return []; });
    const onAuditQuery = vi.fn(async () => { auditLoads += 1; if (auditLoads > 1) throw new Error("audit unavailable"); return []; });
    const onGetStatus = vi.fn(async () => ({ memberId: "mina", revision: 1, slowmode: [] }));
    render(<SafetyControls
      members={members}
      canModerate
      canReport={false}
      onTimeoutMember={vi.fn(async () => undefined)}
      onQuarantineMember={vi.fn(async () => undefined)}
      onGetStatus={onGetStatus}
      onActiveRules={vi.fn(async () => undefined)}
      onReportInbox={onReportInbox}
      onAuditQuery={onAuditQuery}
    />);
    await user.click(screen.getByRole("button", { name: "Load report inbox" }));
    await user.click(screen.getByRole("button", { name: "Load moderation audit" }));
    await user.click(screen.getByRole("button", { name: "Timeout member" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/reports unavailable|audit unavailable/);
    expect(onReportInbox.mock.calls.length).toBeGreaterThan(1);
    expect(onAuditQuery.mock.calls.length).toBeGreaterThan(1);
  });
});
