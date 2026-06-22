import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px",
  },
  field: { display: "flex", flexDirection: "column", gap: "3px" },
  label: {
    fontSize: "11px",
    color: tokens.quiet,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  input: {
    height: "32px",
    padding: "0 10px",
    borderRadius: tokens.radiusItem,
    backgroundColor: tokens.fieldBg,
    border: `1px solid ${tokens.borderSoft}`,
    color: tokens.fg,
    outline: "none",
    ":focus": { borderColor: tokens.accent },
  },
  submit: {
    height: "32px",
    borderRadius: tokens.radiusItem,
    backgroundColor: tokens.accent,
    color: "oklch(0.18 0.05 40)",
    fontWeight: 600,
    fontSize: "14px",
    border: 0,
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.accentHover },
    ":disabled": { backgroundColor: tokens.fieldBg, color: tokens.quiet, cursor: "not-allowed" },
  },
});

/**
 * Inline create-channel/room form rendered inside a ChannelGroup when adding.
 * `onSubmit` receives the trimmed name.
 */
export function ChannelCreateForm({
  placeholder,
  ariaLabel,
  onSubmit,
}: {
  placeholder: string;
  ariaLabel: string;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = React.useState("");
  return (
    <form
      {...stylex.props(styles.form)}
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim().replace(/^#/, "");
        if (!trimmed) return;
        onSubmit(trimmed);
        setName("");
      }}
    >
      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.label)}>Name</span>
        <input
          {...stylex.props(styles.input)}
          aria-label={ariaLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      <button {...stylex.props(styles.submit)} type="submit" disabled={!name.trim()}>
        Create
      </button>
    </form>
  );
}

export default ChannelCreateForm;
