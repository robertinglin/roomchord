import type { CallMediaSettings, CallVoiceProcessingSettings } from "roomkit-sdk/browser/types";

const VOICE_PREFERENCES_STORAGE_PREFIX = "roomkit:chord:voice-preferences:";
const DEFAULT_PTT_KEY = "Backquote";
const DTLN_WORKLET_FILE = "audio-worklet.js";
const SILERO_ASSET_DIR = "vad/";
const FUNCTION_KEY_PATTERN = /^f([1-9]|1[0-9]|2[0-4])$/i;

export type VoicePreferences = {
  muted: boolean;
  deafened: boolean;
  dynamicGainControl: boolean;
  inputGain: number;
  pushToTalk: boolean;
  pttKey: string;
  sileroVad: boolean;
  vadThreshold: number;
  dtlnNoiseSuppression: boolean;
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

export function voicePreferencesStorageKey(roomId: string, memberId: string) {
  return `${VOICE_PREFERENCES_STORAGE_PREFIX}${storageKeyPart(roomId)}:${storageKeyPart(memberId)}`;
}

export function defaultVoicePreferences(): VoicePreferences {
  return {
    muted: false,
    deafened: false,
    dynamicGainControl: false,
    inputGain: 1,
    pushToTalk: false,
    pttKey: DEFAULT_PTT_KEY,
    sileroVad: false,
    vadThreshold: 0.5,
    dtlnNoiseSuppression: false
  };
}

function clampedNumber(value: unknown, fallback: number, min: number, max: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(min, Math.min(max, numberValue));
}

export function normalizePttKey(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_PTT_KEY;
  const key = value.trim();
  if (!key) return DEFAULT_PTT_KEY;
  const functionKey = FUNCTION_KEY_PATTERN.exec(key);
  if (functionKey) return `F${Number(functionKey[1])}`;
  if (key === " " || key.toLowerCase() === "spacebar") return "Space";
  return key;
}

export function pttKeyFromKeyboardEvent(event: KeyboardEvent): string {
  return normalizePttKey(event.code || event.key);
}

function normalizedVoicePreferences(value: Record<string, unknown>): VoicePreferences {
  const defaults = defaultVoicePreferences();
  return {
    muted: value.muted === true,
    deafened: value.deafened === true,
    dynamicGainControl: value.dynamicGainControl === true,
    inputGain: clampedNumber(value.inputGain, defaults.inputGain, 0, 3),
    pushToTalk: value.pushToTalk === true,
    pttKey: normalizePttKey(value.pttKey),
    sileroVad: value.sileroVad === true || value.voiceActivityDetection === true,
    vadThreshold: clampedNumber(value.vadThreshold, defaults.vadThreshold, 0.001, 1),
    dtlnNoiseSuppression: value.dtlnNoiseSuppression === true
  };
}

function dtlnWorkletUrl(): string {
  if (typeof window === "undefined") return `/${DTLN_WORKLET_FILE}`;
  return new URL(`/${DTLN_WORKLET_FILE}`, window.location.origin).toString();
}

function sileroAssetPath(): string {
  if (typeof window === "undefined") return `/${SILERO_ASSET_DIR}`;
  return new URL(`/${SILERO_ASSET_DIR}`, window.location.origin).toString();
}

export function loadVoicePreferences(key: string): VoicePreferences {
  const storage = browserStorage();
  if (!storage) return defaultVoicePreferences();
  const raw = storage.getItem(key);
  if (!raw) return defaultVoicePreferences();
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return defaultVoicePreferences();
    return normalizedVoicePreferences(value as Record<string, unknown>);
  } catch {
    storage.removeItem(key);
    return defaultVoicePreferences();
  }
}

export function saveVoicePreferences(key: string, preferences: VoicePreferences) {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(normalizedVoicePreferences(preferences as unknown as Record<string, unknown>)));
  } catch {
    // Local voice preferences should not block joining or chatting.
  }
}

export function voiceProcessingSettingsFromPreferences(preferences: VoicePreferences): CallVoiceProcessingSettings | undefined {
  const voice: CallVoiceProcessingSettings = {};
  if (preferences.dynamicGainControl) voice.autoGainControl = true;
  if (Math.abs(preferences.inputGain - 1) > 0.001) voice.inputGain = preferences.inputGain;
  if (preferences.pushToTalk) {
    voice.inputMode = "ptt";
    voice.pttKey = normalizePttKey(preferences.pttKey);
  }
  if (preferences.sileroVad && !preferences.pushToTalk) {
    voice.inputMode = "activity";
    voice.vad = {
      enabled: true,
      engine: "silero",
      model: "v5",
      threshold: preferences.vadThreshold,
      hangoverMs: 500,
      baseAssetPath: sileroAssetPath()
    };
  }
  if (preferences.dtlnNoiseSuppression) {
    voice.dtlnNoiseSuppression = true;
    voice.dtlnWorkletUrl = dtlnWorkletUrl();
  }
  return Object.keys(voice).length ? voice : undefined;
}

export function mediaWithVoicePreferences(media: CallMediaSettings, preferences: VoicePreferences): CallMediaSettings {
  const voice = voiceProcessingSettingsFromPreferences(preferences);
  const next: CallMediaSettings = {
    audio: media.audio !== false,
    video: Boolean(media.video),
    screen: Boolean(media.screen)
  };
  if (voice) next.voice = voice;
  return next;
}
