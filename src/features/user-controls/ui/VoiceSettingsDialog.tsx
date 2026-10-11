import React, { useState } from "react";
import type { MediaDeviceController } from "matterhorn-sdk/browser/mediaDevices";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { VoiceSettingsPanel } from "@entities/chat/ui/VoiceSettingsPanel";
import { Glyph } from "@shared/ui/design";
import { shell, content } from "@shared/ui/manage.styles";
import { tokens } from "../../../shared/ui/theme.stylex";
import * as stylex from "@stylexjs/stylex";

type Props = {
  mediaDeviceController?: MediaDeviceController;
  preferences: VoicePreferences;
  onChange: (preferences: VoicePreferences) => void;
  onClose: () => void;
};

const styles = stylex.create({
  dialog: {
    width: "min(760px, calc(100vw - 48px))",
    height: "min(720px, calc(100vh - 48px))",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateRows: "minmax(0, 1fr)",
    overflow: "hidden",
    border: 0,
    borderRadius: "14px",
    color: tokens.fg,
    backgroundColor: "#15171a",
    boxShadow: tokens.elevPanel,
    "@media (max-width: 760px)": {
      width: "calc(100vw - 24px)",
      height: "calc(100vh - 24px)",
    },
  },
  content: { gridTemplateRows: "auto auto minmax(0, 1fr)" },
  tabs: {
    display: "flex",
    gap: "6px",
    padding: "0 28px 12px",
    borderBottom: `1px solid ${tokens.borderSoft}`,
    "@media (max-width: 760px)": { padding: "0 18px 12px" },
  },
  tab: {
    minHeight: "34px",
    padding: "0 12px",
    border: 0,
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    backgroundColor: "transparent",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 650,
    ":hover": { color: tokens.fg, backgroundColor: tokens.panelHover },
    ":focus-visible": { outline: `2px solid ${tokens.accent}`, outlineOffset: "2px" },
  },
  tabActive: { color: tokens.fg, backgroundColor: tokens.panelActive },
});

export function VoiceSettingsDialog({ mediaDeviceController, preferences, onChange, onClose }: Props) {
  const [tab, setTab] = useState<"voice" | "advanced">("voice");
  return (
    <div {...stylex.props(shell.shroud)} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        {...stylex.props(styles.dialog)}
        role="dialog"
        aria-modal="true"
        aria-label="Voice settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <section {...stylex.props(content.content, styles.content)}>
          <header {...stylex.props(content.head)}>
            <span {...stylex.props(content.title)}>
              <h2 {...stylex.props(content.h2)}>Voice settings</h2>
              <small {...stylex.props(content.desc)}>Microphone, input mode, and audio processing.</small>
            </span>
            <button type="button" aria-label="Close voice settings" onClick={onClose} {...stylex.props(content.close)}>
              <Glyph size={16}><><path d="M6 6 18 18" /><path d="M18 6 6 18" /></></Glyph>
            </button>
          </header>
          <nav {...stylex.props(styles.tabs)} role="tablist" aria-label="Voice settings sections">
            <button type="button" role="tab" aria-selected={tab === "voice"} onClick={() => setTab("voice")} {...stylex.props(styles.tab, tab === "voice" && styles.tabActive)}>Voice</button>
            <button type="button" role="tab" aria-selected={tab === "advanced"} onClick={() => setTab("advanced")} {...stylex.props(styles.tab, tab === "advanced" && styles.tabActive)}>Advanced</button>
          </nav>
          <div {...stylex.props(content.body)}>
            <VoiceSettingsPanel mediaDeviceController={mediaDeviceController} preferences={preferences} onChange={onChange} view={tab} />
          </div>
        </section>
      </section>
    </div>
  );
}
