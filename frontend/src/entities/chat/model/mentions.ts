const MENTION_RE = /@([\p{L}\p{N}._-]+)/gu;

function mentionKey(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}._-]+/gu, "");
}

export function parseMentionedMemberIds(body: string, memberNamesById: Record<string, string>): string[] {
  const tokens = [...body.matchAll(MENTION_RE)].map((m) => mentionKey(m[1]));
  if (tokens.length === 0) return [];
  const results: string[] = [];
  for (const [memberId, name] of Object.entries(memberNamesById)) {
    const normalized = mentionKey(name);
    if (tokens.some((t) => t === normalized || t === memberId.toLowerCase())) results.push(memberId);
  }
  return results;
}
