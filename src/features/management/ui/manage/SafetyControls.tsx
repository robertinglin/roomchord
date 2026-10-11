import React, { useEffect, useState } from "react";
import type { MemberOption } from "@entities/chat/model/roles";
import type { ActiveRules, MemberModerationStatus, ModerationAuditEntry, ModerationReport } from "matterhorn-sdk/browser";
import { panel, button, field, misc, notice, section } from "@shared/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

type Props = {
  members: MemberOption[];
  channels?: Array<{ id: string; name: string }>;
  canModerate: boolean;
  canReport: boolean;
  onTimeoutMember?: (memberId: string, input: { durationMs?: number; permanent?: boolean; reason?: string }) => Promise<void>;
  onQuarantineMember?: (memberId: string, input: { durationMs?: number; permanent?: boolean; scopeId?: string; reason?: string }) => Promise<void>;
  onSetSlowmode?: (scopeId: string, intervalMs: number, input?: { reason?: string }) => Promise<void>;
  onReportMember?: (memberId: string, reason: string) => Promise<void>;
  onGetStatus?: (memberId: string) => Promise<MemberModerationStatus>;
  onClearTimeout?: (memberId: string, revision: number, reason?: string) => Promise<void>;
  onClearQuarantine?: (memberId: string, revision: number, reason?: string) => Promise<void>;
  onActiveRules?: () => Promise<ActiveRules | undefined>;
  onPublishRules?: (text: string, version: number, required?: boolean, reason?: string) => Promise<void>;
  onAcceptRules?: (version?: number) => Promise<void>;
  onReportInbox?: () => Promise<ModerationReport[]>;
  onResolveReport?: (reportId: string, status: "resolved" | "dismissed", reason?: string) => Promise<void>;
  onAuditQuery?: () => Promise<ModerationAuditEntry[]>;
};

export function SafetyControls({ members, channels = [], canModerate, canReport, onTimeoutMember, onQuarantineMember, onSetSlowmode, onReportMember, onGetStatus, onClearTimeout, onClearQuarantine, onActiveRules, onPublishRules, onAcceptRules, onReportInbox, onResolveReport, onAuditQuery }: Props) {
  const [memberId, setMemberId] = useState(members[0]?.id || "");
  const [duration, setDuration] = useState("60");
  const [reason, setReason] = useState("");
  const [scopeId, setScopeId] = useState(channels[0]?.id || "");
  const [slowmodeSeconds, setSlowmodeSeconds] = useState("0");
  const [reportReason, setReportReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<MemberModerationStatus>();
  const [rules, setRules] = useState<ActiveRules>();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [audit, setAudit] = useState<ModerationAuditEntry[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [rulesText, setRulesText] = useState("");
  const [rulesVersion, setRulesVersion] = useState("");
  const [rulesRequired, setRulesRequired] = useState(true);

  async function refreshReports() {
    if (!onReportInbox || !reportsLoaded) return;
    try { setReports(await onReportInbox()); } catch (value) { setError(value instanceof Error ? value.message : "Unable to load moderation reports."); }
  }

  async function refreshAudit() {
    if (!onAuditQuery || !auditLoaded) return;
    try { setAudit(await onAuditQuery()); } catch (value) { setError(value instanceof Error ? value.message : "Unable to load moderation audit."); }
  }

  async function refreshProjections() {
    await Promise.all([refreshStatus(), refreshRules(), refreshReports(), refreshAudit()]);
  }

  async function run(task: () => Promise<void>, success: string) {
    setError("");
    setMessage("");
    try {
      await task();
      await refreshProjections();
      setMessage(success);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Safety action failed.");
    }
  }

  async function refreshStatus() {
    if (!onGetStatus || !memberId) return;
    try { setStatus(await onGetStatus(memberId)); } catch (value) { setError(value instanceof Error ? value.message : "Unable to load moderation status."); }
  }

  async function refreshRules() {
    if (!onActiveRules) return;
    try { setRules(await onActiveRules()); } catch (value) { setError(value instanceof Error ? value.message : "Unable to load room rules."); }
  }

  useEffect(() => { void refreshStatus(); }, [memberId, onGetStatus]);
  useEffect(() => { void refreshRules(); }, [onActiveRules]);

  if (!members.length || (!canModerate && !canReport)) return null;
  const durationMs = Math.max(1, Number(duration || 0)) * 60 * 1000;

  return (
    <section {...stylex.props(panel.panel)} aria-label="Safety controls">
      <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Safety controls</h3></header>
      <div {...stylex.props(panel.body)}>
        {canModerate && onTimeoutMember && onQuarantineMember ? (
          <>
            <h4 {...stylex.props(section.heading)}>Member access</h4>
            <p {...stylex.props(notice.warning)}>Timeouts and quarantines limit a member’s participation. Record a reason before applying either action.</p>
            <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Member</span><select {...stylex.props(field.input)} value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
            <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Duration (minutes)</span><input {...stylex.props(field.input)} inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
            <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Reason</span><textarea {...stylex.props(field.input)} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Only authorized moderators can view this reason" /></label>
            <div {...stylex.props(button.actions)}>
              <button type="button" {...stylex.props(button.btn, button.secondary)} onClick={() => void run(() => onTimeoutMember(memberId, { durationMs, reason }), "Member timed out.")}>Timeout member</button>
              <button type="button" {...stylex.props(button.btn, button.secondary)} onClick={() => void run(() => onQuarantineMember(memberId, { durationMs, scopeId, reason }), "Member quarantined.")}>Quarantine member</button>
            </div>
            {status?.timeout ? <div><p {...stylex.props(misc.hint)}>Timed out{status.timeout.expiresAt ? ` until ${new Date(status.timeout.expiresAt).toLocaleString()}` : " indefinitely"}.</p>{onClearTimeout ? <button type="button" {...stylex.props(button.btn, button.secondary)} onClick={() => void run(() => onClearTimeout(memberId, status.timeout!.revision, reason), "Timeout cleared.")}>Clear timeout</button> : null}</div> : null}
            {status?.quarantine ? <div><p {...stylex.props(misc.hint)}>Quarantined{status.quarantine.scopeId ? ` in ${status.quarantine.scopeId}` : ""}{status.quarantine.expiresAt ? ` until ${new Date(status.quarantine.expiresAt).toLocaleString()}` : " indefinitely"}.</p>{onClearQuarantine ? <button type="button" {...stylex.props(button.btn, button.secondary)} onClick={() => void run(() => onClearQuarantine(memberId, status.quarantine!.revision, reason), "Quarantine cleared.")}>Clear quarantine</button> : null}</div> : null}
            {channels.length ? <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Channel</span><select {...stylex.props(field.input)} value={scopeId} onChange={(event) => setScopeId(event.target.value)}>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select></label> : null}
            {channels.length && onSetSlowmode ? <form onSubmit={(event) => { event.preventDefault(); void run(() => onSetSlowmode(scopeId, Math.max(0, Number(slowmodeSeconds || 0)) * 1000, { reason }), "Slow mode updated."); }}>
              <h4 {...stylex.props(section.heading)}>Channel pacing</h4>
              <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Slow mode (seconds)</span><input {...stylex.props(field.input)} inputMode="numeric" value={slowmodeSeconds} onChange={(event) => setSlowmodeSeconds(event.target.value)} /></label>
              <button type="submit" {...stylex.props(button.btn, button.secondary)}>Set slow mode</button>
            </form> : null}
          </>
        ) : null}
        {!canModerate && status?.timeout ? <p {...stylex.props(misc.hint)}>You are timed out{status.timeout.expiresAt ? ` until ${new Date(status.timeout.expiresAt).toLocaleString()}` : " indefinitely"}.</p> : null}
        {!canModerate && status?.quarantine ? <p {...stylex.props(misc.hint)}>You are quarantined{status.quarantine.scopeId ? ` in ${status.quarantine.scopeId}` : ""}{status.quarantine.expiresAt ? ` until ${new Date(status.quarantine.expiresAt).toLocaleString()}` : " indefinitely"}.</p> : null}
        {onActiveRules ? <section aria-label="Room rules">
          <h4 {...stylex.props(section.heading)}>Room rules</h4>
          {rules ? <><p {...stylex.props(misc.hint)}>{rules.text}</p><p {...stylex.props(misc.hint)}>{rules.accepted ? "You accepted the current rules." : "You have not accepted the current rules."}</p>{onAcceptRules && !rules.accepted ? <button type="button" {...stylex.props(button.btn, button.secondary)} onClick={() => void run(() => onAcceptRules(rules.version), "Rules accepted.")}>Accept rules</button> : null}</> : <p {...stylex.props(misc.hint)}>No active rules.</p>}
          {canModerate && onPublishRules ? <form onSubmit={(event) => { event.preventDefault(); void run(() => onPublishRules(rulesText, Number(rulesVersion), rulesRequired, reason), "Rules published."); }}>
            <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Rules</span><textarea {...stylex.props(field.input)} rows={3} value={rulesText} onChange={(event) => setRulesText(event.target.value)} /></label>
            <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Version</span><input {...stylex.props(field.input)} inputMode="numeric" value={rulesVersion} onChange={(event) => setRulesVersion(event.target.value)} /></label>
            <label><input type="checkbox" checked={rulesRequired} onChange={(event) => setRulesRequired(event.target.checked)} /> Require acceptance</label>
            <button type="submit" {...stylex.props(button.btn, button.secondary)}>Publish rules</button>
          </form> : null}
        </section> : null}
        {canReport && onReportMember ? <form onSubmit={(event) => { event.preventDefault(); void run(() => onReportMember(memberId, reportReason), "Report submitted privately."); }}>
          <h4 {...stylex.props(section.heading)}>Private report</h4>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Report a member</span><select {...stylex.props(field.input)} value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
          <textarea {...stylex.props(field.input)} rows={2} value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Describe the issue" aria-label="Report reason" />
          <button type="submit" {...stylex.props(button.btn, button.danger)}>Submit private report</button>
        </form> : null}
        {canModerate && onReportInbox ? <section aria-label="Report inbox"><button type="button" {...stylex.props(button.btn, button.secondary)} onClick={() => void run(async () => { setReports(await onReportInbox()); setReportsLoaded(true); }, "Reports loaded.")}>Load report inbox</button>{reports.map((report) => <article key={report.id}><p>{report.reason || "Reason unavailable"}</p><span>{report.status}</span>{onResolveReport && report.status === "open" ? <><button type="button" onClick={() => void run(() => onResolveReport(report.id, "resolved"), "Report resolved.")}>Resolve</button><button type="button" onClick={() => void run(() => onResolveReport(report.id, "dismissed"), "Report dismissed.")}>Dismiss</button></> : null}</article>)}</section> : null}
        {canModerate && onAuditQuery ? <section aria-label="Moderation audit"><button type="button" {...stylex.props(button.btn, button.secondary)} onClick={() => void run(async () => { setAudit(await onAuditQuery()); setAuditLoaded(true); }, "Audit loaded.")}>Load moderation audit</button>{audit.map((entry) => <p key={`${entry.sequence}-${entry.operationId}`} {...stylex.props(misc.hint)}>{entry.action}: {entry.reason || "No reason"}</p>)}</section> : null}
        {message ? <p role="status" {...stylex.props(misc.hint)}>{message}</p> : null}
        {error ? <p role="alert" {...stylex.props(misc.hint)}>{error}</p> : null}
        <p {...stylex.props(misc.hint)}>Automated moderation follows this room&apos;s notification settings.</p>
      </div>
    </section>
  );
}
