import type { CallMediaSettings } from "roomkit-sdk/browser/types";

const VOICE_RECONNECT_STORAGE_PREFIX = "roomkit:chord:voice-reconnect:";
export const VOICE_RECONNECT_WINDOW_MS = 120_000;

export type RecentVoiceJoin = {
  roomId: string;
  media: CallMediaSettings;
  joinedAt: number;
};

function browserStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const storage = window.localStorage;
    return storage
      && typeof storage.getItem === "function"
      && typeof storage.setItem === "function"
      && typeof storage.removeItem === "function"
      ? storage
      : undefined;
  } catch {
    return undefined;
  }
}

function storageKeyPart(value: string) {
  return encodeURIComponent(value || "default");
}

function validMedia(value: unknown): CallMediaSettings {
  const media = value && typeof value === "object" ? value as CallMediaSettings : {};
  return { audio: media.audio !== false, video: Boolean(media.video) };
}

function activeRecentJoin(value: RecentVoiceJoin | undefined, now: number) {
  if (!value) return undefined;
  return now - value.joinedAt <= VOICE_RECONNECT_WINDOW_MS ? value : undefined;
}

export function voiceReconnectStorageKey(roomId: string, memberId: string) {
  return `${VOICE_RECONNECT_STORAGE_PREFIX}${storageKeyPart(roomId)}:${storageKeyPart(memberId)}`;
}

export function loadRecentVoiceJoin(key: string, now = Date.now()): RecentVoiceJoin | undefined {
  const storage = browserStorage();
  if (!storage) return undefined;
  const raw = storage.getItem(key);
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || typeof value.roomId !== "string") return undefined;
    const joinedAt = Number(value.joinedAt);
    const recent = Number.isFinite(joinedAt) ? activeRecentJoin({ roomId: value.roomId, media: validMedia(value.media), joinedAt }, now) : undefined;
    if (!recent) storage.removeItem(key);
    return recent;
  } catch {
    storage.removeItem(key);
    return undefined;
  }
}

export function saveRecentVoiceJoin(key: string, roomId: string, media: CallMediaSettings, joinedAt = Date.now()) {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ roomId, media: validMedia(media), joinedAt }));
  } catch {
    // Reconnect hints are local convenience state; failures should not block calls.
  }
}

export function clearRecentVoiceJoin(key: string) {
  browserStorage()?.removeItem(key);
}
