import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilesPublicRecord } from "matterhorn-sdk/browser";
import { DriveRoomUploadPartialError } from "matterhorn-sdk/file-picker";
import type { Room } from "matterhorn-sdk/client";
import type { Mosh } from "../../../../types";
import { attachmentScope, scopedRecords } from "@features/attachments/model/attachmentScope";
import { createDrivePickerAdapter } from "@features/attachments/model/drivePickerAdapter";
import type { DrivePickerAdapter } from "@shared/model/drivePickerAdapter";
import { createPendingAttachmentIds } from "@features/attachments/model/pendingAttachmentIds";
import type { AttachmentRecord, AttachmentTransferState, EncryptedFileRecord } from "@features/attachments/model/types";
import type { AdvancedPickerSelection, AttachmentPickerConfig } from "@shared/model/attachmentPicker";
import type { PendingAttachmentPreview } from "@shared/model/attachments";

type PendingAttachmentDraft = PendingAttachmentPreview & {
  scopeKey: string;
  source:
    | { kind: "relay"; file: File }
    | { kind: "drive-upload"; file: File; connectionId?: string }
    | { kind: "drive-existing"; selection: Extract<AdvancedPickerSelection, { kind: "drive" }> };
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

const UPLOAD_INACTIVITY_TIMEOUT_MS = 20_000;

async function withUploadInactivityTimeout<T>(controller: AbortController, upload: (signal: AbortSignal, keepAlive: () => void) => Promise<T>) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const aborted = new Promise<never>((_, reject) => {
    const rejectAbort = () => reject(controller.signal.reason instanceof Error ? controller.signal.reason : new DOMException("Upload cancelled.", "AbortError"));
    if (controller.signal.aborted) rejectAbort();
    else controller.signal.addEventListener("abort", rejectAbort, { once: true });
  });
  const keepAlive = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      controller.abort(new Error("Upload stopped because the connection is no longer responding. Try again."));
    }, UPLOAD_INACTIVITY_TIMEOUT_MS);
  };
  keepAlive();
  try {
    return await Promise.race([upload(controller.signal, keepAlive), aborted]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function useAttachments(live: Room<Mosh>, input: { showingDm: boolean; channelId?: string; threadId?: string; committedDm?: boolean; roomName?: string }) {
  const scope = useMemo(() => attachmentScope(input), [input.channelId, input.showingDm, input.threadId, input.committedDm]);
  const rawFiles = useMemo(() => scopedRecords(live.select.records("files") as unknown as EncryptedFileRecord[], scope), [live.select, live.state.files, scope]);
  const [fileMetadata, setFileMetadata] = useState<Record<string, { title: string; fileName: string; mimeType: string }>>({});
  const attachments = useMemo(() => scopedRecords(live.select.records("attachments") as unknown as AttachmentRecord[], scope), [live.select, live.state.attachments, scope]);
  const [transfer, setTransfer] = useState<AttachmentTransferState>({ phase: "idle" });
  const [, setPendingRevision] = useState(0);
  const pendingAttachmentIds = useRef(createPendingAttachmentIds());
  const activeUploadRef = useRef<{ controller: AbortController; draftId: string } | undefined>(undefined);
  const [pendingDrafts, setPendingDrafts] = useState<PendingAttachmentDraft[]>([]);
  const currentScopeKey = scope ? `${scope.scopeType}:${scope.scopeId}` : "";
  const drivePickerAdapter = useMemo<DrivePickerAdapter | undefined>(
    () => live.driveManagement ? createDrivePickerAdapter(live.driveManagement) : undefined,
    [live.driveManagement]
  );

  useEffect(() => {
    if (typeof live.files.inspect !== "function" || rawFiles.length === 0) return;
    let active = true;
    void Promise.all(rawFiles.filter((file) => !file.removedAt).map(async (file) => {
      try {
        const metadata = await live.files.inspect(file as unknown as FilesPublicRecord);
        return [file.fileId, { title: metadata.title, fileName: metadata.fileName, mimeType: metadata.mimeType }] as const;
      } catch {
        return undefined;
      }
    })).then((entries) => {
      if (!active) return;
      const next = Object.fromEntries(entries.filter((entry) => entry !== undefined));
      setFileMetadata((current) => {
        const nextKeys = Object.keys(next);
        if (nextKeys.length === Object.keys(current).length && nextKeys.every((key) => (
          current[key]?.title === next[key].title
          && current[key]?.fileName === next[key].fileName
          && current[key]?.mimeType === next[key].mimeType
        ))) return current;
        return next;
      });
    });
    return () => { active = false; };
  }, [live.files, rawFiles]);

  const files = useMemo(() => rawFiles.map((file) => ({ ...file, ...fileMetadata[file.fileId] })), [fileMetadata, rawFiles]);

  const queueDraft = useCallback((draft: Omit<PendingAttachmentDraft, "id" | "scopeKey">) => {
    if (!scope) return;
    setPendingDrafts((current) => [...current, { ...draft, id: crypto.randomUUID(), scopeKey: currentScopeKey }]);
    setTransfer({ phase: "idle" });
  }, [currentScopeKey, scope]);

  const uploadFile = useCallback(async (file: File) => {
    queueDraft({ name: file.name, mimeType: file.type || "application/octet-stream", destination: "relay", source: { kind: "relay", file } });
  }, [queueDraft]);

  const consumePendingAttachmentIds = useCallback(() => {
    const ids = pendingAttachmentIds.current.take(currentScopeKey);
    setPendingRevision((revision) => revision + 1);
    return ids;
  }, [currentScopeKey]);

  const uploadLocalToDrive = useCallback(async (file: File, selectedConnectionId?: string) => {
    if (!scope || !drivePickerAdapter || !input.roomName) throw new Error("Google Drive room sharing is unavailable for this scope.");
    const connections = await drivePickerAdapter.listConnections();
    const connection = connections.find((item) => item.connectionId === selectedConnectionId) || (selectedConnectionId ? undefined : connections[0]);
    if (!connection) throw new Error("No eligible Google Drive account is connected.");
    const uploaded = await drivePickerAdapter.uploadLocalFile({
      connectionId: connection.connectionId,
      roomId: input.roomName,
      file,
      mimeType: file.type || "application/octet-stream"
    });
    let asset;
    try {
      asset = await drivePickerAdapter.shareToRoom(connection.connectionId, {
        id: uploaded.file.id,
        name: uploaded.file.name,
        mimeType: uploaded.file.mimeType,
        size: uploaded.file.size,
        isFolder: false
      }, scope);
    } catch (error) {
      let cleanupFailed = false;
      try { await drivePickerAdapter.remove(connection.connectionId, uploaded.file.id); } catch { cleanupFailed = true; }
      throw new DriveRoomUploadPartialError(
        cleanupFailed ? "Google Drive sharing failed, and the uploaded file could not be removed." : "Google Drive sharing failed. The uploaded file was removed.",
        uploaded.file.id,
        cleanupFailed,
        { cause: error }
      );
    }
    return asset;
  }, [drivePickerAdapter, input.roomName, scope]);

  const shareToGoogleDrive = useCallback(async (file: File) => {
    queueDraft({ name: file.name, mimeType: file.type || "application/octet-stream", destination: "google-drive", source: { kind: "drive-upload", file } });
  }, [queueDraft]);

  const shareAdvancedSelection = useCallback(async (selection: AdvancedPickerSelection) => {
    if (selection.kind === "local") {
      queueDraft({ name: selection.file.name, mimeType: selection.file.type || "application/octet-stream", destination: "relay", source: { kind: "relay", file: selection.file } });
      return;
    }
    queueDraft({ name: selection.file.name, mimeType: selection.file.mimeType, destination: "google-drive", source: { kind: "drive-existing", selection } });
  }, [queueDraft]);

  const attachAdvancedLocalFile = useCallback(async (file: File) => {
    await uploadFile(file);
  }, [uploadFile]);

  const uploadAdvancedLocalToDrive = useCallback(async (file: File, connectionId: string) => {
    queueDraft({ name: file.name, mimeType: file.type || "application/octet-stream", destination: "google-drive", source: { kind: "drive-upload", file, connectionId } });
  }, [queueDraft]);

  const advancedPicker = useMemo<AttachmentPickerConfig | undefined>(() => {
    // Keep the ordinary encrypted picker available when Drive is not exposed;
    // the advanced surface must never intercept a local file and then fail
    // because its authoritative Drive host is absent.
    if (!drivePickerAdapter) return undefined;
    return {
      adapter: drivePickerAdapter,
      onSelect: shareAdvancedSelection,
      onLocalFile: attachAdvancedLocalFile,
      onLocalDriveUpload: uploadAdvancedLocalToDrive,
      roomName: input.roomName,
      scopeId: scope?.scopeId,
      scopeType: scope?.scopeType
    };
  }, [attachAdvancedLocalFile, drivePickerAdapter, input.roomName, scope?.scopeId, scope?.scopeType, shareAdvancedSelection, uploadAdvancedLocalToDrive]);

  const pendingAttachments = useMemo<PendingAttachmentPreview[]>(
    () => pendingDrafts.filter((draft) => draft.scopeKey === currentScopeKey).map(({ id, name, mimeType, destination }) => ({ id, name, mimeType, destination })),
    [currentScopeKey, pendingDrafts]
  );

  const removePendingAttachment = useCallback((id: string) => {
    if (activeUploadRef.current?.draftId === id) {
      activeUploadRef.current.controller.abort(new DOMException("Upload cancelled.", "AbortError"));
      setTransfer({ phase: "idle" });
    }
    setPendingDrafts((current) => current.filter((draft) => draft.id !== id || draft.scopeKey !== currentScopeKey));
  }, [currentScopeKey]);

  const clearPendingAttachments = useCallback(() => {
    setPendingDrafts((current) => current.filter((draft) => draft.scopeKey !== currentScopeKey));
  }, [currentScopeKey]);

  const publishPendingAttachments = useCallback(async () => {
    if (!scope) return [];
    const drafts = pendingDrafts.filter((draft) => draft.scopeKey === currentScopeKey);
    const attachmentIds: string[] = [];
    try {
      for (const draft of drafts) {
        const source = draft.source;
        if (source.kind === "relay") {
          setTransfer({ phase: "uploading", name: draft.name, progress: 0 });
          const controller = new AbortController();
          activeUploadRef.current = { controller, draftId: draft.id };
          const result = await withUploadInactivityTimeout(controller, (signal, keepAlive) => live.files.upload({
              file: source.file,
              title: draft.name,
              scopeType: scope.scopeType,
              scopeId: scope.scopeId,
              signal,
              onProgress: (progress) => {
                keepAlive();
                setTransfer((current) => ({ ...current, progress: progress.totalBytes ? progress.completedBytes / progress.totalBytes : 0 }));
              }
            })).finally(() => {
              if (activeUploadRef.current?.controller === controller) activeUploadRef.current = undefined;
            });
          attachmentIds.push(result.record.fileId);
          continue;
        }
        setTransfer({ phase: "sharing", name: draft.name, progress: 0 });
        if (source.kind === "drive-upload") {
          const asset = await uploadLocalToDrive(source.file, source.connectionId);
          attachmentIds.push(asset.assetId);
          continue;
        }
        if (!drivePickerAdapter) throw new Error("Google Drive room sharing is unavailable for this scope.");
        const selection = source.selection;
        const asset = await drivePickerAdapter.shareToRoom(selection.connectionId, selection.file, scope);
        attachmentIds.push(asset.assetId);
      }
      for (const attachmentId of attachmentIds) pendingAttachmentIds.current.add(currentScopeKey, attachmentId);
      setPendingRevision((revision) => revision + 1);
      setTransfer({ phase: "idle" });
      return attachmentIds;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setTransfer({ phase: "idle" });
        return [];
      }
      setTransfer({ phase: "idle", error: errorMessage(error), ...(error instanceof DriveRoomUploadPartialError ? { recovery: { fileId: error.fileId, cleanupFailed: error.cleanupFailed } } : {}) });
      return [];
    }
  }, [currentScopeKey, drivePickerAdapter, live, pendingDrafts, scope, uploadLocalToDrive]);

  const downloadFile = useCallback(async (record: EncryptedFileRecord) => {
    setTransfer({ phase: "downloading", name: record.fileId });
    try {
      const result = await live.files.download(record as unknown as FilesPublicRecord);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName || result.title || record.fileId;
      anchor.click();
      URL.revokeObjectURL(url);
      setTransfer({ phase: "idle" });
    } catch (error) {
      setTransfer({ phase: "idle", error: errorMessage(error) });
    }
  }, [live]);

  const previewFile = useCallback(async (record: EncryptedFileRecord) => {
    const result = await live.files.download(record as unknown as FilesPublicRecord);
    return result.blob;
  }, [live.files]);

  const openAttachment = useCallback(async (attachment: AttachmentRecord) => {
    if (attachment.assetId) {
      if (!live.driveManagement) {
        setTransfer({ phase: "idle", error: "Google Drive room asset access is unavailable." });
        return;
      }
      setTransfer({ phase: "downloading", name: attachment.title || attachment.assetId });
      try {
        const result = await live.driveManagement.fetchRoomAsset({ assetId: attachment.assetId, asset: attachment as never });
        if ("blob" in result) {
          const url = URL.createObjectURL(result.blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = result.fileName || result.title;
          anchor.click();
          URL.revokeObjectURL(url);
        } else {
          window.open(result.url, "_blank", "noopener,noreferrer");
        }
        setTransfer({ phase: "idle" });
      } catch (error) {
        setTransfer({ phase: "idle", error: errorMessage(error) });
      }
      return;
    }
    setTransfer({ phase: "idle", error: "Attachment access requires an authoritative Drive asset id." });
  }, [live]);

  const pendingAttachmentCount = pendingAttachments.length;
  return { advancedPicker, attachments, clearPendingAttachments, consumePendingAttachmentIds, downloadFile, drivePickerAdapter, files, openAttachment, pendingAttachmentCount, pendingAttachments, previewFile, publishPendingAttachments, removePendingAttachment, scope, shareToGoogleDrive, transfer, uploadFile };
}

export type AttachmentsRuntime = ReturnType<typeof useAttachments>;
