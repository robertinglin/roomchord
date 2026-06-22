import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  wrap: {
    position: "absolute",
    bottom: "92px",
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none",
  },
  btn: {
    pointerEvents: "auto",
    height: "32px",
    padding: "0 14px",
    borderRadius: "999px",
    backgroundColor: tokens.accent,
    color: "oklch(0.18 0.05 40)",
    fontWeight: 600,
    fontSize: "13px",
    border: 0,
    cursor: "pointer",
    boxShadow: tokens.elevPanel,
    ":hover": { backgroundColor: tokens.accentHover },
  },
});

/** Floating "New messages" pill that jumps the feed to the bottom. */
export function NewMessagesButton({ onClick }: { onClick: () => void }) {
  return (
    <div {...stylex.props(styles.wrap)}>
      <button {...stylex.props(styles.btn)} type="button" onClick={onClick}>
        New messages
      </button>
    </div>
  );
}

export default NewMessagesButton;
