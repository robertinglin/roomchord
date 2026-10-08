import React, { useEffect, useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import { HashGlyph, PlusGlyph, SpeakerGlyph } from "@shared/ui/design";
import { tokens } from "../../../shared/ui/theme.stylex";

const styles = stylex.create({
  root: { position: "relative", padding: "0 8px 8px" },
  heading: { display: "flex", alignItems: "center", justifyContent: "space-between", color: tokens.quiet },
  label: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  trigger: { width: "28px", height: "28px", display: "grid", placeItems: "center", border: 0, borderRadius: tokens.radiusItem, color: tokens.quiet, backgroundColor: "transparent", cursor: "pointer", ":hover": { color: tokens.fg, backgroundColor: tokens.panelHover } },
  menu: { position: "absolute", top: "32px", right: "8px", zIndex: 40, width: "220px", display: "grid", gap: "3px", padding: "6px", border: `1px solid ${tokens.border}`, borderRadius: tokens.radiusPanel, backgroundColor: tokens.surfaceDeep, boxShadow: tokens.elevPanel },
  item: { display: "grid", gridTemplateColumns: "20px minmax(0, 1fr)", gap: "9px", alignItems: "center", minHeight: "42px", padding: "6px 8px", border: 0, borderRadius: tokens.radiusItem, color: tokens.muted, backgroundColor: "transparent", textAlign: "left", cursor: "pointer", ":hover": { color: tokens.fg, backgroundColor: tokens.panelHover }, ":focus": { color: tokens.fg, backgroundColor: tokens.panelHover, outline: "none" } },
  copy: { display: "grid", gap: "1px" },
  title: { fontSize: "13px" },
  hint: { color: tokens.quiet, fontSize: "11px" },
});

export function ChannelCreateMenu({
  canCreateCategory,
  canCreateVoice,
  menuOpen,
  onMenuOpenChange,
  onCreateCategory,
  onCreateChannel,
  onCreateVoice,
}: {
  canCreateCategory: boolean;
  canCreateVoice: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onCreateCategory: () => void;
  onCreateChannel: () => void;
  onCreateVoice: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onMenuOpenChange(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onMenuOpenChange(false);
    }
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen, onMenuOpenChange]);

  return (
    <div ref={rootRef} {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.heading)}>
        <span {...stylex.props(styles.label)}>Channels</span>
        <button
          type="button"
          aria-label="Create channel or category"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          {...stylex.props(styles.trigger)}
          onClick={() => onMenuOpenChange(!menuOpen)}
        >
          <PlusGlyph size={15} />
        </button>
      </div>
      {menuOpen ? (
        <div role="menu" aria-label="Create channel or category" {...stylex.props(styles.menu)}>
          <button type="button" role="menuitem" aria-label="Create channel" {...stylex.props(styles.item)} onClick={onCreateChannel}>
            <HashGlyph size={17} />
            <span {...stylex.props(styles.copy)}><strong {...stylex.props(styles.title)}>Channel</strong><small {...stylex.props(styles.hint)}>Create a text channel</small></span>
          </button>
          {canCreateVoice ? (
            <button type="button" role="menuitem" aria-label="Create voice channel" {...stylex.props(styles.item)} onClick={onCreateVoice}>
              <SpeakerGlyph size={17} />
              <span {...stylex.props(styles.copy)}><strong {...stylex.props(styles.title)}>Voice channel</strong><small {...stylex.props(styles.hint)}>Create an audio room</small></span>
            </button>
          ) : null}
          {canCreateCategory ? (
            <button type="button" role="menuitem" aria-label="Create category" {...stylex.props(styles.item)} onClick={onCreateCategory}>
              <PlusGlyph size={17} />
              <span {...stylex.props(styles.copy)}><strong {...stylex.props(styles.title)}>Category</strong><small {...stylex.props(styles.hint)}>Organize related channels</small></span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
