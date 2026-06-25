import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "3px 9px 3px 8px",
    borderRadius: "999px",
    backgroundColor: tokens.fieldBg,
    color: tokens.muted,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    flex: "0 0 auto",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "999px",
    flex: "0 0 auto",
  },
});

/**
 * Coloured role "chip": a small pill with a coloured dot + uppercase label,
 * matching the `.rchip` vocabulary from settings.html.
 *
 * Pass an explicit `color` (hex/oklch) or leave it to resolve from the
 * `roleOwner/Admin/Mod/Member/Guest` tokens by role id.
 */
export function RoleChip({
  label,
  color,
}: {
  label: string;
  color?: string;
}) {
  return (
    <span {...stylex.props(styles.chip)}>
      <span {...stylex.props(styles.dot)} style={color ? { backgroundColor: color } : undefined} />
      {label}
    </span>
  );
}

export default RoleChip;
