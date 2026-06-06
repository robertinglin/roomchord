const CLOSED_DIRECT_STORAGE_PREFIX = "roomkit:chord:direct-closed:";
const CLOSED_DIRECT_STORAGE_VERSION = 1;

type StoredClosedDirectThreads = {
  threads: Record<string, number>;
  version: typeof CLOSED_DIRECT_STORAGE_VERSION;
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

function closedThreadRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, number> = {};
  for (const [threadId, closedAt] of Object.entries(value)) {
    const time = Number(closedAt);
    if (threadId && Number.isFinite(time) && time > 0) next[threadId] = time;
  }
  return next;
}

export function closedDirectThreadsStorageKey(roomId: string, memberId: string) {
  return `${CLOSED_DIRECT_STORAGE_PREFIX}${storageKeyPart(roomId)}:${storageKeyPart(memberId)}`;
}

export function loadClosedDirectThreads(key: string): Record<string, number> {
  const storage = browserStorage();
  if (!storage) return {};
  const raw = storage.getItem(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<StoredClosedDirectThreads>;
    return parsed.version === CLOSED_DIRECT_STORAGE_VERSION ? closedThreadRecord(parsed.threads) : {};
  } catch {
    storage.removeItem(key);
    return {};
  }
}

export function saveClosedDirectThreads(key: string, threads: Record<string, number>) {
  const storage = browserStorage();
  if (!storage) return;
  const record: StoredClosedDirectThreads = {
    threads: closedThreadRecord(threads),
    version: CLOSED_DIRECT_STORAGE_VERSION
  };
  try {
    storage.setItem(key, JSON.stringify(record));
  } catch {
    // Closed rows are local UI state; storage failures should not block chat.
  }
}
