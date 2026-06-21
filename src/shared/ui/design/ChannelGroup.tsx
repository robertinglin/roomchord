import React from "react";
import * as stylex from "@stylexjs/stylex";
import { GroupHeading } from "./GroupHeading";

const styles = stylex.create({
  group: { marginBottom: "14px" },
});

/** A sidebar section: a GroupHeading + its channel/DM/voice rows. */
export function ChannelGroup({
  label,
  open,
  onAdd,
  children,
}: React.PropsWithChildren<{ label: string; open?: boolean; onAdd?: () => void }>) {
  return (
    <div {...stylex.props(styles.group)}>
      <GroupHeading label={label} open={open} onAdd={onAdd} />
      {children}
    </div>
  );
}

export default ChannelGroup;
