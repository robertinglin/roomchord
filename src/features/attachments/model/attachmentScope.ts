import type { AttachmentScope } from "@features/attachments/model/types";

export function attachmentScope(input: { showingDm: boolean; channelId?: string; threadId?: string; committedDm?: boolean }): AttachmentScope | undefined {
  if (input.showingDm) {
    if (input.committedDm === false) return undefined;
    return input.threadId ? { scopeType: "direct.thread", scopeId: input.threadId } : undefined;
  }
  return input.channelId ? { scopeType: "channel", scopeId: input.channelId } : undefined;
}

export function scopedRecords<T extends { scopeType?: string; scopeId?: string; removedAt?: number | null }>(records: T[], scope?: AttachmentScope) {
  if (!scope) return [];
  return records.filter((record) => record.scopeType === scope.scopeType && record.scopeId === scope.scopeId && !record.removedAt);
}
