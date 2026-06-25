import React from "react";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { VoiceSettingsPanel } from "@entities/chat/ui/VoiceSettingsPanel";
import { Glyph } from "@shared/ui/design";
import { shell, rail, content } from "@features/management/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

type Props = {
  preferences: VoicePreferences;
  onChange: (preferences: VoicePreferences) => void;
  onClose: () => void;
};

export function VoiceSettingsDialog({ preferences, onChange, onClose }: Props) {
  return (
    <div
      {...stylex.props(shell.shroud)}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        {...stylex.props(shell.dialog)}
        role="dialog"
        aria-modal="true"
        aria-label="Voice settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <aside {...stylex.props(rail.rail)} aria-label="Device settings sections">
          <div {...stylex.props(rail.head)}>
            <div {...stylex.props(rail.mark)} aria-hidden="true">
              <svg viewBox="0 0 24 18" fill="none" width={22} height={16} style={{ overflow: "visible" }}>
                <path d="M2 9c2.5 0 2.5-6 5-6s2.5 12 5 12 2.5-6 5-6 2.5 0 5 0" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span {...stylex.props(rail.id)}>
              <strong {...stylex.props(rail.idTitle)}>Mosh</strong>
              <small {...stylex.props(rail.idSub)}>Device settings</small>
            </span>
          </div>
          <div {...stylex.props(rail.group, rail.groupFirst)}>
            <div {...stylex.props(rail.groupLabel)}>Device</div>
            <button type="button" {...stylex.props(rail.item, rail.itemActive)}>
              <span {...stylex.props(rail.itemIconActive)}>
                <Glyph size={18}><><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></></Glyph>
              </span>
              <span {...stylex.props(rail.itemLabel)}>Voice &amp; audio</span>
            </button>
          </div>
        </aside>

        <section {...stylex.props(content.content)}>
          <header {...stylex.props(content.head)}>
            <span {...stylex.props(content.title)}>
              <h2 {...stylex.props(content.h2)}>Voice &amp; audio</h2>
              <small {...stylex.props(content.desc)}>Microphone processing for this device.</small>
            </span>
            <button type="button" aria-label="Close voice settings" onClick={onClose} {...stylex.props(content.close)}>
              <Glyph size={16}><><path d="M6 6 18 18" /><path d="M18 6 6 18" /></></Glyph>
            </button>
          </header>
          <div {...stylex.props(content.body)}>
            <VoiceSettingsPanel preferences={preferences} onChange={onChange} />
          </div>
        </section>
      </section>
    </div>
  );
}
