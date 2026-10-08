import { describe, expect, it, vi } from "vitest";
import {
  createDrivePickerAdapter,
  eligibleGoogleDriveConnection
} from "@features/attachments/model/drivePickerAdapter";

const requiredFeatures = ["files.metadata.read", "files.content.read", "files.create", "files.delete", "permissions.write"];

function connection(overrides: Record<string, unknown> = {}) {
  return {
    connectionId: "google-1",
    provider: "google-drive" as const,
    brokerIdentity: "account@example.com",
    status: "active" as const,
    scopes: [],
    features: requiredFeatures,
    updatedAt: 1,
    ...overrides
  };
}

describe("Drive picker adapter", () => {
  it("accepts only active Google Drive connections with all picker features", () => {
    expect(eligibleGoogleDriveConnection(connection())).toBe(true);
    expect(eligibleGoogleDriveConnection(connection({ status: "revoked" }))).toBe(false);
    expect(eligibleGoogleDriveConnection(connection({ features: requiredFeatures.slice(1) }))).toBe(false);
    expect(eligibleGoogleDriveConnection(connection({ provider: "dropbox" }))).toBe(false);
  });

  it("lists sorted Drive entries and shares remote files as authoritative room assets", async () => {
    const request = vi.fn(async () => ({ files: [
      { id: "file", name: "z.pdf", mimeType: "application/pdf", size: 10 },
      { id: "file-a", name: "a.pdf", mimeType: "application/pdf", size: 10 },
      { id: "folder", name: "A folder", mimeType: "application/vnd.google-apps.folder" }
    ] }));
    const shareToRoom = vi.fn(async () => ({
      assetId: "asset-1",
      fileId: "file",
      provider: "google-drive",
      title: "z.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      purpose: "attachment",
      mediaKind: "file",
      delivery: "direct",
      scopeType: "channel",
      scopeId: "general",
      sourceEnvelope: { encrypted: true, alg: "A256GCM", kind: "room.asset.source.v1", iv: "iv", data: "data" }
    }));
    const adapter = createDrivePickerAdapter({
      listConnections: vi.fn(async () => [connection()]),
      request,
      shareToRoom,
      download: vi.fn(),
      upload: vi.fn(),
      remove: vi.fn(),
      createShareLink: vi.fn()
    } as never);

    await expect(adapter.listConnections()).resolves.toEqual([connection()]);
    const entries = await adapter.listFiles("google-1");
    expect(entries.map((entry) => entry.name)).toEqual(["A folder", "a.pdf", "z.pdf"]);
    const asset = await adapter.shareToRoom("google-1", entries[2], { scopeType: "channel", scopeId: "general" });
    expect(asset.assetId).toBe("asset-1");
    expect(shareToRoom).toHaveBeenCalledWith(expect.objectContaining({
      connectionId: "google-1",
      fileId: "file",
      scopeType: "channel",
      scopeId: "general",
      purpose: "attachment"
    }));
  });

  it("passes Drive thumbnail downloads through with the provider path and abort signal", async () => {
    const download = vi.fn(async () => ({ blob: new Blob(["image"]) }));
    const adapter = createDrivePickerAdapter({
      listConnections: vi.fn(async () => []),
      request: vi.fn(),
      upload: vi.fn(),
      createShareLink: vi.fn(),
      remove: vi.fn(),
      download,
      shareToRoom: vi.fn()
    } as never);
    const signal = new AbortController().signal;
    const blob = await adapter.download("google-1", { id: "image", name: "photo.png", mimeType: "image/png", isFolder: false, path: "/photo.png" }, signal);
    expect(blob.size).toBe(5);
    expect(download).toHaveBeenCalledWith({ connectionId: "google-1", fileId: "image", path: "/photo.png", signal });
  });

  it("normalizes malformed Drive rows and omits optional asset fields when absent", async () => {
    const request = vi.fn(async () => ({ files: [null, {}, { id: "bare", name: "bare.bin", mimeType: 4, size: -1, path: 9 }, { id: "valid", name: "valid.bin" }] }));
    const shareToRoom = vi.fn(async () => ({ assetId: "asset-bare", fileId: "bare", title: "bare.bin", mimeType: "application/octet-stream", scopeType: "channel", scopeId: "general" }));
    const adapter = createDrivePickerAdapter({
      listConnections: vi.fn(async () => []), request, upload: vi.fn(), createShareLink: vi.fn(), remove: vi.fn(), download: vi.fn(), shareToRoom
    } as never);

    await expect(adapter.listFiles("google-1")).resolves.toEqual([
      { id: "bare", name: "bare.bin", mimeType: "application/octet-stream", isFolder: false },
      { id: "valid", name: "valid.bin", mimeType: "application/octet-stream", isFolder: false }
    ]);
    await adapter.shareToRoom("google-1", { id: "bare", name: "bare.bin", mimeType: "application/octet-stream", isFolder: false }, { scopeType: "channel", scopeId: "general" });
    expect(shareToRoom).toHaveBeenCalledWith(expect.not.objectContaining({ path: expect.anything(), sizeBytes: expect.anything() }));
  });

  it("wraps local Drive uploads through Matterhorn's room-folder helper", async () => {
    const request = vi.fn(async ({ operation }: { operation: string }) => operation === "files.list" ? { files: [{ id: "folder" }] } : { id: "created" });
    const upload = vi.fn(async () => ({ id: "file", name: "notes.txt", mimeType: "text/plain" }));
    const createShareLink = vi.fn(async () => ({ url: "https://drive.example/file" }));
    const adapter = createDrivePickerAdapter({
      listConnections: vi.fn(async () => []),
      request,
      upload,
      createShareLink,
      remove: vi.fn(async () => ({ removed: true })),
      download: vi.fn(),
      shareToRoom: vi.fn()
    } as never);

    const result = await adapter.uploadLocalFile({ connectionId: "google-1", roomId: "general", file: new File(["notes"], "notes.txt", { type: "text/plain" }) });
    expect(result.url).toBe("https://drive.example/file");
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ parentId: "folder" }));
  });

  it("keeps the SDK partial-upload cleanup behavior intact", async () => {
    const remove = vi.fn(async () => ({ removed: true }));
    const adapter = createDrivePickerAdapter({
      listConnections: vi.fn(async () => []),
      request: vi.fn(async ({ operation }: { operation: string }) => operation === "files.list" ? { files: [{ id: "folder" }] } : { id: "created" }),
      upload: vi.fn(async () => ({ id: "orphan" })),
      createShareLink: vi.fn(async () => { throw new Error("sharing denied"); }),
      remove,
      download: vi.fn(),
      shareToRoom: vi.fn()
    } as never);

    await expect(adapter.uploadLocalFile({ connectionId: "google-1", roomId: "general", file: new File(["x"], "x.txt") }))
      .rejects.toMatchObject({ fileId: "orphan", cleanupFailed: false });
    expect(remove).toHaveBeenCalledWith({ connectionId: "google-1", fileId: "orphan" });
  });

  it("exposes authoritative Drive removal for room-share recovery", async () => {
    const remove = vi.fn(async () => ({ removed: true }));
    const adapter = createDrivePickerAdapter({
      listConnections: vi.fn(async () => []), request: vi.fn(), upload: vi.fn(), createShareLink: vi.fn(), remove, download: vi.fn(), shareToRoom: vi.fn()
    } as never);
    await expect(adapter.remove("google-1", "file-1")).resolves.toEqual({ removed: true });
    expect(remove).toHaveBeenCalledWith({ connectionId: "google-1", fileId: "file-1" });
  });
});
