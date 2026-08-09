import React from "react";
import * as stylex from "@stylexjs/stylex";
import { GroupHeading } from "./GroupHeading";

const styles = stylex.create({
  group: { marginBottom: "14px" },
});

/**
 * A sidebar section: a GroupHeading + its channel/DM/voice rows.
 * `onToggle` makes the heading collapse/expand the group; `onAdd` shows the
 * create-channel button.
 */
export function ChannelGroup({
  addLabel,
  label,
  open,
  onAdd,
  onToggle,
  children,
}: React.PropsWithChildren<{
  addLabel?: string;
  label: string;
  open?: boolean;
  onAdd?: () => void;
  onToggle?: () => void;
}>) {
  return (
    <div {...stylex.props(styles.group)}>
      <GroupHeading addLabel={addLabel} label={label} open={open} onAdd={onAdd} onToggle={onToggle} />
      {children}
    </div>
  );
}

export default ChannelGroup;
