import type {
  MatterhornThirdPartyConnection
} from "matterhorn-sdk/client";
import type { MatterhornDriveRoomUploadResult } from "matterhorn-sdk/file-picker";
import type { AttachmentPickerDriveEntry } from "@shared/model/attachmentPicker";

export type DrivePickerEntry = AttachmentPickerDriveEntry;

/** Drive operations shared by attachment and custom-media surfaces. */
export type DrivePickerAdapter = {
  listConnections(): Promise<MatterhornThirdPartyConnection[]>;
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
  uploadLocalFile(input: { connectionId: string; roomName: string; file: File; mimeType?: string }): Promise<MatterhornDriveRoomUploadResult>;
  remove(connectionId: string, fileId: string): Promise<{ removed: boolean }>;
};
