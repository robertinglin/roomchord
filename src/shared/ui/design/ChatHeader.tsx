import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  head: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px 16px",
    borderBottom: "1px solid oklch(0.11 0.006 250 / 0.72)",
    flex: "0 0 auto",
    minHeight: "56px",
    "@media (max-width: 599px)": {
      minHeight: "52px",
      padding: "10px 12px",
    },
  },
  chanIcon: { width: "22px", height: "22px", color: tokens.muted, flex: "0 0 auto", display: "inline-flex" },
  title: {
    margin: 0,
    fontFamily: tokens.fontDisplay,
    fontSize: "16px",
    fontWeight: 700,
  },
  topic: {
    fontSize: "13px",
    color: tokens.quiet,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    "::before": { content: '"│"', margin: "0 8px", color: tokens.border },
    "@media (max-width: 599px)": {
      "::before": { content: '""', margin: 0 },
    },
  },
  sep: { width: "1px", height: "26px", backgroundColor: tokens.border, margin: "0 2px", flex: "0 0 auto" },
  members: {
    display: "flex",
    alignItems: "center",
    marginLeft: "auto",
    "@media (max-width: 599px)": {
      display: "none",
    },
  },
  mobileToggle: {
    display: "none",
    "@media (max-width: 599px)": {
      display: "grid",
    },
  },
  av: {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    objectFit: "cover",
    border: `2.5px solid ${tokens.bg}`,
    marginLeft: "-8px",
  },
});

export function ChatHeader({
  icon,
  title,
  topic,
  actions,
  memberAvatars,
  mobileToggle,
}: {
  icon?: React.ReactNode;
  title: string;
  topic?: string;
  actions?: React.ReactNode;
  memberAvatars?: string[];
  mobileToggle?: React.ReactNode;
}) {
  return (
    <header {...stylex.props(styles.head)}>
      {mobileToggle ? <span {...stylex.props(styles.mobileToggle)}>{mobileToggle}</span> : null}
      {icon && <span {...stylex.props(styles.chanIcon)}>{icon}</span>}
      <h2 {...stylex.props(styles.title)}>{title}</h2>
      {topic && <span {...stylex.props(styles.topic)}>{topic}</span>}
      {actions && (
        <>
          <span {...stylex.props(styles.sep)} />
          {actions}
        </>
      )}
      {memberAvatars && memberAvatars.length > 0 && (
        <div {...stylex.props(styles.members)}>
          {memberAvatars.map((src, i) => (
            <img key={i} {...stylex.props(styles.av)} src={src} alt="" />
          ))}
        </div>
      )}
    </header>
  );
}

export default ChatHeader;
