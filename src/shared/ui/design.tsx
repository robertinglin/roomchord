import React, { useState, useEffect } from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";
import { DesignGallery } from "./design/DesignGallery";
import { ChatExample } from "./design/ChatExample";

/**
 * design.tsx — temporary review mount for the Mosh design system.
 *
 * Tabs between:
 *   • Gallery      — every atomic component across all variants
 *   • Chat Example — the chat.html reference demo rebuilt from the atoms,
 *                    with its own Main/Voice/Empty/Loading/Offline switcher
 *
 * The per-file atoms live in `./design/` (one component per file); this file
 * is just the review scaffold + the dark base styles the review needs.
 */

const review = stylex.create({
  root: {
    height: "100%",
    backgroundColor: tokens.bg,
    color: tokens.fg,
  },
  tabs: {
    position: "fixed",
    top: "8px",
    left: "8px",
    zIndex: 60,
    display: "flex",
    gap: "5px",
    backgroundColor: tokens.surfaceDeep,
    padding: "5px",
    borderRadius: "999px",
    boxShadow: tokens.elevPanel,
    border: `1px solid ${tokens.border}`,
  },
  tab: {
    fontSize: "11px",
    padding: "5px 12px",
    borderRadius: "999px",
    color: tokens.muted,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    border: 0,
    background: "transparent",
    cursor: "pointer",
  },
  tabActive: { backgroundColor: tokens.accentSoft, color: tokens.mentionFg },
});

/** Inject the dark base + fonts the review needs, once. */
function useDesignBase() {
  useEffect(() => {
    const id = "mosh-design-base";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        :root{color-scheme:dark}
        html,body{margin:0;height:100%}
        body{
          background:oklch(0.205 0.007 250); color:oklch(0.93 0.004 250);
          font-family:"Instrument Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
          font-size:15px; line-height:1.375; letter-spacing:0.1px;
          -webkit-font-smoothing:antialiased; overflow:hidden;
        }
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-thumb{background:oklch(0.30 0.01 250);border-radius:999px}
        ::-webkit-scrollbar-track{background:transparent}
        button,input,textarea{font:inherit;color:inherit;letter-spacing:inherit}
        button{border:0;background:none;cursor:pointer}
        a{color:oklch(0.73 0.13 40);text-decoration:none}
        a:hover{text-decoration:underline}
      `;
      document.head.appendChild(style);
    }
    if (!document.querySelector('link[href*="Bricolage+Grotesque"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
      document.head.appendChild(link);
    }
  }, []);
}

type ReviewTab = "gallery" | "chat";

export function DesignReview() {
  useDesignBase();
  const [tab, setTab] = useState<ReviewTab>("chat");
  return (
    <div {...stylex.props(review.root)}>
      <div {...stylex.props(review.tabs)}>
        {(["gallery", "chat"] as const).map((t) => (
          <button
            key={t}
            type="button"
            {...stylex.props(review.tab, tab === t && review.tabActive)}
            onClick={() => setTab(t)}
          >
            {t === "gallery" ? "Gallery" : "Chat Example"}
          </button>
        ))}
      </div>
      {tab === "gallery" ? <DesignGallery /> : <ChatExample />}
    </div>
  );
}

export default DesignReview;
