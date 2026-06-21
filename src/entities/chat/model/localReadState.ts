const DIRECT_READ_STORAGE_PREFIX = "matterhorn:chord:direct-read:";
const DIRECT_READ_STORAGE_VERSION = 1;

type StoredDirectReadState = {
  version: typeof DIRECT_READ_STORAGE_VERSION;
  threads: Record<string, number>;
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

function readAtRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, number> = {};
  for (const [threadId, readAt] of Object.entries(value)) {
    const time = Number(readAt);
    if (threadId && Number.isFinite(time) && time > 0) next[threadId] = time;
  }
  return next;
}

export function directReadStorageKey(roomId: string, memberId: string) {
  return `${DIRECT_READ_STORAGE_PREFIX}${storageKeyPart(roomId)}:${storageKeyPart(memberId)}`;
}

export function loadDirectReadState(key: string): Record<string, number> {
  const storage = browserStorage();
  if (!storage) return {};
  const raw = storage.getItem(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDirectReadState>;
    return parsed.version === DIRECT_READ_STORAGE_VERSION ? readAtRecord(parsed.threads) : {};
  } catch {
    storage.removeItem(key);
    return {};
  }
}

export function saveDirectReadState(key: string, readAtByThread: Record<string, number>) {
  const storage = browserStorage();
  if (!storage) return;
  const record: StoredDirectReadState = {
    version: DIRECT_READ_STORAGE_VERSION,
    threads: readAtRecord(readAtByThread)
  };
  try {
    storage.setItem(key, JSON.stringify(record));
  } catch {
    // Local read state is only a notification hint; storage failures should not block chat.
  }
}
