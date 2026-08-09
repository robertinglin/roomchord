type ForumPost = {
  body: string;
  createdAt?: number;
  deletedAt?: number | null;
  tagIds?: string[];
};

export type ForumLayout = "list" | "gallery" | (string & {});
export type ForumTag = { id: string; name: string; color?: string | null; archivedAt?: number | null };

export const MAX_FORUM_TAGS = 32;

export function activeForumTags(tags: Record<string, ForumTag> | ForumTag[] | undefined): ForumTag[] {
  const records = Array.isArray(tags) ? tags : Object.values(tags || {});
  return records.filter((tag) => tag.id && !tag.archivedAt).sort((left, right) => left.name.localeCompare(right.name));
}

export function normalizeForumTagIds(tagIds: string[], tags?: ForumTag[]): string[] {
  const allowed = tags ? new Set(tags.map((tag) => tag.id)) : undefined;
  return [...new Set(tagIds.map((tagId) => tagId.trim()).filter((tagId) => tagId && (!allowed || allowed.has(tagId))))].slice(0, MAX_FORUM_TAGS);
}

/** A forum post is an authoritative channel message; no local post copy is created. */
export function forumPosts<T extends ForumPost>(messages: T[]): T[] {
  return messages
    .filter((message) => !message.deletedAt)
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
}

export function filterForumPosts<T extends ForumPost>(messages: T[], query: string, tagId?: string): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return forumPosts(messages).filter((message) => {
    const matchesQuery = !normalizedQuery || message.body.toLocaleLowerCase().includes(normalizedQuery);
    const matchesTag = !tagId || message.tagIds?.includes(tagId);
    return matchesQuery && matchesTag;
  });
}
