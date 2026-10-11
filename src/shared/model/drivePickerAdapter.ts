import type {
  ThirdPartyConnection
} from "matterhorn-sdk/client";
import type { DriveRoomUploadResult } from "matterhorn-sdk/file-picker";
import type { AttachmentPickerDriveEntry } from "@shared/model/attachmentPicker";

export type DrivePickerEntry = AttachmentPickerDriveEntry;

/** Drive operations used by attachment surfaces. */
export type DrivePickerAdapter = {
  listConnections(): Promise<ThirdPartyConnection[]>;
  listFiles(connectionId: string, parentId?: string): Promise<DrivePickerEntry[]>;
  download(connectionId: string, file: DrivePickerEntry, signal: AbortSignal): Promise<Blob>;
  shareToRoom(connectionId: string, file: DrivePickerEntry, input: { scopeType: string; scopeId: string }): Promise<{
    assetId: string;
    fileId: string;
    title: string;
    mimeType: string;
    scopeType: string;
    scopeId: string;
  }>;
  uploadLocalFile(input: { connectionId: string; roomId: string; file: File; mimeType?: string }): Promise<DriveRoomUploadResult>;
  remove(connectionId: string, fileId: string): Promise<{ removed: boolean }>;
};
