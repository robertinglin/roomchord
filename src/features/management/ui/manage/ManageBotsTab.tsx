import React, { useState } from "react";
import type { ManagementInvite, ManagementSnapshot } from "matterhorn-sdk/browser/management";
import { button, field, notice, panel, row, section } from "@shared/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

type Props = {
  managementSnapshot?: ManagementSnapshot;
  channels?: Array<{ id: string; name: string }>;
  channelAccessByMemberId?: Record<string, string[]>;
  healthByMemberId?: Record<string, { state: string; model?: string; queueSaturated?: boolean; status?: string; visible?: boolean } | undefined>;
  onCreateInvite(input: { serviceId: string; displayName: string }): Promise<ManagementInvite>;
  onRemove(memberId: string): Promise<unknown>;
  onRotate(memberId: string, deviceId: string): Promise<ManagementInvite>;
  onSetChannelAccess(memberId: string, channelIds: string[]): Promise<unknown>;
};

export function botStatus(status: string | undefined, health?: { state: string; queueSaturated?: boolean; status?: string; visible?: boolean }) {
  if (["removed", "revoked", "banned"].includes(status || "")) return "revoked";
  if (health?.state === "degraded" || health?.queueSaturated) return "degraded";
  if (health && health.visible !== false && health.status !== "offline") return "online";
  return "offline";
}

export function ManageBotsTab({ managementSnapshot, channels = [], channelAccessByMemberId = {}, healthByMemberId = {}, onCreateInvite, onRemove, onRotate, onSetChannelAccess }: Props) {
  const [serviceId, setServiceId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [createdInvite, setCreatedInvite] = useState<ManagementInvite>();
  const [invitePurpose, setInvitePurpose] = useState<"admission" | "rotation">("admission");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [channelSelections, setChannelSelections] = useState<Record<string, string[]>>({});
  const bots = (managementSnapshot?.members || []).filter((member) => member.kind === "bot");
  const pending = (managementSnapshot?.invites || []).filter((invite) => invite.principal?.kind === "bot" && invite.status === "active" && !bots.some((bot) => bot.joinedViaInviteId === invite.id));

  function selectedChannels(memberId: string) {
    return channelSelections[memberId] || channelAccessByMemberId[memberId] || [];
  }

  function toggleChannel(memberId: string, channelId: string) {
    const current = selectedChannels(memberId);
    setChannelSelections((selections) => ({
      ...selections,
      [memberId]: current.includes(channelId) ? current.filter((id) => id !== channelId) : [...current, channelId]
    }));
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!serviceId.trim() || !displayName.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const invite = await onCreateInvite({ serviceId: serviceId.trim(), displayName: displayName.trim() });
      setCreatedInvite(invite);
      setInvitePurpose("admission");
      setMessage("Bot invite created. Its signed identity must match these values.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create the bot invite.");
    } finally {
      setBusy(false);
    }
  }

  async function act(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The bot action failed.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <section {...stylex.props(panel.panel)}>
      <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Add a bot</h3></header>
      <form {...stylex.props(panel.body)} onSubmit={create}>
        <p {...stylex.props(section.description)}>Creates a one-use, 15-minute member-role invite bound to a signed bot service identity. A regular member client cannot use it; selected channels are granted after admission.</p>
        <label {...stylex.props(field.field)}>
          <span {...stylex.props(field.label)}>Service ID</span>
          <input {...stylex.props(field.input)} value={serviceId} onChange={(event) => setServiceId(event.target.value)} placeholder="mosh.summarizer" maxLength={160} required />
        </label>
        <label {...stylex.props(field.field)}>
          <span {...stylex.props(field.label)}>Display name</span>
          <input {...stylex.props(field.input)} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Room Summarizer" maxLength={160} required />
        </label>
        <button type="submit" disabled={busy} {...stylex.props(button.btn, button.primary, busy && button.disabled)}>Create bot invite</button>
      </form>
    </section>

    {message ? <p {...stylex.props(notice.info)}>{message}</p> : null}
    {createdInvite?.url ? (
      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>{invitePurpose === "rotation" ? "Rotation invite URL" : "Bot invite URL"}</h3></header>
        <div {...stylex.props(panel.body)}><input aria-label={invitePurpose === "rotation" ? "Rotation invite URL" : "Bot invite URL"} readOnly value={createdInvite.url} {...stylex.props(field.input)} /></div>
      </section>
    ) : null}

    {pending.length ? (
      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Pending bots</h3><span {...stylex.props(panel.meta)}>{pending.length}</span></header>
        <div {...stylex.props(panel.body)}>{pending.map((invite) => (
          <div key={invite.id} {...stylex.props(row.row)}>
            <span {...stylex.props(row.rowMain)}><strong {...stylex.props(row.rowTitle)}>{invite.principal?.displayName}</strong><small {...stylex.props(row.rowSub)}>{invite.principal?.serviceId} · pending · expires {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : "soon"}</small></span>
          </div>
        ))}</div>
      </section>
    ) : null}

    <section {...stylex.props(panel.panel, panel.panelLast)}>
      <header {...stylex.props(panel.head)}><h3 {...stylex.props(panel.h3)}>Admitted bots</h3><span {...stylex.props(panel.meta)}>{bots.length}</span></header>
      <div {...stylex.props(panel.body)}>
        {bots.length === 0 ? <p {...stylex.props(section.description)}>No signed bot principals are admitted to this room.</p> : bots.map((bot) => (
          <div key={bot.memberId} {...stylex.props(row.row)}>
            <span {...stylex.props(row.rowMain)}>
              <strong {...stylex.props(row.rowTitle)}>{bot.serviceDisplayName || bot.username || bot.memberId}</strong>
              <small {...stylex.props(row.rowSub)}>
                {bot.serviceId} · {botStatus(bot.status, healthByMemberId[bot.memberId])}
                {healthByMemberId[bot.memberId]?.model ? ` · model ${healthByMemberId[bot.memberId]?.model}` : ""}
                {healthByMemberId[bot.memberId]?.queueSaturated ? " · queue saturated" : ""}
              </small>
              {bot.credentialFingerprint ? <small {...stylex.props(row.rowSub)}>Credential: {bot.credentialFingerprint}</small> : null}
              {(bot.devices || []).map((device) => <small key={device.deviceId} {...stylex.props(row.rowSub)}>Device {device.deviceId}: {device.credentialFingerprint}</small>)}
              {bot.status !== "removed" && bot.status !== "revoked" ? (
                <fieldset {...stylex.props(field.field)}>
                  <legend {...stylex.props(field.label)}>Allowed channels</legend>
                  {channels.map((channel) => <label key={channel.id}><input type="checkbox" checked={selectedChannels(bot.memberId).includes(channel.id)} onChange={() => toggleChannel(bot.memberId, channel.id)} /> #{channel.name}</label>)}
                  <button type="button" disabled={busy} onClick={() => void act(() => onSetChannelAccess(bot.memberId, selectedChannels(bot.memberId)), "Bot channel access updated." )} {...stylex.props(button.btn, button.secondary, button.sm, busy && button.disabled)}>Save channel access</button>
                </fieldset>
              ) : null}
            </span>
            <span {...stylex.props(row.rowEnd)}>
              {(bot.devices || []).map((device) => (
                <button key={device.deviceId} type="button" disabled={busy} onClick={() => void act(async () => {
                  setCreatedInvite(await onRotate(bot.memberId, device.deviceId));
                  setInvitePurpose("rotation");
                }, "Rotation invite created and the selected device was revoked.")} {...stylex.props(button.btn, button.secondary, button.sm, busy && button.disabled)}>Rotate device</button>
              ))}
              <button type="button" disabled={busy} onClick={() => void act(() => onRemove(bot.memberId), "Bot membership revoked.")} {...stylex.props(button.btn, button.danger, button.sm, busy && button.disabled)}>Revoke</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  </>;
}
