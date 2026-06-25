import React from "react";
import { switchStyle, checkboxStyle } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

/**
 * Toggle switch used throughout the settings/management dialogs. The checked
 * state is React-driven (no `:checked` pseudo-selector), so the knob/track
 * recolor via the `on` variants.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
}) {
  return (
    <label {...stylex.props(switchStyle.switch, disabled && switchStyle.switchDisabled)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
        {...stylex.props(switchStyle.input)}
      />
      <span {...stylex.props(switchStyle.track, checked && switchStyle.trackOn)} />
      <span {...stylex.props(switchStyle.knob, checked && switchStyle.knobOn)} />
    </label>
  );
}

/**
 * Custom checkbox (square box + check glyph) for the members role-assignment
 * grid. Controlled component — `checked` drives the box/check recolor.
 */
export function Checkbox({
  checked,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onChange(!checked);
        }
      }}
      onClick={() => onChange(!checked)}
      {...stylex.props(checkboxStyle.chk)}
    >
      <span {...stylex.props(checkboxStyle.box, checked && checkboxStyle.boxOn)}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...stylex.props(checkboxStyle.check, checked && checkboxStyle.checkOn)}
        >
          <path d="m5 12 5 5 9-11" />
        </svg>
      </span>
    </span>
  );
}
