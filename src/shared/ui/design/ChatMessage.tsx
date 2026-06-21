import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar } from "./Avatar";

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: "40px minmax(0, 1fr)",
    gap: "12px",
    padding: "3px 16px",
    ":hover": { backgroundColor: "oklch(0.235 0.008 250 / 0.32)" },
  },
  continued: { paddingTop: "1px", paddingBottom: "1px" },
  avSpacer: { display: "block", width: "40px" },
  head: { display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "2px" },
  name: { fontWeight: 600, fontSize: "15px" },
  nameYou: { color: tokens.accent },
  time: { fontSize: "11px", color: tokens.quiet },
  body: {
    fontSize: "15px",
    lineHeight: 1.45,
    color: tokens.fg,
    wordWrap: "break-word",
  },
  bodyGap: { marginTop: "3px" },
  actions: { opacity: 1, display: "flex", gap: "2px", marginTop: "4px" },
  actionsShow: { opacity: 1 },
  inlineCode: {
    fontFamily: tokens.fontMono,
    fontSize: "13px",
    backgroundColor: tokens.surfaceDeep,
    padding: "1px 5px",
    borderRadius: "4px",
    color: "oklch(0.84 0.02 250)",
  },
});

export function ChatMessage({
  avatar,
  avatarUrl,
  name,
  role,
  time,
  you,
  continued,
  children,
  actions,
}: {
  /** Custom avatar node (overrides avatarUrl). */
  avatar?: React.ReactNode;
  /** Image URL — rendered via <Avatar size="lg">. Ignored if `avatar` set. */
  avatarUrl?: string;
  name?: string;
  role?: React.ReactNode;
  time?: string;
  you?: boolean;
  continued?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div {...stylex.props(styles.row, continued && styles.continued)}>
      {avatar ?? (avatarUrl ? <Avatar src={avatarUrl} size="lg" alt={name || ""} /> : <span {...stylex.props(styles.avSpacer)} />)}
      <div>
        {(name || role || time) && !continued && (
          <div {...stylex.props(styles.head)}>
            {name && <span {...stylex.props(styles.name, you && styles.nameYou)}>{name}</span>}
            {role}
            {time && <span {...stylex.props(styles.time)}>{time}</span>}
          </div>
        )}
        {children}
        {actions && <div {...stylex.props(styles.actions)}>{actions}</div>}
      </div>
    </div>
  );
}

export function MessageBody({
  children,
  gap,
}: React.PropsWithChildren<{ gap?: boolean }>) {
  return <div {...stylex.props(styles.body, gap && styles.bodyGap)}>{children}</div>;
}

export function InlineCode({ children }: React.PropsWithChildren) {
  return <code {...stylex.props(styles.inlineCode)}>{children}</code>;
}

export default ChatMessage;
