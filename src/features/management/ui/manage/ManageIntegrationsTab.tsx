import React, { useEffect, useMemo, useState } from "react";
import type {
  MatterhornIntegrationCapability,
  MatterhornIntegrationCommand,
  MatterhornIntegrationController,
  MatterhornIntegrationInstallation,
  MatterhornWebhookModeratorPolicy,
  MatterhornWebhookRateLimit
} from "matterhorn-sdk/browser";
import { button, layout, misc, panel, row } from "@shared/ui/manage.styles";
import { integrationCapabilityGroups, integrationCapabilityInfo } from "@shared/model/integrationCapabilities";
import * as stylex from "@stylexjs/stylex";

const DEFAULT_CAPABILITIES = "events.ingress, events.egress, secrets.write, commands.register, commands.invoke, commands.result, webhooks.receive, webhooks.manage";

function parseCapabilities(value: string): MatterhornIntegrationCapability[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function rateLimit(maxRequests: string, windowMs: string, burst: string): MatterhornWebhookRateLimit {
  const parsed = { maxRequests: Number(maxRequests), windowMs: Number(windowMs), burst: Number(burst) };
  if (!Number.isSafeInteger(parsed.maxRequests) || parsed.maxRequests < 1
    || !Number.isSafeInteger(parsed.windowMs) || parsed.windowMs < 1
    || !Number.isSafeInteger(parsed.burst) || parsed.burst < 1) {
    throw new Error("Webhook rate limits must be positive whole numbers.");
  }
  return parsed;
}

export function ManageIntegrationsTab({ controller, canManage }: { controller?: MatterhornIntegrationController; canManage: boolean }) {
  const [installations, setInstallations] = useState<MatterhornIntegrationInstallation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [installId, setInstallId] = useState("");
  const [installName, setInstallName] = useState("");
  const [installCapabilities, setInstallCapabilities] = useState(DEFAULT_CAPABILITIES);
  const [secretName, setSecretName] = useState("");
  const [secret, setSecret] = useState("");
  const [eventPayload, setEventPayload] = useState("{\"type\":\"event\"}");
  const [commandId, setCommandId] = useState("");
  const [commandName, setCommandName] = useState("");
  const [commandDescription, setCommandDescription] = useState("");
  const [commandCapabilities, setCommandCapabilities] = useState("commands.register");
  const [commandArgs, setCommandArgs] = useState("{}");
  const [invocationId, setInvocationId] = useState("");
  const [commandResult, setCommandResult] = useState("{}");
  const [commandError, setCommandError] = useState("");
  const [webhookId, setWebhookId] = useState("");
  const [webhookMaxRequests, setWebhookMaxRequests] = useState("60");
  const [webhookWindowMs, setWebhookWindowMs] = useState("60000");
  const [webhookBurst, setWebhookBurst] = useState("10");
  const [requireModerator, setRequireModerator] = useState(false);
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState<string>();

  const selected = useMemo(() => installations.find((item) => item.integrationId === selectedId), [installations, selectedId]);
  const hasCapability = (capability: MatterhornIntegrationCapability) => Boolean(selected?.capabilities.includes(capability));
  const requestedCapabilities = useMemo(() => parseCapabilities(installCapabilities), [installCapabilities]);

  useEffect(() => {
    if (!controller) {
      setInstallations([]);
      return;
    }
    let active = true;
    const refresh = async () => {
      const next = await controller.list();
      if (!active) return;
      setInstallations(next);
      setSelectedId((current) => current || next[0]?.integrationId || "");
    };
    void refresh().catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = controller.subscribe((next) => {
        if (active) {
          setInstallations(next);
          setSelectedId((current) => next.some((item) => item.integrationId === current) ? current : next[0]?.integrationId || "");
        }
      });
    } catch (cause) {
      if (active) setError(cause instanceof Error ? cause.message : "Integration updates are unavailable.");
    }
    return () => { active = false; unsubscribe(); };
  }, [controller]);

  async function perform(label: string, operation: () => Promise<unknown>) {
    if (!controller || !canManage) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await operation();
      setMessage(label);
      const next = await controller.list();
      setInstallations(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function install() {
    if (!controller || !installId.trim() || !installName.trim()) return;
    await perform("Integration installed.", async () => {
      const identity = await controller.createIdentity({ integrationId: installId, displayName: installName });
      await controller.install({ identity: identity.signedIdentity, capabilities: parseCapabilities(installCapabilities) });
    });
  }

  function submitSecret(operation: "store" | "rotate") {
    if (!controller || !selected || !secretName.trim() || !secret) return;
    const submittedName = secretName.trim();
    const submittedSecret = secret;
    // Clear the controlled fields before awaiting the host so a rejected or
    // slow request cannot leave a private value rendered in the management UI.
    setSecretName("");
    setSecret("");
    void perform(operation === "store" ? "Secret stored." : "Secret rotated.", () => operation === "store"
      ? controller.storeSecret({ integrationId: selected.integrationId, secretName: submittedName, secret: submittedSecret })
      : controller.rotateSecret({ integrationId: selected.integrationId, secretName: submittedName, secret: submittedSecret }));
  }

  function integrationOperation(integrationId: string, operation: (id: string) => Promise<unknown>, label: string) {
    void perform(label, () => operation(integrationId));
  }

  function destructiveAction(key: string, confirmation: string, successLabel: string, operation: () => Promise<unknown>) {
    if (pendingDestructiveAction !== key) {
      setPendingDestructiveAction(key);
      setMessage(`Confirm ${confirmation} to continue.`);
      return;
    }
    setPendingDestructiveAction(undefined);
    void perform(successLabel, operation);
  }

  const selectedIdRequired = Boolean(controller && canManage && selected);

  return (
    <div {...stylex.props(layout.section)}>
      {!controller ? (
        <section {...stylex.props(panel.panel)} aria-label="Integrations unavailable">
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>Matterhorn integrations are unavailable for this room connection.</p></div>
        </section>
      ) : null}
      {!canManage ? (
        <section {...stylex.props(panel.panel)} aria-label="Integrations authorization">
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>Moderator authorization is required to manage integrations.</p></div>
        </section>
      ) : null}

      {controller && canManage ? <>
        <section {...stylex.props(panel.panel)} aria-label="Install integration">
          <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Install integration</h3><span {...stylex.props(panel.meta)}>Signed identity</span></header>
          <div {...stylex.props(panel.body)}>
            <div {...stylex.props(layout.formGrid)}>
              <label {...stylex.props(layout.field)}><span>Integration ID</span><input aria-label="Integration ID" value={installId} onChange={(event) => setInstallId(event.target.value)} /></label>
              <label {...stylex.props(layout.field)}><span>Display name</span><input aria-label="Integration display name" value={installName} onChange={(event) => setInstallName(event.target.value)} /></label>
              <label {...stylex.props(layout.fieldWide)}><span>Requested permissions</span><input aria-label="Integration capabilities" value={installCapabilities} onChange={(event) => setInstallCapabilities(event.target.value)} /></label>
            </div>
            <div aria-label="Requested integration permissions" {...stylex.props(layout.rowStack)}>
              {integrationCapabilityGroups(requestedCapabilities).map(({ group, capabilities }) => (
                <div key={group}>
                  <strong>{group}</strong>
                  <ul>
                    {capabilities.map((capability) => <li key={capability}><span>{integrationCapabilityInfo(capability).label}</span><small> — {integrationCapabilityInfo(capability).description}</small></li>)}
                  </ul>
                </div>
              ))}
            </div>
            <button type="button" disabled={busy || !installId.trim() || !installName.trim()} onClick={() => void install()} {...stylex.props(button.btn, button.primary)}>Create identity and install</button>
          </div>
        </section>

        <section {...stylex.props(panel.panel)} aria-label="Installed integrations">
          <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Installed integrations</h3><span {...stylex.props(panel.meta)}>{installations.length} records</span></header>
          <div {...stylex.props(panel.bodyFlush)}>
            {installations.length ? installations.map((installation) => (
              <article {...stylex.props(row.row)} key={installation.integrationId}>
                <button type="button" aria-label={`Select ${installation.displayName}`} onClick={() => setSelectedId(installation.integrationId)} {...stylex.props(button.btn, button.secondary)}>
                  {installation.displayName} · {installation.status}
                </button>
                <span {...stylex.props(row.rowEnd)}>
                  {installation.status === "enabled" ? <button type="button" disabled={busy} onClick={() => integrationOperation(installation.integrationId, controller.disable, "Integration disabled.")} {...stylex.props(button.btn, button.secondary, button.sm)}>Disable</button> : <button type="button" disabled={busy} onClick={() => integrationOperation(installation.integrationId, controller.enable, "Integration enabled.")} {...stylex.props(button.btn, button.secondary, button.sm)}>Enable</button>}
                  <button type="button" disabled={busy} onClick={() => destructiveAction(`uninstall:${installation.integrationId}`, "uninstall", "Integration uninstalled.", () => controller.uninstall(installation.integrationId))} {...stylex.props(button.btn, button.danger, button.sm)}>{pendingDestructiveAction === `uninstall:${installation.integrationId}` ? "Confirm uninstall" : "Uninstall"}</button>
                </span>
              </article>
            )) : <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No integrations are installed.</p></div>}
          </div>
        </section>

        {selected ? <>
          <section {...stylex.props(panel.panel)} aria-label="Integration identity">
            <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>{selected.displayName}</h3><span {...stylex.props(panel.meta)}>{selected.status}</span></header>
            <div {...stylex.props(panel.body)}>
              <p {...stylex.props(misc.hint)}>Identity: <code>{selected.integrationId}</code></p>
              <p {...stylex.props(misc.hint)}>Public key: <code>{selected.publicKey}</code></p>
              <div aria-label="Granted integration permissions">
                <strong>Granted permissions</strong>
                <ul>
                  {selected.capabilities.map((capability) => <li key={capability}><span>{integrationCapabilityInfo(capability).label}</span><small> — {integrationCapabilityInfo(capability).description}</small></li>)}
                </ul>
              </div>
            </div>
          </section>

          <section {...stylex.props(panel.panel)} aria-label="Integration secrets">
            <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Encrypted secret storage</h3><span {...stylex.props(panel.meta)}>Never shown after submit</span></header>
            <div {...stylex.props(panel.body)}>
              <div {...stylex.props(layout.formGrid)}>
                <label {...stylex.props(layout.field)}><span>Secret name</span><input aria-label="Secret name" value={secretName} onChange={(event) => setSecretName(event.target.value)} /></label>
                <label {...stylex.props(layout.field)}><span>Secret value</span><input aria-label="Secret value" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
              </div>
              <button type="button" disabled={busy || !secretName.trim() || !secret || !selectedIdRequired || !hasCapability("secrets.write")} onClick={() => submitSecret("store")} {...stylex.props(button.btn, button.secondary)}>Store secret</button>
              <button type="button" disabled={busy || !secretName.trim() || !secret || !selectedIdRequired || !hasCapability("secrets.write")} onClick={() => submitSecret("rotate")} {...stylex.props(button.btn, button.secondary)}>Rotate secret</button>
            </div>
          </section>

          <section {...stylex.props(panel.panel)} aria-label="Encrypted integration events">
            <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Encrypted ingress / egress</h3><span {...stylex.props(panel.meta)}>Payloads are encrypted by Matterhorn</span></header>
            <div {...stylex.props(panel.body)}>
              <label {...stylex.props(layout.fieldWide)}><span>JSON payload</span><textarea aria-label="Integration event payload" value={eventPayload} onChange={(event) => setEventPayload(event.target.value)} /></label>
              <button type="button" disabled={busy || !hasCapability("events.ingress")} onClick={() => void perform("Ingress sent.", () => controller.ingress({ integrationId: selected.integrationId, payload: parseJson(eventPayload, "Event payload") }))} {...stylex.props(button.btn, button.secondary)}>Send ingress</button>
              <button type="button" disabled={busy || !hasCapability("events.egress")} onClick={() => void perform("Egress sent.", () => controller.egress({ integrationId: selected.integrationId, payload: parseJson(eventPayload, "Event payload") }))} {...stylex.props(button.btn, button.secondary)}>Send egress</button>
            </div>
          </section>

          <section {...stylex.props(panel.panel)} aria-label="Integration commands">
            <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Commands</h3><span {...stylex.props(panel.meta)}>Register, invoke, and publish results</span></header>
            <div {...stylex.props(panel.body)}>
              <div {...stylex.props(layout.formGrid)}>
                <label {...stylex.props(layout.field)}><span>Command ID</span><input aria-label="Command ID" value={commandId} onChange={(event) => setCommandId(event.target.value)} /></label>
                <label {...stylex.props(layout.field)}><span>Command name</span><input aria-label="Command name" value={commandName} onChange={(event) => setCommandName(event.target.value)} /></label>
                <label {...stylex.props(layout.fieldWide)}><span>Description</span><input aria-label="Command description" value={commandDescription} onChange={(event) => setCommandDescription(event.target.value)} /></label>
                <label {...stylex.props(layout.fieldWide)}><span>Required capabilities</span><input aria-label="Command capabilities" value={commandCapabilities} onChange={(event) => setCommandCapabilities(event.target.value)} /></label>
              </div>
              <p {...stylex.props(misc.hint)}>Requested command permissions: {parseCapabilities(commandCapabilities).map((capability) => integrationCapabilityInfo(capability).label).join(", ") || "none"}.</p>
              <button type="button" disabled={busy || !commandId || !commandName || !hasCapability("commands.register")} onClick={() => {
                const command: MatterhornIntegrationCommand = { integrationId: selected.integrationId, commandId, name: commandName, description: commandDescription || undefined, capabilities: parseCapabilities(commandCapabilities) };
                void perform("Command registered.", () => controller.registerCommand(command));
              }} {...stylex.props(button.btn, button.secondary)}>Register command</button>
              <button type="button" disabled={busy || !commandId || !hasCapability("commands.register")} onClick={() => destructiveAction(`command:${selected.integrationId}:${commandId}`, "command removal", "Command unregistered.", () => controller.unregisterCommand({ integrationId: selected.integrationId, commandId }))} {...stylex.props(button.btn, button.danger)}>{pendingDestructiveAction === `command:${selected.integrationId}:${commandId}` ? "Confirm unregister command" : "Unregister command"}</button>
              <label {...stylex.props(layout.fieldWide)}><span>Invocation args (JSON)</span><textarea aria-label="Command arguments" value={commandArgs} onChange={(event) => setCommandArgs(event.target.value)} /></label>
              <button type="button" disabled={busy || !commandId || !hasCapability("commands.invoke")} onClick={() => void perform("Command invoked.", () => controller.invokeCommand({ integrationId: selected.integrationId, commandId, args: parseJson(commandArgs, "Command arguments") }))} {...stylex.props(button.btn, button.secondary)}>Invoke command</button>
              <div {...stylex.props(layout.formGrid)}>
                <label {...stylex.props(layout.field)}><span>Invocation ID</span><input aria-label="Invocation ID" value={invocationId} onChange={(event) => setInvocationId(event.target.value)} /></label>
                <label {...stylex.props(layout.field)}><span>Result (JSON)</span><textarea aria-label="Command result" value={commandResult} onChange={(event) => setCommandResult(event.target.value)} /></label>
                <label {...stylex.props(layout.fieldWide)}><span>Error (optional)</span><input aria-label="Command error" value={commandError} onChange={(event) => setCommandError(event.target.value)} /></label>
              </div>
              <button type="button" disabled={busy || !commandId || !invocationId || !hasCapability("commands.result")} onClick={() => void perform("Command result published.", () => controller.publishCommandResult({ integrationId: selected.integrationId, commandId, invocationId, result: parseJson(commandResult, "Command result"), error: commandError || undefined }))} {...stylex.props(button.btn, button.secondary)}>Publish command result</button>
            </div>
          </section>

          <section {...stylex.props(panel.panel)} aria-label="Integration webhooks">
            <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Webhook policy and rate limits</h3><span {...stylex.props(panel.meta)}>Moderator-controlled</span></header>
            <div {...stylex.props(panel.body)}>
              <div {...stylex.props(layout.formGrid)}>
                <label {...stylex.props(layout.field)}><span>Webhook ID</span><input aria-label="Webhook ID" value={webhookId} onChange={(event) => setWebhookId(event.target.value)} /></label>
                <label {...stylex.props(layout.field)}><span>Max requests</span><input aria-label="Webhook max requests" type="number" value={webhookMaxRequests} onChange={(event) => setWebhookMaxRequests(event.target.value)} /></label>
                <label {...stylex.props(layout.field)}><span>Window (ms)</span><input aria-label="Webhook window" type="number" value={webhookWindowMs} onChange={(event) => setWebhookWindowMs(event.target.value)} /></label>
                <label {...stylex.props(layout.field)}><span>Burst</span><input aria-label="Webhook burst" type="number" value={webhookBurst} onChange={(event) => setWebhookBurst(event.target.value)} /></label>
              </div>
              <label {...stylex.props(layout.checkbox)}><input type="checkbox" checked={requireModerator} onChange={(event) => setRequireModerator(event.target.checked)} /> Require moderator approval</label>
              <button type="button" onClick={() => {
                const moderatorPolicy: MatterhornWebhookModeratorPolicy = { requireModeratorApproval: requireModerator };
                void perform("Webhook registered.", () => controller.registerWebhook({ integrationId: selected.integrationId, webhookId, rateLimit: rateLimit(webhookMaxRequests, webhookWindowMs, webhookBurst), moderatorPolicy }));
              }} {...stylex.props(button.btn, button.secondary)} disabled={busy || !webhookId || !hasCapability("webhooks.manage")}>Register webhook</button>
              <button type="button" disabled={busy || !webhookId || !hasCapability("webhooks.manage")} onClick={() => destructiveAction(`webhook:${selected.integrationId}:${webhookId}`, "webhook removal", "Webhook removed.", () => controller.removeWebhook({ integrationId: selected.integrationId, webhookId }))} {...stylex.props(button.btn, button.danger)}>{pendingDestructiveAction === `webhook:${selected.integrationId}:${webhookId}` ? "Confirm remove webhook" : "Remove webhook"}</button>
              <button type="button" disabled={busy || !webhookId || !hasCapability("webhooks.manage")} onClick={() => void perform("Webhook rate limit updated.", () => controller.setWebhookRateLimit({ integrationId: selected.integrationId, webhookId, rateLimit: rateLimit(webhookMaxRequests, webhookWindowMs, webhookBurst) }))} {...stylex.props(button.btn, button.secondary)}>Update rate limit</button>
              <button type="button" disabled={busy || !webhookId || !hasCapability("webhooks.manage")} onClick={() => void perform("Webhook policy updated.", () => controller.setWebhookModeratorPolicy({ integrationId: selected.integrationId, webhookId, policy: { requireModeratorApproval: requireModerator } }))} {...stylex.props(button.btn, button.secondary)}>Update policy</button>
            </div>
          </section>
        </> : null}
      </> : null}
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
