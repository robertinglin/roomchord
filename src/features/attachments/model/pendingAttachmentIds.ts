export type PendingAttachmentIds = {
  add(scopeKey: string, attachmentId: string): void;
  count(scopeKey: string): number;
  take(scopeKey: string): string[];
};

export function createPendingAttachmentIds(): PendingAttachmentIds {
  const pending = new Map<string, string[]>();
  return {
    add(scopeKey, attachmentId) {
      pending.set(scopeKey, [...(pending.get(scopeKey) || []), attachmentId]);
    },
    count(scopeKey) {
      return (pending.get(scopeKey) || []).length;
    },
    take(scopeKey) {
      const ids = pending.get(scopeKey) || [];
      pending.delete(scopeKey);
      return ids;
    }
  };
}
