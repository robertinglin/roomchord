import React from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  list: { display: "flex", gap: "5px", marginTop: "5px", flexWrap: "wrap" },
});

/** Container for Reaction chips under a message. */
export function Reactions({ children }: React.PropsWithChildren) {
  return <div {...stylex.props(styles.list)}>{children}</div>;
}

export default Reactions;
