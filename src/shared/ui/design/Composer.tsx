import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Button } from "./Button";
import { SendGlyph } from "./icons";

const styles = stylex.create({
  wrap: { flex: "0 0 auto", padding: "0 16px 18px" },
  box: {
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surface,
    boxShadow: tokens.elevPanel,
    overflow: "hidden",
  },
  top: { display: "flex", alignItems: "center", gap: "2px", padding: "6px 6px 0" },
  input: {
    display: "block",
    width: "100%",
    minHeight: "46px",
    maxHeight: "160px",
    padding: "6px 14px 8px",
    backgroundColor: "transparent",
    border: 0,
    outline: "none",
    resize: "none",
    fontSize: "15px",
    lineHeight: 1.4,
    color: tokens.fg,
    "::placeholder": { color: tokens.quiet },
  },
  bot: { display: "flex", alignItems: "center", gap: "8px", padding: "4px 10px 8px" },
  left: { display: "flex", gap: "2px" },
  len: {
    marginLeft: "auto",
    fontSize: "11px",
    color: tokens.quiet,
    fontFamily: tokens.fontMono,
  },
});

export function Composer({
  value,
  onChange,
  onSend,
  placeholder,
  maxLength = 2000,
  tools,
  attachButton,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  maxLength?: number;
  tools?: React.ReactNode;
  attachButton?: React.ReactNode;
}) {
  const canSend = value.trim().length > 0;
  return (
    <div {...stylex.props(styles.wrap)}>
      <div {...stylex.props(styles.box)}>
        {attachButton && <div {...stylex.props(styles.top)}>{attachButton}</div>}
        <textarea
          {...stylex.props(styles.input)}
          placeholder={placeholder}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div {...stylex.props(styles.bot)}>
          <div {...stylex.props(styles.left)}>{tools}</div>
          <span {...stylex.props(styles.len)}>
            {value.length} / {maxLength}
          </span>
          <Button
            variant="solid"
            tone="accent"
            disabled={!canSend}
            onClick={onSend}
            title="Send"
          >
            <SendGlyph size={15} />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Composer;
