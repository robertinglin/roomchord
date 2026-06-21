const RECENT_REACTIONS_KEY = "matterhorn:mosh:recent-reactions:v1";
const DEFAULT_RECENT_REACTIONS = ["👍", "😂", "❤️"];

function uniqueRecent(items: string[]) {
  return Array.from(new Set(items.filter(Boolean))).slice(0, 3);
}

export function loadRecentReactions() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_REACTIONS_KEY) || "[]");
    if (Array.isArray(parsed)) {
      const saved = parsed.filter((item): item is string => typeof item === "string");
      return uniqueRecent([...saved, ...DEFAULT_RECENT_REACTIONS]);
    }
  } catch {
    return DEFAULT_RECENT_REACTIONS;
  }
  return DEFAULT_RECENT_REACTIONS;
}

function saveRecentReactions(reactions: string[]) {
  try {
    window.localStorage.setItem(RECENT_REACTIONS_KEY, JSON.stringify(reactions));
  } catch {
    return;
  }
}

export function rememberReaction(current: string[], emoji: string) {
  const currentRecent = uniqueRecent([...current, ...DEFAULT_RECENT_REACTIONS]);
  const next = currentRecent.includes(emoji)
    ? currentRecent
    : uniqueRecent([emoji, ...currentRecent]);
  saveRecentReactions(next);
  return next;
}
