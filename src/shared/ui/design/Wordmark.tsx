import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  tile: {
    width: "32px",
    height: "32px",
    display: "grid",
    placeItems: "center",
    color: tokens.accent,
    flex: "0 0 auto",
  },
});

/** Mosh squiggle logo. The svg is 24x18 (not the icon 24x24), so it is inlined. */
export function Wordmark() {
  return (
    <div {...stylex.props(styles.tile)}>
      <svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
        <path
          d="M2 9c2.5 0 2.5-6 5-6s2.5 12 5 12 2.5-6 5-6 2.5 0 5 0"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default Wordmark;
