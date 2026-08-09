import { describe, expect, it, vi } from "vitest";
import { safetyActions } from "./safetyActions";

function setup(can = true) {
  const moderation = {
    getStatus: vi.fn(async (memberId?: string) => ({ memberId: memberId || "mina", revision: 3, slowmode: [] })),
    timeout: vi.fn().mockResolvedValue(undefined),
    clearTimeout: vi.fn().mockResolvedValue(undefined),
    quarantine: vi.fn().mockResolvedValue(undefined),
    clearQuarantine: vi.fn().mockResolvedValue(undefined),
    setSlowmode: vi.fn().mockResolvedValue(undefined),
    rules: { active: vi.fn(async () => ({ version: 1, required: true, text: "Be kind", accepted: false })), publish: vi.fn().mockResolvedValue(undefined), accept: vi.fn().mockResolvedValue(undefined) },
    reports: { submit: vi.fn().mockResolvedValue(undefined), inbox: vi.fn(async () => []), resolve: vi.fn().mockResolvedValue(undefined) },
    audit: { query: vi.fn(async () => []) },
    automod: {
      active: vi.fn(async () => ({ version: 1, enabled: true, rules: [] })),
      publish: vi.fn().mockResolvedValue(undefined),
      override: vi.fn().mockResolvedValue(undefined),
      redact: vi.fn().mockResolvedValue(undefined),
      quarantine: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn(async () => ({ ok: false, action: "block" as const, policyVersion: 1, ruleId: "rule-1" }))
    }
  };
  const live = {
    can: vi.fn(() => can),
    actor: { memberId: "mina" },
    moderation
  };
  return { moderation, live, handlers: safetyActions({ live } as never) };
}

describe("Matterhorn moderation safety actions", () => {
  it("uses the public controller for timeout, quarantine, and slow mode", async () => {
    const { moderation, handlers } = setup();
    await handlers.timeoutMember("member-1", { durationMs: 60000, reason: "spam" });
    await handlers.quarantineMember("member-1", { permanent: true, scopeId: "room", reason: "abuse" });
    await handlers.setChannelSlowmode("general", 5000, { reason: "busy" });

    expect(moderation.timeout).toHaveBeenCalledWith({ memberId: "member-1", durationMs: 60000, reason: "spam" });
    expect(moderation.quarantine).toHaveBeenCalledWith({ memberId: "member-1", permanent: true, scopeId: "room", reason: "abuse" });
    expect(moderation.setSlowmode).toHaveBeenCalledWith({ scopeId: "general", intervalMs: 5000, revision: undefined, reason: "busy" });
  });

  it("uses controller status, clear, rules, report, and audit APIs", async () => {
    const { moderation, handlers } = setup();
    await handlers.getMemberModerationStatus();
    await handlers.clearMemberTimeout("member-1", 4, "done");
    await handlers.clearMemberQuarantine("member-1", 5);
    await handlers.activeRules();
    await handlers.publishRules("Be kind", 2, true, "update");
    await handlers.acceptRules(2);
    await handlers.reportMember("member-2", "unsafe", { references: ["event-1"] });
    await handlers.moderationReportInbox();
    await handlers.resolveMemberReport("report-1", "dismissed", "handled");
    await handlers.moderationAudit({ limit: 10 });
    expect(moderation.getStatus).toHaveBeenCalledWith(undefined);
    expect(moderation.clearTimeout).toHaveBeenCalledWith({ memberId: "member-1", revision: 4, reason: "done" });
    expect(moderation.clearQuarantine).toHaveBeenCalledWith({ memberId: "member-1", revision: 5, reason: undefined });
    expect(moderation.rules.publish).toHaveBeenCalledWith({ text: "Be kind", version: 2, required: true, reason: "update" });
    expect(moderation.reports.submit).toHaveBeenCalledWith({ targetMemberId: "member-2", reason: "unsafe", references: ["event-1"] });
    expect(moderation.reports.resolve).toHaveBeenCalledWith({ reportId: "report-1", status: "dismissed", reason: "handled" });
    expect(moderation.audit.query).toHaveBeenCalledWith({ limit: 10 });
  });

  it("fails closed when the room does not advertise a capability", async () => {
    const { moderation, handlers } = setup(false);
    await expect(handlers.timeoutMember("member-1")).rejects.toThrow("permission");
    expect(moderation.timeout).not.toHaveBeenCalled();
  });

  it("uses the public AutoMod controller for policy, evaluation, and overrides", async () => {
    const { moderation, handlers } = setup();
    const policy = { version: 2, enabled: true, rules: [{ id: "rule-1", action: "block" as const, terms: ["spam"] }] };
    await handlers.activeAutoMod();
    await handlers.publishAutoMod(policy);
    await handlers.evaluateAutoMod({ body: "spam" });
    await handlers.overrideAutoMod({ messageId: "message-1", action: "allow", policyVersion: 2, revision: 3, reason: "reviewed" });
    await handlers.redactAutoMod({ messageId: "message-1", policyVersion: 2, revision: 3 });
    await handlers.quarantineAutoMod({ messageId: "message-1", policyVersion: 2, revision: 3, scopeId: "general" });
    expect(moderation.automod.active).toHaveBeenCalled();
    expect(moderation.automod.publish).toHaveBeenCalledWith(policy);
    expect(moderation.automod.evaluate).toHaveBeenCalledWith({ body: "spam" });
    expect(moderation.automod.override).toHaveBeenCalledWith(expect.objectContaining({ action: "allow", messageId: "message-1" }));
    expect(moderation.automod.redact).toHaveBeenCalledWith(expect.objectContaining({ messageId: "message-1" }));
    expect(moderation.automod.quarantine).toHaveBeenCalledWith(expect.objectContaining({ scopeId: "general" }));
  });
});
