import React, { useState } from "react";
import { optionalChannelGroup } from "@entities/chat/model/channelGroups";
import type { Channel } from "@entities/chat/model/types";

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
    <div className="manage-section">
      {canCreateChannels ? (
        <form className="manage-form-grid" onSubmit={createChannel}>
          <label>
            <span>New channel</span>
            <input aria-label="Channel name" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="channel-name" />
          </label>
          <label>
            <span>Topic</span>
            <input aria-label="Channel topic" value={channelTopic} onChange={(event) => setChannelTopic(event.target.value)} placeholder="Optional topic" />
          </label>
          <label>
            <span>Group</span>
            <input aria-label="Channel group" value={channelGroup} onChange={(event) => setChannelGroup(event.target.value)} placeholder="General" />
          </label>
          <button className="primary-action" type="submit" disabled={!channelName.trim()}>
            Create channel
          </button>
        </form>
      ) : null}
      <div className="manage-list">
        {channels.map((channel) => (
          <article className="manage-list-row" key={channel.id}>
            <span>
              <strong>#{channel.name}</strong>
              <small>{[channel.group || "General", channel.topic || "No topic"].join(" · ")}</small>
            </span>
            <button className="secondary-action" type="button" onClick={() => openChannelEditor(channel)}>Manage</button>
          </article>
        ))}
      </div>
      {editingChannel ? (
        <form className="manage-editor" onSubmit={saveChannel}>
          <h3>#{editingChannel.name}</h3>
          <label>
            <span>Channel name</span>
            <input aria-label="Manage channel name" value={editChannelName} onChange={(event) => setEditChannelName(event.target.value)} />
          </label>
          <label>
            <span>Topic</span>
            <input aria-label="Manage channel topic" value={editChannelTopic} onChange={(event) => setEditChannelTopic(event.target.value)} />
          </label>
          <label>
            <span>Group</span>
            <input aria-label="Manage channel group" value={editChannelGroup} onChange={(event) => setEditChannelGroup(event.target.value)} />
          </label>
          <div className="form-actions two-up-actions">
            <button className="secondary-action" type="submit" disabled={!editChannelName.trim()}>Save settings</button>
            <button className="ghost-action" type="button" onClick={() => setEditingChannelId(undefined)}>Cancel</button>
          </div>
          <button className="danger-action full-width" type="button" onClick={() => { onArchiveChannel(editingChannel.id); setEditingChannelId(undefined); }}>
            Archive channel
          </button>
        </form>
      ) : null}
    </div>
  );
}
