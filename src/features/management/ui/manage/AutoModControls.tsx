import React, { useEffect, useState } from "react";
import type {
  MatterhornAutoModDecision,
  MatterhornAutoModOverrideInput,
  MatterhornAutoModPolicy,
  MatterhornAutoModRule
} from "matterhorn-sdk/browser";
import { button, field, misc, notice, panel, section } from "@shared/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

type Props = {
  canModerate: boolean;
  onActive?: () => Promise<MatterhornAutoModPolicy | undefined>;
  onPublish?: (input: MatterhornAutoModPolicy & { reason?: string }) => Promise<void>;
  onOverride?: (input: MatterhornAutoModOverrideInput) => Promise<void>;
  onRedact?: (input: Omit<MatterhornAutoModOverrideInput, "action">) => Promise<void>;
  onQuarantine?: (input: Omit<MatterhornAutoModOverrideInput, "action">) => Promise<void>;
  onEvaluate?: (input: { body: string; scopeId?: string }) => Promise<MatterhornAutoModDecision>;
};

function policyRuleFromForm(id: string, action: MatterhornAutoModRule["action"], match: NonNullable<MatterhornAutoModRule["match"]>, terms: string, scopeId: string, durationMs: string): MatterhornAutoModRule {
  const rule: MatterhornAutoModRule = { id: id.trim() || "mosh-rule", action, match, terms: terms.split("\n").map((term) => term.trim()).filter(Boolean) };
  if (scopeId.trim()) rule.scopeId = scopeId.trim();
  const duration = Number(durationMs);
  if (Number.isFinite(duration) && duration > 0) rule.durationMs = duration * 1000;
  return rule;
}

export function AutoModControls({ canModerate, onActive, onPublish, onOverride, onRedact, onQuarantine, onEvaluate }: Props) {
  const [policy, setPolicy] = useState<MatterhornAutoModPolicy>();
  const [ruleId, setRuleId] = useState("mosh-rule");
  const [ruleAction, setRuleAction] = useState<MatterhornAutoModRule["action"]>("block");
  const [ruleMatch, setRuleMatch] = useState<NonNullable<MatterhornAutoModRule["match"]>>("contains");
  const [ruleTerms, setRuleTerms] = useState("");
  const [ruleScope, setRuleScope] = useState("");
  const [ruleDuration, setRuleDuration] = useState("");
  const [policyVersion, setPolicyVersion] = useState("1");
  const [policyEnabled, setPolicyEnabled] = useState(true);
  const [messageId, setMessageId] = useState("");
  const [overridePolicyVersion, setOverridePolicyVersion] = useState("1");
  const [overrideRevision, setOverrideRevision] = useState("1");
  const [overrideScope, setOverrideScope] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [evaluationBody, setEvaluationBody] = useState("");
  const [evaluationScope, setEvaluationScope] = useState("");
  const [decision, setDecision] = useState<MatterhornAutoModDecision>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    if (!onActive) return;
    try {
      const next = await onActive();
      setPolicy(next);
      if (next) {
        setPolicyVersion(String(next.version));
        setPolicyEnabled(next.enabled);
        const first = next.rules[0];
        if (first) {
          setRuleId(first.id);
          setRuleAction(first.action);
          setRuleMatch(first.match || "contains");
          setRuleTerms(first.terms.join("\n"));
          setRuleScope(first.scopeId || "");
          setRuleDuration(first.durationMs ? String(first.durationMs / 1000) : "");
        }
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load AutoMod policy.");
    }
  }

  useEffect(() => { void refresh(); }, [onActive]);

  async function run(task: () => Promise<void>, success: string) {
    setError("");
    setMessage("");
    try {
      await task();
      setMessage(success);
    } catch (value) {
      setError(value instanceof Error ? value.message : "AutoMod action failed.");
    }
  }

  function overrideInput(): Omit<MatterhornAutoModOverrideInput, "action"> {
    return {
      messageId: messageId.trim(),
      policyVersion: Math.max(1, Number(overridePolicyVersion || 0)),
      revision: Math.max(1, Number(overrideRevision || 0)),
      ...(overrideScope.trim() ? { scopeId: overrideScope.trim() } : {}),
      ...(overrideReason.trim() ? { reason: overrideReason.trim() } : {})
    };
  }

  if (!canModerate || (!onActive && !onPublish && !onEvaluate)) return null;

  return (
    <section {...stylex.props(panel.panel)} aria-label="Automated moderation">
      <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Automated moderation</h3></header>
      <div {...stylex.props(panel.body)}>
        <p {...stylex.props(notice.info)}>Start in monitor mode with a narrow rule. Policy changes affect every matching message in this room.</p>
        {policy ? <div aria-label="Active AutoMod policy"><p {...stylex.props(misc.hint)}>Version {policy.version} · {policy.enabled ? "Enabled" : "Disabled"} · {policy.rules.length} rule{policy.rules.length === 1 ? "" : "s"}</p>{policy.rules.map((rule) => <p key={rule.id} {...stylex.props(misc.hint)}>{rule.action} when {rule.match || "contains"}: {rule.terms.join(", ")}</p>)}</div> : <p {...stylex.props(misc.hint)}>No AutoMod policy is active.</p>}
        {onPublish ? <form onSubmit={(event) => { event.preventDefault(); const rule = policyRuleFromForm(ruleId, ruleAction, ruleMatch, ruleTerms, ruleScope, ruleDuration); if (!rule.terms.length) { setError("Add at least one term to publish this rule."); return; } void run(async () => { const rules = (policy?.rules || []).filter((value) => value.id !== rule.id); await onPublish({ version: Math.max(1, Number(policyVersion || 0)), enabled: policyEnabled, rules: [...rules, rule] }); await refresh(); }, "AutoMod policy published."); }}>
          <h4 {...stylex.props(section.heading)}>Policy</h4>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Version</span><input {...stylex.props(field.input)} inputMode="numeric" value={policyVersion} onChange={(event) => setPolicyVersion(event.target.value)} /></label>
          <label><input type="checkbox" checked={policyEnabled} onChange={(event) => setPolicyEnabled(event.target.checked)} /> Enable automated moderation</label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Rule name</span><input {...stylex.props(field.input)} value={ruleId} onChange={(event) => setRuleId(event.target.value)} /></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Action</span><select {...stylex.props(field.input)} value={ruleAction} onChange={(event) => setRuleAction(event.target.value as MatterhornAutoModRule["action"])}><option value="block">Block</option><option value="redact">Redact</option><option value="quarantine">Quarantine</option></select></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Match</span><select {...stylex.props(field.input)} value={ruleMatch} onChange={(event) => setRuleMatch(event.target.value as NonNullable<MatterhornAutoModRule["match"]>)}><option value="contains">Contains</option><option value="exact">Exactly matches</option></select></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Terms (one per line)</span><textarea {...stylex.props(field.input)} rows={3} value={ruleTerms} onChange={(event) => setRuleTerms(event.target.value)} /></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Channel scope (optional)</span><input {...stylex.props(field.input)} value={ruleScope} onChange={(event) => setRuleScope(event.target.value)} /></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Quarantine duration (seconds, optional)</span><input {...stylex.props(field.input)} inputMode="numeric" value={ruleDuration} onChange={(event) => setRuleDuration(event.target.value)} /></label>
          <button type="submit" {...stylex.props(button.btn, button.secondary)}>Publish AutoMod policy</button>
        </form> : null}
        {onEvaluate ? <form onSubmit={(event) => { event.preventDefault(); void run(async () => setDecision(await onEvaluate({ body: evaluationBody, ...(evaluationScope.trim() ? { scopeId: evaluationScope.trim() } : {}) })), "Message evaluated."); }}>
          <h4 {...stylex.props(section.heading)}>Check a message</h4>
          <textarea aria-label="Message to check" {...stylex.props(field.input)} rows={2} value={evaluationBody} onChange={(event) => setEvaluationBody(event.target.value)} placeholder="Paste a message to check" />
          <input aria-label="Evaluation channel" {...stylex.props(field.input)} value={evaluationScope} onChange={(event) => setEvaluationScope(event.target.value)} placeholder="Channel scope (optional)" />
          <button type="submit" {...stylex.props(button.btn, button.secondary)}>Evaluate message</button>
          {decision ? <p role="status" {...stylex.props(misc.hint)}>Result: {decision.action}{decision.ruleId ? ` (${decision.ruleId})` : ""}.</p> : null}
        </form> : null}
        {onOverride && onRedact && onQuarantine ? <form onSubmit={(event) => { event.preventDefault(); void run(() => onOverride({ ...overrideInput(), action: "allow" }), "AutoMod override applied."); }}>
          <h4 {...stylex.props(section.heading)}>Review a flagged message</h4>
          <p {...stylex.props(notice.warning)}>Redaction and quarantine are immediate actions. Verify the message reference and reason first.</p>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Message reference</span><input {...stylex.props(field.input)} value={messageId} onChange={(event) => setMessageId(event.target.value)} /></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Policy version</span><input {...stylex.props(field.input)} inputMode="numeric" value={overridePolicyVersion} onChange={(event) => setOverridePolicyVersion(event.target.value)} /></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Revision</span><input {...stylex.props(field.input)} inputMode="numeric" value={overrideRevision} onChange={(event) => setOverrideRevision(event.target.value)} /></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Channel scope (optional)</span><input {...stylex.props(field.input)} value={overrideScope} onChange={(event) => setOverrideScope(event.target.value)} /></label>
          <label {...stylex.props(field.field)}><span {...stylex.props(field.label)}>Reason</span><textarea {...stylex.props(field.input)} rows={2} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Only authorized moderators can view this reason" /></label>
          <div {...stylex.props(button.actions)}><button type="submit" {...stylex.props(button.btn, button.secondary)}>Allow message</button><button type="button" {...stylex.props(button.btn, button.secondary)} onClick={() => void run(() => onRedact(overrideInput()), "Message redacted.")}>Redact message</button><button type="button" {...stylex.props(button.btn, button.danger)} onClick={() => void run(() => onQuarantine(overrideInput()), "Message quarantined.")}>Quarantine message</button></div>
        </form> : null}
        {message ? <p role="status" {...stylex.props(misc.hint)}>{message}</p> : null}
        {error ? <p role="alert" {...stylex.props(misc.hint)}>{error}</p> : null}
      </div>
    </section>
  );
}
