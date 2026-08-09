export type NotificationMode = "all" | "mentions" | "none";

export type NotificationPreference = {
  mode: NotificationMode;
  muteUntil: number | null;
};

export type NotificationPreferenceScope = {
  roomId: string;
  scopeType: string;
  scopeId: string;
};

const STORAGE_PREFIX = "matterhorn:mosh:notification-preferences:v1:";

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

function keyPart(value: string) {
  return encodeURIComponent(value || "default");
}

export function notificationPreferenceStorageKey(scope: NotificationPreferenceScope) {
  return `${STORAGE_PREFIX}${keyPart(scope.roomId)}:${keyPart(scope.scopeType)}:${keyPart(scope.scopeId)}`;
}

export function defaultNotificationPreference(): NotificationPreference {
  return { mode: "all", muteUntil: null };
}

function normalizedMode(value: unknown): NotificationMode {
  return value === "mentions" || value === "none" ? value : "all";
}

export function normalizeNotificationPreference(value: unknown): NotificationPreference {
  if (!value || typeof value !== "object") return defaultNotificationPreference();
  const record = value as Record<string, unknown>;
  const muteUntil = Number(record.muteUntil);
  return {
    mode: normalizedMode(record.mode),
    muteUntil: Number.isFinite(muteUntil) && muteUntil > 0 ? muteUntil : null
  };
}

export function loadNotificationPreference(scope: NotificationPreferenceScope): NotificationPreference {
  const storage = browserStorage();
  if (!storage) return defaultNotificationPreference();
  try {
    const raw = storage.getItem(notificationPreferenceStorageKey(scope));
    return raw ? normalizeNotificationPreference(JSON.parse(raw)) : defaultNotificationPreference();
  } catch {
    return defaultNotificationPreference();
  }
}

export function saveNotificationPreference(scope: NotificationPreferenceScope, preference: NotificationPreference) {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(notificationPreferenceStorageKey(scope), JSON.stringify(normalizeNotificationPreference(preference)));
  } catch {
    // Notification preferences are local hints and should never block chat.
  }
}

export function notificationIsMuted(preference: NotificationPreference, now = Date.now()) {
  if (preference.mode === "none") return true;
  return preference.muteUntil !== null && preference.muteUntil > now;
}

export function notificationDefinitionAllowed(preference: NotificationPreference, definition: string, now = Date.now()) {
  if (notificationIsMuted(preference, now)) return false;
  if (preference.mode === "all") return true;
  const normalizedDefinition = definition.toLowerCase();
  return normalizedDefinition.includes("mention") || normalizedDefinition.includes("direct");
}
