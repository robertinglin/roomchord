export type AttachmentRecord = {
  id: string;
  scopeType?: string;
  scopeId?: string;
  url?: string;
  shareUrl?: string;
  title?: string;
  provider?: string | null;
  providerFileId?: string;
  assetId?: string;
  fileId?: string;
  sourceEnvelope?: unknown;
  mimeType?: string | null;
  sizeBytes?: number | null;
  removedAt?: number | null;
};

export type EncryptedFileRecord = {
  id?: string;
  fileId: string;
  fileName?: string;
  title?: string;
  mimeType?: string;
  scopeType: string;
  scopeId: string;
  encryptedManifest: unknown;
  manifestSha256?: string;
  ciphertextBytes: number;
  chunkCount: number;
  revision?: number;
  relays: Array<{ relayUrl: string; blobId: string }>;
  removedAt?: number | null;
};

export type AttachmentTransferState = {
  phase: "idle" | "uploading" | "sharing" | "downloading";
  name?: string;
  progress?: number;
  error?: string;
  recovery?: { fileId: string; cleanupFailed: boolean };
};

export type PendingAttachmentPreview = {
  id: string;
  name: string;
  mimeType: string;
  destination: "relay" | "google-drive";
};

export type AttachmentPreviewLoader = (file: EncryptedFileRecord) => Promise<Blob>;
