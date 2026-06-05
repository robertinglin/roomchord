import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type MemberContextMenuAction = {
  disabled?: boolean;
  id: string;
  label: string;
  onSelect: () => void;
};

type MenuPosition = { x: number; y: number };

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
  const actions = useMemo(() => {
    const items = additionalActions.filter((action) => !action.disabled);
    if (!memberId || memberId === currentUserId || !onDirectMessage) return items;
    return [
      {
        id: "send-dm",
        label: "Send DM",
        onSelect: () => onDirectMessage(memberId)
      },
      ...items
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
    if (!actions.length) return;
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 190;
    const menuHeight = 42 + actions.length * 36;
    setPosition({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))
    });
  }

  function selectAction(action: MemberContextMenuAction) {
    setPosition(undefined);
    action.onSelect();
  }

  return (
    <span className="member-context-target" onContextMenu={openMenu}>
      {children}
      {position ? createPortal(
        <div
          className="member-context-menu"
          role="menu"
          style={{ left: position.x, top: position.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {actions.map((action) => (
            <button type="button" role="menuitem" onClick={() => selectAction(action)} key={action.id}>
              {action.label}
            </button>
          ))}
          <span>{memberName}</span>
        </div>,
        document.body
      ) : null}
    </span>
  );
}
