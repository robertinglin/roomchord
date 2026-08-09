import {
  MATTERHORN_GOOGLE_DRIVE_ROOM_UPLOAD_REQUIREMENTS,
  uploadMatterhornFileToGoogleDriveRoom
} from "matterhorn-sdk/file-picker";
import type {
  MatterhornDriveManagementHost,
  MatterhornThirdPartyConnection
} from "matterhorn-sdk/client";
import type { DrivePickerAdapter, DrivePickerEntry } from "@shared/model/drivePickerAdapter";
export type { DrivePickerAdapter, DrivePickerEntry } from "@shared/model/drivePickerAdapter";

// Remote thumbnails and authoritative room sharing both read provider content;
// the room-folder upload helper intentionally has a smaller requirement set.
const REMOTE_PICKER_REQUIRED_FEATURE = "files.content.read";

export function eligibleGoogleDriveConnection(connection: MatterhornThirdPartyConnection): boolean {
  return connection.provider === "google-drive"
    && connection.status === "active"
    && connection.features.includes(REMOTE_PICKER_REQUIRED_FEATURE)
    && MATTERHORN_GOOGLE_DRIVE_ROOM_UPLOAD_REQUIREMENTS.features.every((feature) => connection.features.includes(feature));
}

function driveRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function driveEntries(value: unknown): DrivePickerEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = driveRecord(item);
    if (!record || typeof record.id !== "string" || !record.id || typeof record.name !== "string") return [];
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : "application/octet-stream";
    return [{
      id: record.id,
      name: record.name,
      mimeType,
      ...(Number.isSafeInteger(record.size) && Number(record.size) >= 0 ? { size: Number(record.size) } : {}),
      isFolder: mimeType === "application/vnd.google-apps.folder",
      ...(typeof record.path === "string" ? { path: record.path } : {})
    }];
  });
}

export function createDrivePickerAdapter(management: MatterhornDriveManagementHost): DrivePickerAdapter {
  return {
    async listConnections() {
      const connections = await management.listConnections({ disclosures: ["accountLabel"] });
      return connections.filter(eligibleGoogleDriveConnection);
    },

    async listFiles(connectionId, parentId = "root") {
      const result = await management.request({
        connectionId,
        operation: "files.list",
        params: {
          q: `'${parentId.replace(/'/g, "\\'")}' in parents and trashed = false`,
          fields: "files(id,name,mimeType,size,createdTime,parents)",
          pageSize: 100,
          orderBy: "folder,name",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        }
      });
      return driveEntries(driveRecord(result)?.files).sort((left, right) => {
        if (left.isFolder !== right.isFolder) return left.isFolder ? -1 : 1;
        return left.name.localeCompare(right.name);
      });
    },

    async download(connectionId, file, signal) {
      const result = await management.download({
        connectionId,
        fileId: file.id,
        ...(file.path ? { path: file.path } : {}),
        signal
      });
      return result.blob;
    },

    async shareToRoom(connectionId, file, input) {
      return management.shareToRoom({
        connectionId,
        fileId: file.id,
        ...(file.path ? { path: file.path } : {}),
        title: file.name,
        mimeType: file.mimeType,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        ...(file.size === undefined ? {} : { sizeBytes: file.size }),
        purpose: "attachment"
      });
    },

    async uploadLocalFile(input) {
      return uploadMatterhornFileToGoogleDriveRoom({
        request: (value) => management.request(value),
        upload: async (value) => management.upload(value),
        createShareLink: async (value) => management.createShareLink(value),
        remove: async (value) => management.remove(value)
      }, input);
    },

    async remove(connectionId, fileId) {
      return management.remove({ connectionId, fileId });
    }
  };
}
