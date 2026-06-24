import React, { useEffect, useMemo, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { createPortal } from "react-dom";

export type MemberContextMenuAction = {
  disabled?: boolean;
  id: string;
  label: string;
  onSelect: () => void;
};

type ContextMenuItem = {
  ariaLabel?: string;
  disabled?: boolean;
  icon?: string;
  id: string;
  label: string;
  meta?: string;
  onSelect?: () => void;
  sectionBefore?: boolean;
  variant?: "danger";
};

type MenuPosition = { x: number; y: number };

const styles = stylex.create({
  target: {
    display: "block",
    minWidth: 0,
    width: "100%",
    overflow: "visible",
  },
});

function noop() {}

export function MemberContextMenu({
  additionalActions = [],
  children,
  currentUserId,
  memberId,
  memberName,
  onDirectMessage
}: {
  additionalActions?: MemberContextMenuAction[];
  children: React.ReactNode;
  currentUserId?: string;
  memberId?: string;
  memberName: string;
  onDirectMessage?: (memberId: string) => void;
}) {
  const [position, setPosition] = useState<MenuPosition | undefined>();
  const menuItems = useMemo<ContextMenuItem[]>(() => {
    const activeActions = additionalActions.filter((action) => !action.disabled);
    const roleAction = activeActions.find((action) => action.id === "set-roles");
    const canMessage = Boolean(memberId && memberId !== currentUserId && onDirectMessage);
    const canManageRoles = Boolean(roleAction);
    const actionItems = activeActions.map((action, index) => ({
      ariaLabel: action.label,
      id: action.id,
      label: action.label,
      onSelect: action.onSelect,
      sectionBefore: index === 0
    }));
    return [
      { id: "profile", label: "Profile", onSelect: noop },
      { id: "mention", label: "Mention", onSelect: noop },
      {
        ariaLabel: canMessage ? "Send DM" : undefined,
        disabled: !canMessage,
        id: "message",
        label: "Message",
        onSelect: canMessage && memberId ? () => onDirectMessage?.(memberId) : undefined
      },
      { disabled: true, id: "start-call", label: "Start a Call" },
      { disabled: true, id: "edit-note", label: "Edit Note", meta: "Only visible to you" },
      { disabled: true, id: "nickname", label: "Add Friend Nickname" },
      ...actionItems,
      { disabled: true, icon: "›", id: "apps", label: "Apps", sectionBefore: actionItems.length === 0 },
      { disabled: true, icon: "›", id: "invite", label: "Invite to Server" },
      { disabled: true, id: "remove-friend", label: "Remove Friend" },
      { disabled: true, id: "ignore", label: "Ignore" },
      { disabled: true, id: "block", label: "Block", variant: "danger" },
      { disabled: !canManageRoles, icon: "›", id: "roles", label: "Roles", onSelect: roleAction?.onSelect, sectionBefore: true },
      { disabled: !canManageRoles, id: "mod-view", label: "Open in Mod View", onSelect: roleAction?.onSelect, sectionBefore: true }
    ];
  }, [additionalActions, currentUserId, memberId, onDirectMessage]);

  useEffect(() => {
    if (!position) return undefined;
    const close = () => setPosition(undefined);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [position]);

  function openMenu(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 224;
    const menuHeight = 66 + menuItems.length * 36;
    setPosition({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))
    });
  }

  function selectItem(item: ContextMenuItem) {
    if (item.disabled || !item.onSelect) return;
    setPosition(undefined);
    item.onSelect();
  }

  return (
    <span {...stylex.props(styles.target)} onContextMenu={openMenu}>
      {children}
      {position ? createPortal(
        <>
          <div className="context-menu-shroud" role="presentation" onMouseDown={() => setPosition(undefined)} />
          <div
            className="member-context-menu rich-context-menu"
            role="menu"
            style={{ left: position.x, top: position.y }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="context-menu-header">{memberName}</div>
            {menuItems.map((item) => (
              <button
                aria-label={item.ariaLabel}
                className={`${item.sectionBefore ? "sectioned" : ""}${item.variant === "danger" ? " danger" : ""}`}
                disabled={item.disabled}
                type="button"
                role="menuitem"
                onClick={() => selectItem(item)}
                key={item.id}
              >
                <span>
                  <strong>{item.label}</strong>
                  {item.meta ? <small>{item.meta}</small> : null}
                </span>
                {item.icon ? <span className="context-menu-icon">{item.icon}</span> : null}
              </button>
            ))}
          </div>
        </>,
        document.body
      ) : null}
    </span>
  );
}
