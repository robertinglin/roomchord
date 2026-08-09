import type { MatterhornRoomDataScope } from "matterhorn-sdk/browser";
import type { MatterhornRoomSearchInput } from "matterhorn-sdk/client";

export type SearchScope = "all" | "messages" | "files" | "members" | "channels" | "threads";

export type SearchFilters = {
  query: string;
  scope?: SearchScope;
  channelId?: string;
  authorId?: string;
  after?: number;
  before?: number;
  offset?: number;
  limit?: number;
  scopes?: readonly MatterhornRoomDataScope[];
  concurrency?: number;
};

export function epochMillisForDateInput(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.getTime() : undefined;
}

export function dateInputValue(epoch: number | undefined): string {
  return typeof epoch === "number" && Number.isFinite(epoch) ? new Date(epoch).toISOString().slice(0, 10) : "";
}

export function matterhornSearchInput(
  filters: SearchFilters,
  scopeId: string | undefined,
  signal: AbortSignal
): MatterhornRoomSearchInput {
  const category = filters.scope || "all";
  const explicitScopes = filters.scopes?.length ? filters.scopes : undefined;
  const scope = explicitScopes
    ? undefined
    : category === "messages" && scopeId
      ? { scopeType: "channel" as const, scopeId }
      : "all" as const;
  return {
    ...(scope ? { scope } : {}),
    ...(explicitScopes ? { scopes: explicitScopes } : {}),
    text: filters.query.trim(),
    category,
    authorId: filters.authorId,
    after: filters.after,
    before: filters.before,
    mode: "all",
    limit: filters.limit || 25,
    offset: filters.offset || 0,
    order: "newest",
    concurrency: filters.concurrency || 4,
    timeoutMs: 10_000,
    signal
  };
}
