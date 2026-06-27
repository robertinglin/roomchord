import React, { useState } from "react";
import { optionalChannelGroup } from "@entities/chat/model/channelGroups";
import type { Channel } from "@entities/chat/model/types";
import { Glyph, HashGlyph } from "@shared/ui/design";
import { Modal } from "@features/management/ui/Modal";
import { panel, field, button, row, layout, misc } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

type ChannelModalMode = "create" | "edit";

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
  const [modalMode, setModalMode] = useState<ChannelModalMode | undefined>();
  const editingChannel = editingChannelId ? channels.find((channel) => channel.id === editingChannelId) : undefined;
  const isCreating = modalMode === "create";
  const isEditing = modalMode === "edit" && Boolean(editingChannel);

  function createChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = channelName.trim().replace(/^#/, "");
    if (!cleanName) return;
    onCreateChannel({ name: cleanName, topic: channelTopic.trim() || undefined, group: optionalChannelGroup(channelGroup) });
    setChannelName("");
    setChannelTopic("");
    setChannelGroup("");
    closeChannelModal();
  }

  function openCreateModal() {
    setEditingChannelId(undefined);
    setModalMode("create");
  }

  function openChannelEditor(channel: Channel) {
    setEditingChannelId(channel.id);
    setEditChannelName(channel.name);
    setEditChannelTopic(channel.topic || "");
    setEditChannelGroup(channel.group || "");
    setModalMode("edit");
  }

  function closeChannelModal() {
    setModalMode(undefined);
    setEditingChannelId(undefined);
  }

  function saveChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingChannelId) return;
    const cleanName = editChannelName.trim().replace(/^#/, "");
    if (!cleanName) return;
    onUpdateChannel(editingChannelId, { name: cleanName, topic: editChannelTopic.trim(), group: optionalChannelGroup(editChannelGroup) || null });
    closeChannelModal();
  }

  return (
    <div {...stylex.props(layout.section)}>
      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Channels</h3>
          <span {...stylex.props(panel.meta)}>{channels.length} channel{channels.length === 1 ? "" : "s"}</span>
          {canCreateChannels ? (
            <button type="button" onClick={openCreateModal} {...stylex.props(button.btn, button.primary, button.sm)}>
              <Glyph size={15}><><path d="M12 5v14M5 12h14" /></></Glyph>
              New channel
            </button>
          ) : null}
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
                  <button type="button" onClick={() => openChannelEditor(channel)} {...stylex.props(button.btn, button.ghost, button.sm)}>Manage</button>
                </span>
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div {...stylex.props(panel.body)}><p {...stylex.props(misc.hint)}>No channels yet.</p></div>
        )}
      </section>

      <Modal
        open={isCreating}
        onClose={closeChannelModal}
        icon={<HashGlyph size={20} />}
        title="Create channel"
        description="Add a text channel to the room."
        footer={(
          <>
            <button type="button" onClick={closeChannelModal} {...stylex.props(button.btn, button.ghost)}>Cancel</button>
            <button type="submit" form="create-channel-form" disabled={!channelName.trim()} {...stylex.props(button.btn, button.primary)}>
              <Glyph size={15}><><path d="M12 5v14M5 12h14" /></></Glyph>
              Create channel
            </button>
          </>
        )}
      >
        <form id="create-channel-form" onSubmit={createChannel}>
          <label {...stylex.props(field.field)}>
            <span {...stylex.props(field.label)}>Channel name</span>
            <input aria-label="Channel name" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="channel-name" {...stylex.props(field.input)} />
          </label>
          <label {...stylex.props(field.field)}>
            <span {...stylex.props(field.label)}>Topic <span {...stylex.props(misc.textQuiet, misc.textSmall)} style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>- optional</span></span>
            <input aria-label="Channel topic" value={channelTopic} onChange={(event) => setChannelTopic(event.target.value)} placeholder="What's this channel for?" {...stylex.props(field.input)} />
          </label>
          <label {...stylex.props(field.field, field.fieldLast)}>
            <span {...stylex.props(field.label)}>Group</span>
            <input aria-label="Channel group" value={channelGroup} onChange={(event) => setChannelGroup(event.target.value)} placeholder="General" {...stylex.props(field.input)} />
          </label>
        </form>
      </Modal>

      <Modal
        open={isEditing}
        onClose={closeChannelModal}
        icon={<HashGlyph size={20} />}
        title={editingChannel ? `Manage #${editingChannel.name}` : "Manage channel"}
        description="Update the channel name, topic, and group."
        footer={editingChannel ? (
          <>
            <button
              type="button"
              onClick={() => { onArchiveChannel(editingChannel.id); closeChannelModal(); }}
              {...stylex.props(button.btn, button.danger, button.pushLeft)}
            >
              Archive channel
            </button>
            <button type="button" onClick={closeChannelModal} {...stylex.props(button.btn, button.ghost)}>Cancel</button>
            <button type="submit" form="edit-channel-form" disabled={!editChannelName.trim()} {...stylex.props(button.btn, button.primary)}>Save changes</button>
          </>
        ) : null}
      >
        <form id="edit-channel-form" onSubmit={saveChannel}>
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
        </form>
      </Modal>
    </div>
  );
}
