const MEMBER_PREFERENCES_STORAGE_PREFIX = "matterhorn:mosh:member-preferences:";
const MEMBER_PREFERENCES_STORAGE_VERSION = 1;

export type MemberPreference = {
  blocked?: boolean;
  ignored?: boolean;
  nickname?: string;
  note?: string;
};

type StoredMemberPreferences = {
  preferences: Record<string, MemberPreference>;
  version: typeof MEMBER_PREFERENCES_STORAGE_VERSION;
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
  return encodeURIComponent(value || "unknown");
}

function textValue(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizedPreference(value: unknown): MemberPreference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const preference: MemberPreference = {};
  const nickname = textValue(input.nickname, 80);
  const note = textValue(input.note, 1000);
  if (nickname) preference.nickname = nickname;
  if (note) preference.note = note;
  if (input.ignored === true) preference.ignored = true;
  if (input.blocked === true) preference.blocked = true;
  return preference;
}

function normalizedPreferences(value: unknown): Record<string, MemberPreference> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const preferences: Record<string, MemberPreference> = {};
  for (const [memberId, preference] of Object.entries(value)) {
    if (!memberId) continue;
    const normalized = normalizedPreference(preference);
    if (Object.keys(normalized).length > 0) preferences[memberId] = normalized;
  }
  return preferences;
}

export function memberPreferencesStorageKey(roomId: string, memberId: string) {
  return `${MEMBER_PREFERENCES_STORAGE_PREFIX}${storageKeyPart(roomId)}:${storageKeyPart(memberId)}`;
}

export function loadMemberPreferences(key: string): Record<string, MemberPreference> {
  const storage = browserStorage();
  if (!storage) return {};
  const raw = storage.getItem(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<StoredMemberPreferences>;
    return parsed.version === MEMBER_PREFERENCES_STORAGE_VERSION ? normalizedPreferences(parsed.preferences) : {};
  } catch {
    storage.removeItem(key);
    return {};
  }
}

export function saveMemberPreferences(key: string, preferences: Record<string, MemberPreference>) {
  const storage = browserStorage();
  if (!storage) return;
  const normalized = normalizedPreferences(preferences);
  if (Object.keys(normalized).length === 0) {
    storage.removeItem(key);
    return;
  }
  const record: StoredMemberPreferences = {
    preferences: normalized,
    version: MEMBER_PREFERENCES_STORAGE_VERSION
  };
  try {
    storage.setItem(key, JSON.stringify(record));
  } catch {
    // Local member preferences should not block chat.
  }
}
