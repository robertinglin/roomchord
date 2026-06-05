import React from "react";
import styles from "./styles.css?inline";

import { createRoot, type Root } from "react-dom/client";
import { ChatApp } from "./chat/ChatApp";
import type { ChatProps } from "./chat/types";

function ensureChatStyles() {
  const id = "roomkit-chord-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = styles;
  document.head.appendChild(style);
}

export function mountRoomKitChat(target: HTMLElement, options: ChatProps = {}) {
  ensureChatStyles();
  const root: Root = createRoot(target);
  root.render(<ChatApp {...options} />);
  return () => root.unmount();
}

export function mountRoomKitApp(target: HTMLElement, options: ChatProps = {}) {
  return mountRoomKitChat(target, options);
}

const autoMountTarget = typeof document !== "undefined" ? document.getElementById("roomkit-chord-root") : null;
if (autoMountTarget) mountRoomKitApp(autoMountTarget);
