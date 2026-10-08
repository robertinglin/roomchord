import React, { useEffect, useState } from "react";
import { optionalChannelGroup, orderedChannelCategories } from "@entities/chat/model/channelGroups";
import type { Channel, ChannelCategory, ChannelVisibility } from "@entities/chat/model/types";
import { Glyph, HashGlyph } from "@shared/ui/design";
import { Modal } from "@features/management/ui/Modal";
import { panel, field, button, row, layout, misc } from "@shared/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

type ChannelModalMode = "create" | "edit";

function csvValues(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function accessIds(visibility: ChannelVisibility, roleIds: string, memberIds: string) {
  if (visibility !== "private") return { allowedRoleIds: [], allowedMemberIds: [] };
  return {
    allowedRoleIds: [...new Set(["admin", "owner", ...csvValues(roleIds)])],
    allowedMemberIds: csvValues(memberIds)
  };
}

export function ManageChannelsTab({
  initialChannelId,
  canCreateChannels,
  canManageCategories = false,
  accessScopes = {},
  categories = [],
  channels,
  onArchiveChannel,
  onArchiveCategory,
  onCreateCategory,
  onCreateChannel,
  onReorderCategory,
  onUpdateCategory,
  onUpdateChannel
}: {
  initialChannelId?: string;
  canCreateChannels: boolean;
  canManageCategories?: boolean;
  accessScopes?: Record<string, { source?: string; inheritedFrom?: { scopeType: string; scopeId: string } }>;
  categories?: ChannelCategory[];
  channels: Channel[];
  onArchiveChannel: (id: string) => void;
  onArchiveCategory?: (id: string) => void;
  onCreateCategory?: (input: { name: string; position?: number }) => void;
  onCreateChannel: (input: { name: string; topic?: string; group?: string; categoryId?: string; position?: number; visibility?: ChannelVisibility; allowedRoleIds?: string[]; allowedMemberIds?: string[] }) => void;
  onReorderCategory?: (id: string, position: number) => void;
  onUpdateCategory?: (id: string, input: { name?: string; position?: number }) => void;
  onUpdateChannel: (id: string, input: { name?: string; topic?: string | null; group?: string | null; categoryId?: string | null; position?: number; visibility?: ChannelVisibility; allowedRoleIds?: string[]; allowedMemberIds?: string[] }) => void;
}) {
  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelGroup, setChannelGroup] = useState("");
  const [channelCategoryId, setChannelCategoryId] = useState("");
  const [channelVisibility, setChannelVisibility] = useState<ChannelVisibility>("public");
  const [channelAllowedRoleIds, setChannelAllowedRoleIds] = useState("");
  const [channelAllowedMemberIds, setChannelAllowedMemberIds] = useState("");
  const [editingChannelId, setEditingChannelId] = useState<string | undefined>();
  const [editChannelName, setEditChannelName] = useState("");
  const [editChannelTopic, setEditChannelTopic] = useState("");
  const [editChannelGroup, setEditChannelGroup] = useState("");
  const [editChannelCategoryId, setEditChannelCategoryId] = useState("");
  const [editChannelVisibility, setEditChannelVisibility] = useState<ChannelVisibility>("public");
  const [editChannelAllowedRoleIds, setEditChannelAllowedRoleIds] = useState("");
  const [editChannelAllowedMemberIds, setEditChannelAllowedMemberIds] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>();
  const [editCategoryName, setEditCategoryName] = useState("");
  const [modalMode, setModalMode] = useState<ChannelModalMode | undefined>();
  const editingChannel = editingChannelId ? channels.find((channel) => channel.id === editingChannelId) : undefined;
  const isCreating = modalMode === "create";
  const isEditing = modalMode === "edit" && Boolean(editingChannel);

  function createChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = channelName.trim().replace(/^#/, "");
    if (!cleanName) return;
    const access = accessIds(channelVisibility, channelAllowedRoleIds, channelAllowedMemberIds);
    onCreateChannel({
      name: cleanName,
      topic: channelTopic.trim() || undefined,
      group: optionalChannelGroup(channelGroup),
      categoryId: channelCategoryId || undefined,
      visibility: channelVisibility,
      ...access
    });
    setChannelName("");
    setChannelTopic("");
    setChannelGroup("");
    setChannelCategoryId("");
    setChannelVisibility("public");
    setChannelAllowedRoleIds("");
    setChannelAllowedMemberIds("");
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
    setEditChannelCategoryId(channel.categoryId || "");
    setEditChannelVisibility(channel.visibility || "public");
    setEditChannelAllowedRoleIds((channel.allowedRoleIds || []).join(", "));
    setEditChannelAllowedMemberIds((channel.allowedMemberIds || []).join(", "));
    setModalMode("edit");
  }

  useEffect(() => {
    if (!initialChannelId) return;
    const channel = channels.find((candidate) => candidate.id === initialChannelId);
    if (channel) openChannelEditor(channel);
  }, [initialChannelId]);

  function closeChannelModal() {
    setModalMode(undefined);
    setEditingChannelId(undefined);
  }

  function saveChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingChannelId) return;
    const cleanName = editChannelName.trim().replace(/^#/, "");
    if (!cleanName) return;
    const access = accessIds(editChannelVisibility, editChannelAllowedRoleIds, editChannelAllowedMemberIds);
    onUpdateChannel(editingChannelId, {
      name: cleanName,
      topic: editChannelTopic.trim(),
      group: optionalChannelGroup(editChannelGroup) || null,
      categoryId: editChannelCategoryId || null,
      visibility: editChannelVisibility,
      ...access
    });
    closeChannelModal();
  }

  function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name || !onCreateCategory) return;
    onCreateCategory({ name, position: orderedChannelCategories(categories).length });
    setCategoryName("");
  }

  function openCategoryEditor(category: ChannelCategory) {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
  }

  function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCategoryId || !editCategoryName.trim() || !onUpdateCategory) return;
    onUpdateCategory(editingCategoryId, { name: editCategoryName.trim() });
    setEditingCategoryId(undefined);
  }

  function moveCategory(category: ChannelCategory, delta: number) {
    const ordered = orderedChannelCategories(categories);
    const index = ordered.findIndex((item) => item.id === category.id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= ordered.length || !onReorderCategory) return;
    onReorderCategory(category.id, ordered[next].position);
    onReorderCategory(ordered[next].id, category.position);
  }

  return (
    <div {...stylex.props(layout.section)}>
      {canManageCategories && (onCreateCategory || categories.length) ? (
        <section {...stylex.props(panel.panel)}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>Categories</h3>
            <span {...stylex.props(panel.meta)}>{categories.length} categor{categories.length === 1 ? "y" : "ies"}</span>
          </header>
          {onCreateCategory ? (
            <form onSubmit={createCategory} {...stylex.props(panel.body)}>
              <input aria-label="Category name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" {...stylex.props(field.input)} />
              <button type="submit" disabled={!categoryName.trim()} {...stylex.props(button.btn, button.primary, button.sm)}>Create category</button>
            </form>
          ) : null}
          {categories.length ? (
            <div {...stylex.props(panel.bodyFlush)}>
              <div {...stylex.props(layout.rowStack)}>
                {orderedChannelCategories(categories).map((category, index, ordered) => (
                  <div {...stylex.props(row.row)} key={category.id}>
                    <span {...stylex.props(row.rowMain)}>
                      <span {...stylex.props(row.rowTitle)}>{category.name}</span>
                      <span {...stylex.props(row.rowSub)}>{category.position} · {channels.filter((channel) => channel.categoryId === category.id).length} channels</span>
                    </span>
                    {canManageCategories ? (
                      <span {...stylex.props(row.rowEnd)}>
                        <button type="button" aria-label={`Move ${category.name} up`} disabled={index === 0} onClick={() => moveCategory(category, -1)} {...stylex.props(button.btn, button.ghost, button.sm)}>↑</button>
                        <button type="button" aria-label={`Move ${category.name} down`} disabled={index === ordered.length - 1} onClick={() => moveCategory(category, 1)} {...stylex.props(button.btn, button.ghost, button.sm)}>↓</button>
                        {onUpdateCategory ? <button type="button" onClick={() => openCategoryEditor(category)} {...stylex.props(button.btn, button.ghost, button.sm)}>Manage</button> : null}
                        {onArchiveCategory ? <button type="button" onClick={() => onArchiveCategory(category.id)} {...stylex.props(button.btn, button.danger, button.sm)}>Archive</button> : null}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {editingCategoryId && onUpdateCategory ? (
            <form onSubmit={saveCategory} {...stylex.props(panel.body)}>
              <input aria-label="Manage category name" value={editCategoryName} onChange={(event) => setEditCategoryName(event.target.value)} {...stylex.props(field.input)} />
              <button type="submit" disabled={!editCategoryName.trim()} {...stylex.props(button.btn, button.primary, button.sm)}>Save category</button>
              <button type="button" onClick={() => setEditingCategoryId(undefined)} {...stylex.props(button.btn, button.ghost, button.sm)}>Cancel</button>
            </form>
          ) : null}
        </section>
      ) : null}
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
            {channels.map((channel) => {
              const access = accessScopes[`channel:${channel.id}`];
              const inheritedCategory = access?.inheritedFrom?.scopeType === "category"
                ? categories.find((category) => category.id === access.inheritedFrom?.scopeId)
                : undefined;
              return (
              <div {...stylex.props(row.row)} key={channel.id}>
                <span {...stylex.props(row.rowLeadGrow)}>
                  <span {...stylex.props(row.rowLeadIcon)}><HashGlyph size={18} /></span>
                  <span {...stylex.props(row.rowMain)}>
                    <span {...stylex.props(row.rowTitle)}>#{channel.name}</span>
                    <span {...stylex.props(row.rowSub)}>{[categories.find((category) => category.id === channel.categoryId)?.name || channel.group || "General", channel.visibility === "private" ? "Private" : "Public", inheritedCategory ? `Access inherited from ${inheritedCategory.name}` : access?.source ? `Access source: ${access.source}` : undefined, channel.topic || "No topic"].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
                <span {...stylex.props(row.rowEnd)}>
                  <button type="button" onClick={() => openChannelEditor(channel)} {...stylex.props(button.btn, button.ghost, button.sm)}>Manage</button>
                </span>
              </div>
            );})}
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
          {categories.length ? (
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Category</span>
              <select aria-label="Channel category" value={channelCategoryId} onChange={(event) => setChannelCategoryId(event.target.value)} {...stylex.props(field.select)}>
                <option value="">No category</option>
                {orderedChannelCategories(categories).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          ) : null}
          <label {...stylex.props(field.field)}>
            <span {...stylex.props(field.label)}>Visibility</span>
            <select aria-label="Channel visibility" value={channelVisibility} onChange={(event) => setChannelVisibility(event.target.value as ChannelVisibility)} {...stylex.props(field.select)}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          {channelVisibility === "private" ? (
            <>
              <label {...stylex.props(field.field)}>
                <span {...stylex.props(field.label)}>Allowed role IDs</span>
                <input aria-label="Allowed role IDs" value={channelAllowedRoleIds} onChange={(event) => setChannelAllowedRoleIds(event.target.value)} placeholder="role-id, another-role" {...stylex.props(field.input)} />
              </label>
              <label {...stylex.props(field.field, field.fieldLast)}>
                <span {...stylex.props(field.label)}>Allowed member IDs</span>
                <input aria-label="Allowed member IDs" value={channelAllowedMemberIds} onChange={(event) => setChannelAllowedMemberIds(event.target.value)} placeholder="member-id, another-member" {...stylex.props(field.input)} />
              </label>
              <p {...stylex.props(misc.hint)}>Members matching an allowed role or member ID can view this channel. Administrators retain access automatically.</p>
            </>
          ) : null}
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
          {categories.length ? (
            <label {...stylex.props(field.field)}>
              <span {...stylex.props(field.label)}>Category</span>
              <select aria-label="Manage channel category" value={editChannelCategoryId} onChange={(event) => setEditChannelCategoryId(event.target.value)} {...stylex.props(field.select)}>
                <option value="">No category</option>
                {orderedChannelCategories(categories).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          ) : null}
          <label {...stylex.props(field.field)}>
            <span {...stylex.props(field.label)}>Visibility</span>
            <select aria-label="Manage channel visibility" value={editChannelVisibility} onChange={(event) => setEditChannelVisibility(event.target.value as ChannelVisibility)} {...stylex.props(field.select)}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          {editChannelVisibility === "private" ? (
            <>
              <label {...stylex.props(field.field)}>
                <span {...stylex.props(field.label)}>Allowed role IDs</span>
                <input aria-label="Manage allowed role IDs" value={editChannelAllowedRoleIds} onChange={(event) => setEditChannelAllowedRoleIds(event.target.value)} placeholder="role-id, another-role" {...stylex.props(field.input)} />
              </label>
              <label {...stylex.props(field.field, field.fieldLast)}>
                <span {...stylex.props(field.label)}>Allowed member IDs</span>
                <input aria-label="Manage allowed member IDs" value={editChannelAllowedMemberIds} onChange={(event) => setEditChannelAllowedMemberIds(event.target.value)} placeholder="member-id, another-member" {...stylex.props(field.input)} />
              </label>
              <p {...stylex.props(misc.hint)}>Members matching an allowed role or member ID can view this channel. Administrators retain access automatically.</p>
            </>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
