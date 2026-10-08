import React, { useEffect, useId, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { ChannelCategory, ChannelVisibility, RoleDefinition } from "@entities/chat/model/types";
import { orderedChannelCategories } from "@entities/chat/model/channelGroups";
import { CloseGlyph, HashGlyph, PlusGlyph } from "@shared/ui/design";
import { tokens } from "../../../shared/ui/theme.stylex";

type MemberOption = { id: string; name: string };
type DialogKind = "category" | "channel" | "voice";

export type ChannelCreateInput = {
  name: string;
  topic?: string;
  categoryId?: string;
  visibility?: ChannelVisibility;
  allowedRoleIds?: string[];
  allowedMemberIds?: string[];
};

export type CategoryCreateInput = {
  name: string;
  position?: number;
  visibility?: ChannelVisibility;
  allowedRoleIds?: string[];
  allowedMemberIds?: string[];
};

const styles = stylex.create({
  scrim: { position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: "20px", backgroundColor: "rgb(4 6 9 / 0.76)" },
  dialog: { width: "min(560px, calc(100vw - 32px))", maxHeight: "min(720px, calc(100vh - 32px))", overflow: "auto", border: `1px solid ${tokens.border}`, borderRadius: "14px", color: tokens.fg, backgroundColor: tokens.surface, boxShadow: tokens.elevPanel },
  head: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "20px 20px 14px", borderBottom: `1px solid ${tokens.borderSoft}` },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { margin: 0, fontFamily: tokens.fontDisplay, fontSize: "18px", lineHeight: 1.2 },
  description: { margin: "5px 0 0", color: tokens.quiet, fontSize: "13px" },
  icon: { width: "32px", height: "32px", display: "grid", placeItems: "center", borderRadius: "9px", color: tokens.accent, backgroundColor: tokens.accentSoft },
  close: { width: "30px", height: "30px", display: "grid", placeItems: "center", border: 0, borderRadius: tokens.radiusItem, color: tokens.muted, backgroundColor: "transparent", cursor: "pointer", ":hover": { color: tokens.fg, backgroundColor: tokens.panelHover } },
  body: { display: "grid", gap: "14px", padding: "18px 20px 20px" },
  field: { display: "grid", gap: "6px" },
  label: { color: tokens.quiet, fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  input: { width: "100%", boxSizing: "border-box", height: "38px", padding: "0 11px", border: `1px solid ${tokens.border}`, borderRadius: tokens.radiusItem, color: tokens.fg, backgroundColor: tokens.fieldBg, outline: "none", ":focus": { borderColor: tokens.accent } },
  select: { width: "100%", boxSizing: "border-box", height: "38px", padding: "0 9px", border: `1px solid ${tokens.border}`, borderRadius: tokens.radiusItem, color: tokens.fg, backgroundColor: tokens.fieldBg, outline: "none" },
  access: { display: "grid", gap: "8px", padding: "12px", border: `1px solid ${tokens.borderSoft}`, borderRadius: tokens.radiusItem, backgroundColor: tokens.surfaceDeep },
  accessTitle: { margin: 0, color: tokens.muted, fontSize: "12px", fontWeight: 650 },
  options: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px" },
  option: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0, padding: "7px 8px", borderRadius: tokens.radiusItem, color: tokens.muted, fontSize: "13px", cursor: "pointer", ":hover": { color: tokens.fg, backgroundColor: tokens.panelHover } },
  optionText: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  hint: { margin: 0, color: tokens.quiet, fontSize: "12px", lineHeight: 1.45 },
  foot: { display: "flex", justifyContent: "flex-end", gap: "8px", padding: "14px 20px", borderTop: `1px solid ${tokens.borderSoft}` },
  button: { minHeight: "36px", padding: "0 14px", border: 0, borderRadius: tokens.radiusItem, fontSize: "13px", fontWeight: 650, cursor: "pointer" },
  cancel: { color: tokens.muted, backgroundColor: tokens.panelHover, ":hover": { color: tokens.fg } },
  submit: { display: "inline-flex", alignItems: "center", gap: "7px", color: tokens.accentInk, backgroundColor: tokens.accent, ":hover": { backgroundColor: tokens.accentHover }, ":disabled": { color: tokens.quiet, backgroundColor: tokens.fieldBg, cursor: "not-allowed" } },
});

function activeRoleDefinitions(roles: RoleDefinition[]) {
  return roles.filter((role) => !role.archivedAt).sort((left, right) => String(left.name || left.id).localeCompare(String(right.name || right.id)));
}

export function ChannelCreateDialog({
  kind,
  open,
  categories = [],
  defaultCategoryId,
  roles = [],
  members = [],
  onClose,
  onCreateCategory,
  onCreateChannel,
  onCreateVoice,
}: {
  kind: DialogKind;
  open: boolean;
  categories?: ChannelCategory[];
  defaultCategoryId?: string;
  roles?: RoleDefinition[];
  members?: MemberOption[];
  onClose: () => void;
  onCreateCategory?: (input: CategoryCreateInput) => void | Promise<void>;
  onCreateChannel?: (input: ChannelCreateInput) => void | Promise<void>;
  onCreateVoice?: (input: { name: string; categoryId: string }) => void | Promise<void>;
}) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId || "");
  const [visibility, setVisibility] = useState<ChannelVisibility>("public");
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>([]);
  const [allowedMemberIds, setAllowedMemberIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTopic("");
    setCategoryId(defaultCategoryId || "");
    setVisibility("public");
    setAllowedRoleIds([]);
    setAllowedMemberIds([]);
    setPending(false);
  }, [defaultCategoryId, kind, open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  const isCategory = kind === "category";
  const isVoice = kind === "voice";
  const cleanName = name.trim().replace(/^#/, "");
  const roleOptions = activeRoleDefinitions(roles);
  const sortedCategories = orderedChannelCategories(categories);

  function toggle(values: string[], value: string, setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!cleanName || pending) return;
    setPending(true);
    try {
      if (isCategory) await onCreateCategory?.({
        name: cleanName,
        visibility,
        allowedRoleIds: visibility === "private" ? allowedRoleIds : [],
        allowedMemberIds: visibility === "private" ? allowedMemberIds : [],
      });
      else if (isVoice) await onCreateVoice?.({ name: cleanName, categoryId });
      else await onCreateChannel?.({
        name: cleanName,
        topic: topic.trim() || undefined,
        categoryId: categoryId || undefined,
        visibility,
        allowedRoleIds: visibility === "private" ? allowedRoleIds : [],
        allowedMemberIds: visibility === "private" ? allowedMemberIds : [],
      });
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <div {...stylex.props(styles.scrim)} onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} {...stylex.props(styles.dialog)} onMouseDown={(event) => event.stopPropagation()}>
        <header {...stylex.props(styles.head)}>
          <span {...stylex.props(styles.icon)}><HashGlyph size={18} /></span>
          <span {...stylex.props(styles.titleWrap)}>
            <h2 id={titleId} {...stylex.props(styles.title)}>{isCategory ? "Create category" : isVoice ? "Create voice channel" : "Create channel"}</h2>
            <p {...stylex.props(styles.description)}>{isCategory ? "Organize channels into a new section." : isVoice ? "Add an audio room to a category." : "Add a text channel with its topic and access rules."}</p>
          </span>
          <button type="button" aria-label="Close dialog" title="Close" {...stylex.props(styles.close)} onClick={onClose}><CloseGlyph size={16} /></button>
        </header>
        <form onSubmit={submit}>
          <div {...stylex.props(styles.body)}>
            <label {...stylex.props(styles.field)}>
              <span {...stylex.props(styles.label)}>{isCategory ? "Category name" : isVoice ? "Voice channel name" : "Channel name"}</span>
              <input autoFocus aria-label={isCategory ? "Category name" : isVoice ? "Voice channel name" : "Channel name"} {...stylex.props(styles.input)} value={name} onChange={(event) => setName(event.target.value)} placeholder={isCategory ? "category-name" : isVoice ? "Design review" : "channel-name"} />
            </label>
            {isCategory ? <>
              <label {...stylex.props(styles.field)}><span {...stylex.props(styles.label)}>Visibility</span><select aria-label="Category visibility" {...stylex.props(styles.select)} value={visibility} onChange={(event) => setVisibility(event.target.value as ChannelVisibility)}><option value="public">Public — everyone can view</option><option value="private">Private — selected roles and users</option></select></label>
              {visibility === "private" ? <section {...stylex.props(styles.access)} aria-label="Private category access">
                <h3 {...stylex.props(styles.accessTitle)}>Who can view channels in this category?</h3>
                {roleOptions.length ? <div><span {...stylex.props(styles.label)}>Roles</span><div {...stylex.props(styles.options)}>{roleOptions.map((role) => <label key={role.id} {...stylex.props(styles.option)}><input type="checkbox" checked={allowedRoleIds.includes(role.id)} onChange={() => toggle(allowedRoleIds, role.id, setAllowedRoleIds)} /><span {...stylex.props(styles.optionText)}>{role.name}</span></label>)}</div></div> : null}
                {members.length ? <div><span {...stylex.props(styles.label)}>Users</span><div {...stylex.props(styles.options)}>{members.map((member) => <label key={member.id} {...stylex.props(styles.option)}><input type="checkbox" checked={allowedMemberIds.includes(member.id)} onChange={() => toggle(allowedMemberIds, member.id, setAllowedMemberIds)} /><span {...stylex.props(styles.optionText)}>{member.name}</span></label>)}</div></div> : null}
                {!roleOptions.length && !members.length ? <p {...stylex.props(styles.hint)}>No role or user options are available yet. Administrators retain access automatically.</p> : <p {...stylex.props(styles.hint)}>Administrators retain access automatically.</p>}
              </section> : null}
            </> : (
              <>
                {!isVoice ? <label {...stylex.props(styles.field)}><span {...stylex.props(styles.label)}>Topic <small>(optional)</small></span><input aria-label="Channel topic" {...stylex.props(styles.input)} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="What's this channel for?" /></label> : null}
                {sortedCategories.length ? <label {...stylex.props(styles.field)}><span {...stylex.props(styles.label)}>Category</span><select aria-label="Channel category" {...stylex.props(styles.select)} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{sortedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label> : null}
                {!isVoice ? <label {...stylex.props(styles.field)}><span {...stylex.props(styles.label)}>Visibility</span><select aria-label="Channel visibility" {...stylex.props(styles.select)} value={visibility} onChange={(event) => setVisibility(event.target.value as ChannelVisibility)}><option value="public">Public — everyone can view</option><option value="private">Private — selected roles and users</option></select></label> : null}
                {!isVoice && visibility === "private" ? <section {...stylex.props(styles.access)} aria-label="Private channel access">
                  <h3 {...stylex.props(styles.accessTitle)}>Who can view this channel?</h3>
                  {roleOptions.length ? <div><span {...stylex.props(styles.label)}>Roles</span><div {...stylex.props(styles.options)}>{roleOptions.map((role) => <label key={role.id} {...stylex.props(styles.option)}><input type="checkbox" checked={allowedRoleIds.includes(role.id)} onChange={() => toggle(allowedRoleIds, role.id, setAllowedRoleIds)} /><span {...stylex.props(styles.optionText)}>{role.name}</span></label>)}</div></div> : null}
                  {members.length ? <div><span {...stylex.props(styles.label)}>Users</span><div {...stylex.props(styles.options)}>{members.map((member) => <label key={member.id} {...stylex.props(styles.option)}><input type="checkbox" checked={allowedMemberIds.includes(member.id)} onChange={() => toggle(allowedMemberIds, member.id, setAllowedMemberIds)} /><span {...stylex.props(styles.optionText)}>{member.name}</span></label>)}</div></div> : null}
                  {!roleOptions.length && !members.length ? <p {...stylex.props(styles.hint)}>No role or user options are available yet. Administrators retain access automatically.</p> : <p {...stylex.props(styles.hint)}>Administrators retain access automatically.</p>}
                </section> : null}
              </>
            )}
          </div>
          <footer {...stylex.props(styles.foot)}><button type="button" {...stylex.props(styles.button, styles.cancel)} onClick={onClose}>Cancel</button><button type="submit" {...stylex.props(styles.button, styles.submit)} disabled={!cleanName || pending || isVoice && !categoryId}><PlusGlyph size={15} />{pending ? "Creating…" : isCategory ? "Create category" : isVoice ? "Create voice channel" : "Create channel"}</button></footer>
        </form>
      </div>
    </div>
  );
}

export default ChannelCreateDialog;
