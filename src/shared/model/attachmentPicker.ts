import type { FilePickerMode } from "matterhorn-sdk/file-picker";

export type AttachmentPickerDriveEntry = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  isFolder: boolean;
  path?: string;
};

export type AttachmentPickerDriveAdapter = {
  listConnections(): Promise<Array<{ connectionId: string; brokerIdentity: string; accountLabel?: string }>>;
  listFiles(connectionId: string, parentId?: string): Promise<AttachmentPickerDriveEntry[]>;
  download(connectionId: string, file: AttachmentPickerDriveEntry, signal: AbortSignal): Promise<Blob>;
  shareToRoom(connectionId: string, file: AttachmentPickerDriveEntry, input: { scopeType: string; scopeId: string }): Promise<{
    assetId: string;
    fileId: string;
    title: string;
    mimeType: string;
    scopeType: string;
    scopeId: string;
  }>;
  uploadLocalFile(input: { connectionId: string; roomId: string; file: File; mimeType?: string }): Promise<{ file: { id: string; name: string; mimeType: string; size?: number }; url: string }>;
  remove(connectionId: string, fileId: string): Promise<{ removed: boolean }>;
};

export type AdvancedPickerSelection =
  | { kind: "local"; file: File }
  | { kind: "drive"; connectionId: string; file: AttachmentPickerDriveEntry; asset?: { assetId: string; fileId: string; title: string; mimeType: string; scopeType: string; scopeId: string } };

export type AttachmentPickerConfig = {
  adapter?: AttachmentPickerDriveAdapter;
  acceptedMimeTypes?: string;
  mode?: FilePickerMode;
  onSelect?: (selection: AdvancedPickerSelection) => void | Promise<void>;
  onLocalFile?: (file: File) => void | Promise<void>;
  onLocalDriveUpload?: (file: File, connectionId: string) => void | Promise<void>;
  roomName?: string;
  scopeId?: string;
  scopeType?: string;
};
