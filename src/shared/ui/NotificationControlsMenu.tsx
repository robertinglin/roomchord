import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";
import type { NotificationMode, NotificationMute } from "matterhorn-sdk/browser";

type MenuPosition = { x: number; y: number };
type Submenu = "mute" | "notifications";

export type ChannelContextAction = {
  checked?: boolean;
  danger?: boolean;
  id: string;
  label: string;
  onSelect?: () => void;
  sectionBefore?: boolean;
  unavailableMessage?: string;
};

const MUTE_DURATIONS: Array<{ label: string; milliseconds?: number }> = [
  { label: "For 1 Hour", milliseconds: 60 * 60 * 1000 },
  { label: "For 8 Hours", milliseconds: 8 * 60 * 60 * 1000 },
  { label: "For 24 Hours", milliseconds: 24 * 60 * 60 * 1000 },
  { label: "Until I Turn It Back On" }
];
const NOTIFICATION_MODES: Array<{ label: string; mode: NotificationMode }> = [
  { label: "All Messages", mode: "all" },
  { label: "Only @mentions", mode: "mentions" },
  { label: "Nothing", mode: "none" }
];

const styles = stylex.create({
  target: { display: "block", minWidth: 0, width: "100%" },
  shroud: { position: "fixed", inset: 0, zIndex: 29, backgroundColor: "transparent" },
  menu: {
    position: "fixed",
    zIndex: 30,
    width: "224px",
    display: "grid",
    gap: "2px",
    padding: "8px",
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surfaceDeep,
    boxShadow: tokens.elevPanel,
    maxHeight: "calc(100vh - 16px)",
    overflowY: "auto",
  },
  submenu: { width: "240px" },
  header: {
    padding: "7px 8px",
    color: tokens.quiet,
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  item: {
    minHeight: "38px",
    padding: "0 8px",
    border: 0,
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    backgroundColor: "transparent",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "8px",
    textAlign: "left",
    cursor: "pointer",
    ":hover": { color: tokens.fg, backgroundColor: tokens.panelHover },
    ":focus": { color: tokens.fg, backgroundColor: tokens.panelHover, outline: "none" },
  },
  itemOpen: { color: tokens.fg, backgroundColor: tokens.panelHover },
  sectioned: { marginTop: "4px", borderTop: `1px solid ${tokens.borderSoft}` },
  danger: { color: tokens.danger },
  itemCopy: { minWidth: 0, display: "grid", gap: "2px" },
  label: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px", fontWeight: 700 },
  meta: { minWidth: 0, color: tokens.quiet, fontSize: "11px", fontWeight: 600 },
  arrow: { color: tokens.quiet, fontSize: "18px", lineHeight: 1 },
  radio: {
    width: "18px",
    height: "18px",
    border: `1px solid ${tokens.quiet}`,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
  },
  radioSelected: { borderColor: tokens.accent, backgroundColor: tokens.accent },
  radioDot: { width: "6px", height: "6px", borderRadius: "50%", backgroundColor: tokens.surfaceDeep },
  checkbox: { width: "17px", height: "17px", accentColor: tokens.accent },
  notice: {
    margin: "4px 4px 0",
    padding: "8px",
    borderTop: `1px solid ${tokens.borderSoft}`,
    color: tokens.quiet,
    fontSize: "11px",
    lineHeight: 1.35,
  },
});

export function NotificationControlsMenu({
  afterActions = [],
  beforeActions = [],
  children,
  inheritLabel,
  label,
  middleActions = [],
  muted = false,
  notificationMode = "inherit",
  notificationSummary,
  onCopyLink,
  onMuteChange,
  onNotificationModeChange,
  preferenceUnavailableMessage
}: {
  afterActions?: ChannelContextAction[];
  beforeActions?: ChannelContextAction[];
  children: React.ReactNode;
  inheritLabel: string;
  label: string;
  middleActions?: ChannelContextAction[];
  muted?: boolean;
  notificationMode?: NotificationMode;
  notificationSummary?: string;
  onCopyLink?: () => void;
  onMuteChange?: (mute: NotificationMute) => void | Promise<void>;
  onNotificationModeChange?: (mode: NotificationMode) => void | Promise<void>;
  preferenceUnavailableMessage: string;
}) {
  const [position, setPosition] = useState<MenuPosition>();
  const [submenu, setSubmenu] = useState<Submenu>();
  const [notice, setNotice] = useState("");

  function closeMenu() {
    setPosition(undefined);
    setSubmenu(undefined);
    setNotice("");
  }

  function stopMenuEvent(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  function showMuteMenu() {
    setSubmenu("mute");
    setNotice("");
  }

  function showNotificationMenu() {
    setSubmenu("notifications");
    setNotice("");
  }

  useEffect(() => {
    if (!position) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [position]);

  function openMenu(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSubmenu(undefined);
    setNotice("");
    const itemCount = beforeActions.length + middleActions.length + afterActions.length + (onCopyLink ? 1 : 0) + 3;
    const estimatedHeight = Math.min(window.innerHeight - 16, 24 + itemCount * 40);
    setPosition({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 240)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - estimatedHeight - 8))
    });
  }

  async function runPreferenceAction(action?: () => void | Promise<void>) {
    if (!action) {
      setNotice(preferenceUnavailableMessage);
      return;
    }
    setNotice("Saving preference…");
    try {
      await action();
      closeMenu();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "The notification preference could not be saved.");
    }
  }

  function selectAction(action: ChannelContextAction) {
    if (!action.onSelect) {
      setNotice(action.unavailableMessage || preferenceUnavailableMessage);
      return;
    }
    action.onSelect();
    closeMenu();
  }

  function copyLink() {
    onCopyLink?.();
    setPosition(undefined);
  }

  const submenuX = position
    ? position.x + 472 <= window.innerWidth ? position.x + 228 : Math.max(8, position.x - 244)
    : 0;

  return (
    <div {...stylex.props(styles.target)} onContextMenu={openMenu}>
      {children}
      {position ? createPortal(
        <>
          <div {...stylex.props(styles.shroud)} role="presentation" onMouseDown={closeMenu} />
          <div
            {...stylex.props(styles.menu)}
            role="menu"
            aria-label={`${label} actions`}
            style={{ left: position.x, top: position.y }}
            onMouseDown={stopMenuEvent}
            onClick={stopMenuEvent}
          >
            <div {...stylex.props(styles.header)}>{label}</div>
            {beforeActions.map((action) => (
              <button
                {...stylex.props(styles.item, action.sectionBefore && styles.sectioned, action.danger && styles.danger)}
                key={action.id}
                type="button"
                role={action.checked === undefined ? "menuitem" : "menuitemcheckbox"}
                aria-checked={action.checked}
                onClick={() => selectAction(action)}
              >
                <span {...stylex.props(styles.label)}>{action.label}</span>
                {action.checked !== undefined ? <input {...stylex.props(styles.checkbox)} tabIndex={-1} type="checkbox" checked={action.checked} readOnly aria-hidden="true" /> : null}
              </button>
            ))}
            {onCopyLink ? (
              <button {...stylex.props(styles.item)} type="button" role="menuitem" onClick={copyLink}>
                <span {...stylex.props(styles.label)}>Copy Link</span>
              </button>
            ) : null}
            {middleActions.map((action) => (
              <button
                {...stylex.props(styles.item, action.sectionBefore && styles.sectioned, action.danger && styles.danger)}
                key={action.id}
                type="button"
                role={action.checked === undefined ? "menuitem" : "menuitemcheckbox"}
                aria-checked={action.checked}
                onClick={() => selectAction(action)}
              >
                <span {...stylex.props(styles.label)}>{action.label}</span>
                {action.checked !== undefined ? <input {...stylex.props(styles.checkbox)} tabIndex={-1} type="checkbox" checked={action.checked} readOnly aria-hidden="true" /> : null}
              </button>
            ))}
            <button
              {...stylex.props(styles.item, styles.sectioned, submenu === "mute" && styles.itemOpen)}
              type="button"
              role="menuitem"
              aria-haspopup={muted ? undefined : "menu"}
              aria-expanded={muted ? undefined : submenu === "mute"}
              onClick={muted ? () => { void runPreferenceAction(onMuteChange ? () => onMuteChange(null) : undefined); } : showMuteMenu}
              onMouseEnter={muted ? undefined : showMuteMenu}
            >
              <span {...stylex.props(styles.label)}>{muted ? `Unmute ${label}` : `Mute ${label}`}</span>
              {muted ? null : <span {...stylex.props(styles.arrow)} aria-hidden="true">›</span>}
            </button>
            <button
              {...stylex.props(styles.item, submenu === "notifications" && styles.itemOpen)}
              type="button"
              role="menuitem"
              aria-label="Notification Settings"
              aria-haspopup="menu"
              aria-expanded={submenu === "notifications"}
              onClick={showNotificationMenu}
              onMouseEnter={showNotificationMenu}
            >
              <span {...stylex.props(styles.itemCopy)}>
                <span {...stylex.props(styles.label)}>Notification Settings</span>
                <small {...stylex.props(styles.meta)}>{notificationSummary || inheritLabel}</small>
              </span>
              <span {...stylex.props(styles.arrow)} aria-hidden="true">›</span>
            </button>
            {afterActions.map((action) => (
              <button
                {...stylex.props(styles.item, action.sectionBefore && styles.sectioned, action.danger && styles.danger)}
                key={action.id}
                type="button"
                role={action.checked === undefined ? "menuitem" : "menuitemcheckbox"}
                aria-checked={action.checked}
                onClick={() => selectAction(action)}
              >
                <span {...stylex.props(styles.label)}>{action.label}</span>
                {action.checked !== undefined ? <input {...stylex.props(styles.checkbox)} tabIndex={-1} type="checkbox" checked={action.checked} readOnly aria-hidden="true" /> : null}
              </button>
            ))}
            {notice ? <div {...stylex.props(styles.notice)} role="status">{notice}</div> : null}
          </div>

          {submenu ? (
            <div
              {...stylex.props(styles.menu, styles.submenu)}
              role="menu"
              aria-label={submenu === "mute" ? `Mute ${label}` : `${label} notification settings`}
              style={{ left: submenuX, top: position.y + (submenu === "mute" ? 56 : 96) }}
              onMouseDown={stopMenuEvent}
              onClick={stopMenuEvent}
            >
              {submenu === "mute" ? MUTE_DURATIONS.map((duration) => (
                <button
                  {...stylex.props(styles.item)}
                  key={duration.label}
                  type="button"
                  role="menuitem"
                  onClick={() => { void runPreferenceAction(onMuteChange ? () => onMuteChange(duration.milliseconds
                    ? { kind: "until", expiresAt: Date.now() + duration.milliseconds }
                    : { kind: "indefinite" }) : undefined); }}
                >
                  <span {...stylex.props(styles.label)}>{duration.label}</span>
                </button>
              )) : [{ label: inheritLabel, mode: "inherit" as const }, ...NOTIFICATION_MODES].map((option) => (
                <button
                  {...stylex.props(styles.item)}
                  key={option.mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={notificationMode === option.mode}
                  onClick={() => { void runPreferenceAction(onNotificationModeChange ? () => onNotificationModeChange(option.mode) : undefined); }}
                >
                  <span {...stylex.props(styles.label)}>{option.label}</span>
                  <span {...stylex.props(styles.radio, notificationMode === option.mode && styles.radioSelected)} aria-hidden="true">
                    {notificationMode === option.mode ? <span {...stylex.props(styles.radioDot)} /> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </>,
        document.body
      ) : null}
    </div>
  );
}
