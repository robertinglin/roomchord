import React, { useMemo, useState } from "react";
import type { Actor, ChatState } from "@entities/chat/model/types";
import { assignedRoleIds, primaryRoleFor, roleChipFor } from "@entities/chat/model/roles";
import { Avatar, RoleChip } from "@shared/ui/design";
import type { ManagementTab } from "@entities/chat/model/managementTypes";
import { panel, field, stats, row, button, layout } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

export function ManageOverviewTab({
  actor,
  state,
  roomName,
  channelCount,
  memberCount,
  pendingAdminCount,
  roleCount,
  roomCount,
  onSelectTab
}: {
  actor: Actor;
  state: ChatState;
  roomName: string;
  channelCount: number;
  memberCount: number;
  pendingAdminCount: number;
  roleCount: number;
  roomCount: number;
  onSelectTab: (tab: ManagementTab) => void;
}) {
  const [draftName, setDraftName] = useState(roomName);
  const [draftTopic, setDraftTopic] = useState("");

  const chip = useMemo(() => {
    const roleIds = assignedRoleIds(actor.memberId, actor.role, state);
    const primary = primaryRoleFor(roleIds, actor.role, state);
    return roleChipFor(primary, state);
  }, [actor, state]);

  const actorAvatar = actor.avatar || actor.avatarUrl || actor.profileImageUrl;

  return (
    <div {...stylex.props(layout.section)}>
      {/* Stats grid */}
      <div {...stylex.props(stats.grid)}>
        <button type="button" {...stylex.props(stats.stat)} onClick={() => onSelectTab("channels")}>
          <span {...stylex.props(stats.num)}>{channelCount}</span>
          <span {...stylex.props(stats.lbl)}>Text channel{channelCount === 1 ? "" : "s"}</span>
        </button>
        <button type="button" {...stylex.props(stats.stat)} onClick={() => onSelectTab("voice")}>
          <span {...stylex.props(stats.num)}>{roomCount}</span>
          <span {...stylex.props(stats.lbl)}>Voice channel{roomCount === 1 ? "" : "s"}</span>
        </button>
        <button type="button" {...stylex.props(stats.stat)} onClick={() => onSelectTab("roles")}>
          <span {...stylex.props(stats.num)}>{roleCount}</span>
          <span {...stylex.props(stats.lbl)}>Roles</span>
        </button>
        <button type="button" {...stylex.props(stats.stat)} onClick={() => onSelectTab("members")}>
          <span {...stylex.props(stats.num, stats.numAccent)}>{memberCount}</span>
          <span {...stylex.props(stats.lbl)}>Members</span>
        </button>
      </div>

      {/* Room identity — editable but inert until a room-update action exists */}
      <section {...stylex.props(panel.panel, panel.panelLast)}>
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Room identity</h3>
        </header>
        <div {...stylex.props(panel.body)}>
          <label {...stylex.props(field.field)}>
            <span {...stylex.props(field.label)}>Room name</span>
            <input
              aria-label="Room name"
              value={draftName}
              maxLength={40}
              onChange={(event) => setDraftName(event.target.value)}
              {...stylex.props(field.input)}
            />
          </label>
          <label {...stylex.props(field.field, field.fieldLast)}>
            <span {...stylex.props(field.label)}>Topic</span>
            <input
              aria-label="Room topic"
              value={draftTopic}
              placeholder="What is this room about?"
              onChange={(event) => setDraftTopic(event.target.value)}
              {...stylex.props(field.input)}
            />
          </label>
          <div {...stylex.props(button.actions, button.actionsEnd)}>
            <button
              type="button"
              onClick={() => { setDraftName(roomName); setDraftTopic(""); }}
              {...stylex.props(button.btn, button.ghost, button.sm)}
            >
              Discard
            </button>
            <button
              type="button"
              disabled
              title="Room renaming isn't available yet"
              aria-disabled="true"
              {...stylex.props(button.btn, button.primary, button.sm, button.disabled)}
            >
              Save changes
            </button>
          </div>
        </div>
      </section>

      {/* Your membership */}
      <section {...stylex.props(panel.panel, panel.panelLast)}>
        <header {...stylex.props(panel.head)}>
          <h3 {...stylex.props(panel.h3)}>Your membership</h3>
        </header>
        <div {...stylex.props(panel.bodyFlush)}>
          <div {...stylex.props(row.row)}>
            <span {...stylex.props(row.rowLead)}>
              <Avatar src={actorAvatar} name={actor.displayName} size="md" status="on" alt={actor.displayName || "you"} />
            </span>
            <span {...stylex.props(row.rowMain)}>
              <span {...stylex.props(row.rowTitle)}>{actor.displayName || "you"}</span>
            </span>
            {chip ? (
              <span {...stylex.props(row.rowEnd)}>
                <RoleChip label={chip.label} color={chip.color} />
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {pendingAdminCount > 0 ? (
        <section {...stylex.props(panel.panel, panel.panelLast)}>
          <header {...stylex.props(panel.head)}>
            <h3 {...stylex.props(panel.h3)}>Admin queue</h3>
            <span {...stylex.props(panel.meta)}>{pendingAdminCount} pending</span>
          </header>
          <div {...stylex.props(panel.bodyFlush)}>
            <div
              {...stylex.props(row.row, row.tap)}
              role="button"
              tabIndex={0}
              onClick={() => onSelectTab("admin")}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectTab("admin"); } }}
            >
              <span {...stylex.props(row.rowMain)}>
                <span {...stylex.props(row.rowTitle)}>{pendingAdminCount} item{pendingAdminCount === 1 ? "" : "s"} awaiting review</span>
                <span {...stylex.props(row.rowSub)}>Open the admin tab to action them.</span>
              </span>
              <span {...stylex.props(row.rowEnd)}>
                <button type="button" {...stylex.props(button.btn, button.ghost, button.sm)}>Review</button>
              </span>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
