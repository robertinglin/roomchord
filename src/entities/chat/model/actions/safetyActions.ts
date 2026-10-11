import type { Room } from "matterhorn-sdk/client";
import type {
  ActiveRules,
  AutoModDecision,
  AutoModOverrideInput,
  AutoModPolicy,
  MemberModerationStatus,
  ModerationAuditEntry,
  ModerationAuditQuery,
  ModerationReport
} from "matterhorn-sdk/browser";
import type { Mosh } from "../../../../../types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

type ModerationReason = { reason?: string };

function requireCapability(live: Room<Mosh>, action: keyof Mosh.Actions) {
  if (!live.can(action)) throw new Error(`You do not have permission to perform ${String(action)}.`);
}

export function safetyActions(input: ChatActionHandlersInput) {
  const { live } = input;

  async function timeoutMember(memberId: string, options: { durationMs?: number; permanent?: boolean; reason?: string; revision?: number } = {}) {
    requireCapability(live, "memberTimeout");
    await live.moderation.timeout({ memberId, ...options });
  }

  async function clearMemberTimeout(memberId: string, revision: number, reason?: string) {
    requireCapability(live, "memberTimeout");
    await live.moderation.clearTimeout({ memberId, revision, reason });
  }

  async function quarantineMember(memberId: string, options: { durationMs?: number; permanent?: boolean; scopeId?: string; reason?: string; revision?: number } = {}) {
    requireCapability(live, "memberQuarantine");
    await live.moderation.quarantine({ memberId, ...options });
  }

  async function clearMemberQuarantine(memberId: string, revision: number, reason?: string) {
    requireCapability(live, "memberQuarantine");
    await live.moderation.clearQuarantine({ memberId, revision, reason });
  }

  async function setChannelSlowmode(scopeId: string, intervalMs: number, options: ModerationReason & { revision?: number } = {}) {
    requireCapability(live, "channelSlowmode");
    await live.moderation.setSlowmode({ scopeId, intervalMs, revision: options.revision, reason: options.reason });
  }

  async function getMemberModerationStatus(memberId?: string): Promise<MemberModerationStatus> {
    if (memberId && memberId !== live.actor.memberId) requireCapability(live, "memberTimeout");
    return live.moderation.getStatus(memberId);
  }

  async function activeRules(): Promise<ActiveRules | undefined> {
    return live.moderation.rules.active();
  }

  async function publishRules(text: string, version: number, required = true, reason?: string) {
    requireCapability(live, "memberTimeout");
    await live.moderation.rules.publish({ text, version, required, reason });
  }

  async function acceptRules(version?: number) {
    await live.moderation.rules.accept(version);
  }

  async function reportMember(targetMemberId: string, reason: string, options: { scopeId?: string; references?: string[] } = {}) {
    await live.moderation.reports.submit({ targetMemberId, reason, ...options });
  }

  async function moderationReportInbox(): Promise<ModerationReport[]> {
    requireCapability(live, "memberTimeout");
    return live.moderation.reports.inbox();
  }

  async function resolveMemberReport(reportId: string, status: "resolved" | "dismissed", reason?: string) {
    requireCapability(live, "memberTimeout");
    await live.moderation.reports.resolve({ reportId, status, reason });
  }

  async function moderationAudit(query?: ModerationAuditQuery): Promise<ModerationAuditEntry[]> {
    requireCapability(live, "memberTimeout");
    return live.moderation.audit.query(query);
  }

  async function activeAutoMod(): Promise<AutoModPolicy | undefined> {
    requireCapability(live, "memberTimeout");
    return live.moderation.automod.active();
  }

  async function publishAutoMod(input: AutoModPolicy & { reason?: string }) {
    requireCapability(live, "memberTimeout");
    await live.moderation.automod.publish(input);
  }

  async function overrideAutoMod(input: AutoModOverrideInput) {
    requireCapability(live, "memberTimeout");
    await live.moderation.automod.override(input);
  }

  async function redactAutoMod(input: Omit<AutoModOverrideInput, "action">) {
    requireCapability(live, "memberTimeout");
    await live.moderation.automod.redact(input);
  }

  async function quarantineAutoMod(input: Omit<AutoModOverrideInput, "action">) {
    requireCapability(live, "memberTimeout");
    await live.moderation.automod.quarantine(input);
  }

  async function evaluateAutoMod(input: { body: string; scopeId?: string }): Promise<AutoModDecision> {
    return live.moderation.automod.evaluate(input);
  }

  return {
    acceptRules,
    activeAutoMod,
    activeRules,
    clearMemberQuarantine,
    clearMemberTimeout,
    getMemberModerationStatus,
    moderationAudit,
    moderationReportInbox,
    publishAutoMod,
    publishRules,
    quarantineMember,
    reportMember,
    resolveMemberReport,
    overrideAutoMod,
    redactAutoMod,
    quarantineAutoMod,
    evaluateAutoMod,
    setChannelSlowmode,
    timeoutMember
  };
}
