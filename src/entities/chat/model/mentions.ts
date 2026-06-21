const INTERNAL_MENTION_RE = /@\[([^\]]+)\]/g;
const LEGACY_MENTION_RE = /@([\p{L}\p{N}._-]+)/gu;

export type MentionSegment =
  | { text: string; type: "text" }
  | { memberId: string; text: string; type: "mention" };

type MentionMatch = { end: number; memberId: string; start: number; text: string };

function mentionKey(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}._-]+/gu, "");
}

function decodeMentionId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function nameMentioned(body: string, name: string) {
  const needle = `@${name}`.toLowerCase();
  const lowerBody = body.toLowerCase();
  let index = lowerBody.indexOf(needle);
  while (index !== -1) {
    const before = index === 0 ? " " : lowerBody[index - 1];
    const after = lowerBody[index + needle.length] || " ";
    if (/\s/.test(before) && (/\s/.test(after) || /[.,!?;:)]/.test(after))) return true;
    index = lowerBody.indexOf(needle, index + 1);
  }
  return false;
}

function findDisplayNameMentions(body: string, memberNamesById: Record<string, string>) {
  const matches: MentionMatch[] = [];
  const lowerBody = body.toLowerCase();
  for (const [memberId, name] of Object.entries(memberNamesById)) {
    const needle = `@${name}`.toLowerCase();
    let index = lowerBody.indexOf(needle);
    while (index !== -1) {
      const before = index === 0 ? " " : lowerBody[index - 1];
      const after = lowerBody[index + needle.length] || " ";
      if (/\s/.test(before) && (/\s/.test(after) || /[.,!?;:)]/.test(after))) {
        matches.push({ start: index, end: index + needle.length, memberId, text: `@${name}` });
      }
      index = lowerBody.indexOf(needle, index + 1);
    }
  }
  return matches;
}

function mentionedMemberId(token: string, memberNamesById: Record<string, string>) {
  const normalizedToken = mentionKey(token);
  for (const [memberId, name] of Object.entries(memberNamesById)) {
    if (normalizedToken === mentionKey(name) || normalizedToken === memberId.toLowerCase()) return memberId;
  }
  return undefined;
}

export function mentionToken(memberId: string) {
  return `@[${encodeURIComponent(memberId)}]`;
}

export function parseMentionedMemberIds(body: string, memberNamesById: Record<string, string>): string[] {
  const results: string[] = [];

  for (const match of body.matchAll(INTERNAL_MENTION_RE)) {
    const memberId = decodeMentionId(match[1]);
    if (memberId in memberNamesById && !results.includes(memberId)) results.push(memberId);
  }

  const legacyTokens = [...body.matchAll(LEGACY_MENTION_RE)].map((m) => mentionKey(m[1]));
  for (const token of legacyTokens) {
    const memberId = mentionedMemberId(token, memberNamesById);
    if (memberId && !results.includes(memberId)) results.push(memberId);
  }

  for (const [memberId, name] of Object.entries(memberNamesById)) {
    if (!results.includes(memberId) && nameMentioned(body, name)) results.push(memberId);
  }

  return results;
}

export function mentionSegments(body: string, memberNamesById: Record<string, string>): MentionSegment[] {
  const matches: MentionMatch[] = [];

  for (const match of body.matchAll(INTERNAL_MENTION_RE)) {
    const memberId = decodeMentionId(match[1]);
    const name = memberNamesById[memberId];
    if (name) {
      matches.push({ start: match.index, end: match.index + match[0].length, memberId, text: `@${name}` });
    }
  }

  for (const match of body.matchAll(LEGACY_MENTION_RE)) {
    const memberId = mentionedMemberId(match[1], memberNamesById);
    if (memberId) {
      matches.push({ start: match.index, end: match.index + match[0].length, memberId, text: `@${memberNamesById[memberId]}` });
    }
  }

  matches.push(...findDisplayNameMentions(body, memberNamesById));
  matches.sort((left, right) => left.start - right.start || right.end - right.start - (left.end - left.start));

  const segments: MentionSegment[] = [];
  let offset = 0;
  for (const match of matches) {
    if (match.start < offset) continue;
    if (match.start > offset) segments.push({ type: "text", text: body.slice(offset, match.start) });
    segments.push({ type: "mention", memberId: match.memberId, text: match.text });
    offset = match.end;
  }
  if (offset < body.length) segments.push({ type: "text", text: body.slice(offset) });
  return segments;
}

export function renderMentionNames(body: string, memberNamesById: Record<string, string>): string {
  return mentionSegments(body, memberNamesById).map((segment) => segment.text).join("");
}
