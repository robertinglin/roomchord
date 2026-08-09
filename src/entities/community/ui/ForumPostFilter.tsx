import React, { useState } from "react";
import type { ForumLayout, ForumTag } from "@entities/community/model/forum";

export function ForumPostFilter({ query, postCount, onQueryChange, tags = [], selectedTagId = "", onTagChange, layout = "list", onLayoutChange, onCreateTag, onUpdateTag, onArchiveTag }: { query: string; postCount: number; onQueryChange: (query: string) => void; tags?: ForumTag[]; selectedTagId?: string; onTagChange?: (tagId: string) => void; layout?: ForumLayout; onLayoutChange?: (layout: ForumLayout) => void; onCreateTag?: (name: string, color?: string) => void; onUpdateTag?: (tagId: string, name: string, color?: string) => void; onArchiveTag?: (tagId: string) => void }) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("");
  const [editingTagId, setEditingTagId] = useState<string>();
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState("");
  function createTag(event: React.FormEvent) {
    event.preventDefault();
    if (!newTagName.trim() || !onCreateTag) return;
    onCreateTag(newTagName.trim(), newTagColor.trim() || undefined);
    setNewTagName("");
    setNewTagColor("");
  }
  return (
    <section aria-label="Forum posts" style={{ display: "grid", gap: 6, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong>Forum posts</strong>
        <span>{postCount} {postCount === 1 ? "post" : "posts"}</span>
      </div>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, opacity: .7 }}>Filter posts</span>
        <input aria-label="Filter forum posts" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search post text" />
      </label>
      {tags.length && onTagChange ? (
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, opacity: .7 }}>Filter by tag</span>
          <select aria-label="Filter forum posts by tag" value={selectedTagId} onChange={(event) => onTagChange(event.target.value)}>
            <option value="">All tags</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
      ) : <small>No forum tags are configured for this channel.</small>}
      {onLayoutChange ? (
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: .7 }}>Layout</span>
          <select aria-label="Forum layout" value={layout} onChange={(event) => onLayoutChange(event.target.value as ForumLayout)}>
            <option value="list">List</option>
            <option value="gallery">Gallery</option>
          </select>
        </label>
      ) : <small>Layout: {layout}</small>}
      {onCreateTag || onUpdateTag || onArchiveTag ? (
        <section aria-label="Forum tag management" style={{ display: "grid", gap: 4 }}>
          <strong style={{ fontSize: 12 }}>Manage tags</strong>
          {tags.map((tag) => editingTagId === tag.id ? (
            <form key={tag.id} onSubmit={(event) => { event.preventDefault(); if (!editingTagName.trim() || !onUpdateTag) return; onUpdateTag(tag.id, editingTagName.trim(), editingTagColor.trim() || undefined); setEditingTagId(undefined); }} style={{ display: "flex", gap: 4 }}>
              <input aria-label={`Edit tag ${tag.name}`} value={editingTagName} onChange={(event) => setEditingTagName(event.target.value)} />
              <input aria-label={`Edit color for ${tag.name}`} value={editingTagColor} onChange={(event) => setEditingTagColor(event.target.value)} placeholder="Color" />
              <button type="submit" disabled={!editingTagName.trim()}>Save</button>
              <button type="button" onClick={() => setEditingTagId(undefined)}>Cancel</button>
            </form>
          ) : (
            <div key={tag.id} style={{ display: "flex", gap: 6, alignItems: "center" }}><span>{tag.name}</span>{onUpdateTag ? <button type="button" onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name); setEditingTagColor(tag.color || ""); }}>Edit</button> : null}{onArchiveTag ? <button type="button" onClick={() => onArchiveTag(tag.id)}>Archive</button> : null}</div>
          ))}
          {onCreateTag ? <form onSubmit={createTag} style={{ display: "flex", gap: 4 }}><input aria-label="New forum tag" value={newTagName} onChange={(event) => setNewTagName(event.target.value)} placeholder="New tag" /><input aria-label="New forum tag color" value={newTagColor} onChange={(event) => setNewTagColor(event.target.value)} placeholder="Color" /><button type="submit" disabled={!newTagName.trim()}>Create tag</button></form> : null}
        </section>
      ) : null}
    </section>
  );
}

export function ForumTagPicker({ tags, selectedTagIds, onChange }: { tags: ForumTag[]; selectedTagIds: string[]; onChange: (tagIds: string[]) => void }) {
  if (!tags.length) return null;
  return (
    <fieldset aria-label="Forum tags" style={{ display: "flex", flexWrap: "wrap", gap: 6, border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontSize: 12, opacity: .7 }}>Tags</legend>
      {tags.map((tag) => {
        const selected = selectedTagIds.includes(tag.id);
        return <label key={tag.id} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={selected} onChange={() => onChange(selected ? selectedTagIds.filter((id) => id !== tag.id) : [...selectedTagIds, tag.id])} />{tag.name}</label>;
      })}
    </fieldset>
  );
}
