import type {
  MatterhornCustomMediaMessageReference,
  MatterhornCustomMediaPlaybackRef,
  MatterhornCustomMediaRecord,
  MatterhornCustomMediaRender
} from "matterhorn-sdk/browser";

export type CustomMediaMessageItem = {
  id: string;
  mediaType: MatterhornCustomMediaMessageReference["mediaType"];
  name: string;
  render: MatterhornCustomMediaRender;
  playback: MatterhornCustomMediaPlaybackRef;
};

/**
 * Project only live, scope-bound records through the SDK's render validator.
 * Message consumers never receive provider URLs or untrusted render metadata.
 */
export function projectCustomMediaRecords(
  records: MatterhornCustomMediaRecord[],
  safeRenderMetadata: (value: unknown) => MatterhornCustomMediaRender
): CustomMediaMessageItem[] {
  return records.flatMap((record) => {
    if (record.removedAt) return [];
    if (!record.reference || !["files-v2", "drive-asset"].includes(record.reference.kind) || typeof record.reference.id !== "string" || record.reference.id.length === 0) return [];
    try {
      return [{ id: record.id, mediaType: record.mediaType, name: record.name, render: safeRenderMetadata(record.render), playback: { kind: record.reference.kind, id: record.reference.id } }];
    } catch {
      return [];
    }
  });
}

export function customMediaForMessage(
  refs: MatterhornCustomMediaMessageReference[] | undefined,
  records: CustomMediaMessageItem[],
  scopeType: string,
  scopeId: string
): CustomMediaMessageItem[] {
  if (!Array.isArray(refs) || refs.length === 0) return [];
  return refs.flatMap((ref) => {
    if (ref.scopeType !== scopeType || ref.scopeId !== scopeId) return [];
    const record = records.find((candidate) => candidate.id === ref.mediaId);
    if (!record || record.mediaType !== ref.mediaType) return [];
    return [record];
  });
}
