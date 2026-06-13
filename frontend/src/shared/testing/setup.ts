import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { removeStorage } from "matterhorn-sdk/browser/storage/base";

const localStorageData = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    get length() {
      return localStorageData.size;
    },
    clear() {
      localStorageData.clear();
    },
    getItem(key: string) {
      return localStorageData.has(key) ? localStorageData.get(key)! : null;
    },
    key(index: number) {
      return Array.from(localStorageData.keys())[index] || null;
    },
    removeItem(key: string) {
      localStorageData.delete(key);
    },
    setItem(key: string, value: string) {
      localStorageData.set(key, String(value));
    }
  }
});

Object.defineProperty(document, "execCommand", {
  configurable: true,
  value(command: string, _showUi?: boolean, value?: string) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    if (command === "insertText") {
      const node = document.createTextNode(value || "");
      range.insertNode(node);
      range.setStartAfter(node);
    } else if (command === "insertLineBreak") {
      const node = document.createElement("br");
      range.insertNode(node);
      range.setStartAfter(node);
    } else if (command === "insertHTML") {
      const template = document.createElement("template");
      template.innerHTML = value || "";
      const nodes = Array.from(template.content.childNodes);
      for (const node of nodes) {
        range.insertNode(node);
        range.setStartAfter(node);
      }
    } else {
      return false;
    }

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  removeStorage("matterhorn:notification-read-state");
  document.getElementById("matterhorn-chord-styles")?.remove();
  document.getElementById("matterhorn-emoji-picker-styles")?.remove();
  window.location.hash = "";
});
