export type CommunityEvent = {
  id: string;
  title: string;
  startsAt?: number;
  endsAt?: number | null;
  location?: string | null;
  description?: string | null;
  cancelledAt?: number | null;
};

export type ModerationRecord = { bannedAt?: number | null; revokedAt?: number | null };

export function upcomingEvents(events: Record<string, CommunityEvent> | CommunityEvent[], now = Date.now()): CommunityEvent[] {
  return (Array.isArray(events) ? events : Object.values(events))
    .filter((event) => !event.cancelledAt && typeof event.startsAt === "number" && event.startsAt >= now)
    .sort((left, right) => (left.startsAt || 0) - (right.startsAt || 0));
}

export function activeModeration(record: ModerationRecord | undefined): string[] {
  if (!record) return [];
  const labels: string[] = [];
  if (record.bannedAt) labels.push("banned");
  if (record.revokedAt) labels.push("removed");
  return labels;
}
