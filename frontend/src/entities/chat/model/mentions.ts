const MENTION_RE = /@(\S+)/g;

export function parseMentionedMemberIds(body: string, memberNamesById: Record<string, string>): string[] {
  const tokens = [...body.matchAll(MENTION_RE)].map((m) => m[1].toLowerCase());
  if (tokens.length === 0) return [];
  const results: string[] = [];
  for (const [memberId, name] of Object.entries(memberNamesById)) {
    const normalized = name.toLowerCase().replace(/\s+/g, "");
    if (tokens.some((t) => t === normalized || t === memberId.toLowerCase())) results.push(memberId);
  }
  return results;
}
