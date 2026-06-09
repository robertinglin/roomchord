import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { removeStorage } from "roomkit-sdk/browser/storage/base";

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

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  removeStorage("roomkit:notification-read-state");
  document.getElementById("roomkit-chord-styles")?.remove();
  document.getElementById("roomkit-emoji-picker-styles")?.remove();
  window.location.hash = "";
  delete (window as any).ROOMKIT_CHORD_HOST;
  delete (window as any).ROOMKIT_HOST;
  delete (window as any).ROOMKIT_EXAMPLE_HOST;
  delete (window as any).ROOMKIT_CHAT_HOST;
  delete (window as any).ROOMKIT_EXAMPLE_BACKEND_URL;
});
