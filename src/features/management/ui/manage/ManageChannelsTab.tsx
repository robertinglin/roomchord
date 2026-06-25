import React, { useState } from "react";
import { optionalChannelGroup } from "@entities/chat/model/channelGroups";
import type { Channel } from "@entities/chat/model/types";
import { Glyph, HashGlyph } from "@shared/ui/design";
import { panel, field, button, row, layout, misc } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

export function ManageChannelsTab({
  canCreateChannels,
  channels,
  onArchiveChannel,
  onCreateChannel,
  onUpdateChannel
}: {
  canCreateChannels: boolean;
  channels: Channel[];
  onArchiveChannel: (id: string) => void;
  onCreateChannel: (input: { name: string; topic?: string; group?: string }) => void;
  onUpdateChannel: (id: string, input: { name?: string; topic?: string | null; group?: string | null }) => void;
}) {
  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelGroup, setChannelGroup] = useState("");
  const [editingChannelId, setEditingChannelId] = useState<string | undefined>();
  const [editChannelName, setEditChannelName] = useState("");
  const [editChannelTopic, setEditChannelTopic] = useState("");
  const [editChannelGroup, setEditChannelGroup] = useState("");
  const editingChannel = editingChannelId ? channels.find((channel) => channel.id === editingChannelId) : undefined;

  function createChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = channelName.trim().replace(/^#/, "");
    if (!cleanName) return;
    onCreateChannel({ name: cleanName, topic: channelTopic.trim() || undefined, group: optionalChannelGroup(channelGroup) });
    setChannelName("");
    setChannelTopic("");
    setChannelGroup("");
  }

  function openChannelEditor(channel: Channel) {
    setEditingChannelId(channel.id);
    setEditChannelName(channel.name);
    setEditChannelTopic(channel.topic || "");
    setEditChannelGroup(channel.group || "");
  }

  function saveChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingChannelId) return;
    const cleanName = editChannelName.trim().replace(/^#/, "");
    if (!cleanName) return;
    onUpdateChannel(editingChannelId, { name: cleanName, topic: editChannelTopic.trim(), group: optionalChannelGroup(editChannelGroup) || null });
    setEditingChannelId(undefined);
  }

  return (
    <div {...stylex.props(layout.section)}>
      {canCreateChannels ? (
        <form {...stylex.props(panel.panel)} onSubmit={createChannel}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>New channel</h3>
          </header>
          <div {...stylex.props(panel.body)}>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Channel name</span>
              <input className="etch" aria-label="Channel name" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="channel-name" {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Topic <span {...stylex.props(misc.textQuiet, misc.textSmall)} style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>— optional</span></span>
              <input className="etch" aria-label="Channel topic" value={channelTopic} onChange={(event) => setChannelTopic(event.target.value)} placeholder="What's this channel for?" {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field, field.fieldLast)}>
              <span {...stylex.props(field.label)}>Group</span>
              <input className="etch" aria-label="Channel group" value={channelGroup} onChange={(event) => setChannelGroup(event.target.value)} placeholder="General" {...stylex.props(field.input)} />
            </label>
            <div {...stylex.props(button.actions, button.actionsEnd)}>
              <button type="submit" disabled={!channelName.trim()} {...stylex.props(button.btn, button.primary)}>
                <Glyph size={15}><><path d="M12 5v14M5 12h14" /></></Glyph>
                Create channel
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Channels</h3>
          <span {...stylex.props(panel.meta)}>{channels.length} channel{channels.length === 1 ? "" : "s"}</span>
        </header>
        {channels.length ? (
          <div {...stylex.props(panel.bodyFlush)}>
            <div {...stylex.props(layout.rowStack)}>
            {channels.map((channel) => (
              <div {...stylex.props(row.row)} key={channel.id}>
                <span {...stylex.props(row.rowLeadGrow)}>
                  <span {...stylex.props(row.rowLeadIcon)}><HashGlyph size={18} /></span>
                  <span {...stylex.props(row.rowMain)}>
                    <span {...stylex.props(row.rowTitle)}>#{channel.name}</span>
                    <span {...stylex.props(row.rowSub)}>{[channel.group || "General", channel.topic || "No topic"].join(" · ")}</span>
                  </span>
                </span>
                <span {...stylex.props(row.rowEnd)}>
                  <button type="button" className="btn ghost" onClick={() => openChannelEditor(channel)} {...stylex.props(button.btn, button.ghost, button.sm)}>Manage</button>
                </span>
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No channels yet.</p></div>
        )}
      </section>

      {editingChannel ? (
        <form {...stylex.props(panel.panel)} onSubmit={saveChannel}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>#{editingChannel.name}</h3>
          </header>
          <div {...stylex.props(panel.body)}>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Channel name</span>
              <input aria-label="Manage channel name" value={editChannelName} onChange={(event) => setEditChannelName(event.target.value)} {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Topic</span>
              <input aria-label="Manage channel topic" value={editChannelTopic} onChange={(event) => setEditChannelTopic(event.target.value)} {...stylex.props(field.input)} />
            </label>
            <label {...stylex.props(field.field, field.fieldLast)}>
              <span {...stylex.props(field.label)}>Group</span>
              <input aria-label="Manage channel group" value={editChannelGroup} onChange={(event) => setEditChannelGroup(event.target.value)} {...stylex.props(field.input)} />
            </label>
            <div {...stylex.props(button.actions)}>
              <button type="submit" disabled={!editChannelName.trim()} {...stylex.props(button.btn, button.primary)}>Save settings</button>
              <button type="button" onClick={() => setEditingChannelId(undefined)} {...stylex.props(button.btn, button.ghost)}>Cancel</button>
            </div>
            <button
              type="button"
              onClick={() => { onArchiveChannel(editingChannel.id); setEditingChannelId(undefined); }}
              {...stylex.props(button.btn, button.danger, button.sm, button.fullWidth)}
            >
              Archive channel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
