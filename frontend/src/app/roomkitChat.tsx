import React from "react";
import styles from "@app/styles.css?inline";

import { createRoot, type Root } from "react-dom/client";
import { ChatApp } from "@pages/chat/ui/ChatPage";
import type { ChatProps } from "@entities/chat/model/types";

function ensureChatStyles() {
  const id = "roomkit-chord-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = styles;
  document.head.appendChild(style);
}

function ensureKeyboardOverlayMode() {
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (viewport && !viewport.content.includes("interactive-widget")) {
    viewport.content = `${viewport.content}, interactive-widget=overlays-content`;
  }
  const keyboard = (navigator as Navigator & { virtualKeyboard?: { overlaysContent: boolean } }).virtualKeyboard;
  if (keyboard) keyboard.overlaysContent = true;
}

export function mountRoomKitChat(target: HTMLElement, options: ChatProps = {}) {
  ensureChatStyles();
  ensureKeyboardOverlayMode();
  const root: Root = createRoot(target);
  root.render(<ChatApp {...options} />);
  return () => root.unmount();
}

export function mountRoomKitApp(target: HTMLElement, options: ChatProps = {}) {
  return mountRoomKitChat(target, options);
}

const autoMountTarget = typeof document !== "undefined" ? document.getElementById("roomkit-chord-root") : null;
if (autoMountTarget) mountRoomKitApp(autoMountTarget);
