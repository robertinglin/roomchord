import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAttachments } from "@features/attachments/model/useAttachments";

const file = () => new File(["hello"], "hello.txt", { type: "text/plain" });

function liveFixture(overrides: Record<string, unknown> = {}) {
  const records: Record<string, unknown[]> = {
    files: [],
    attachments: []
  };
  const live = {
    state: { files: {}, attachments: {} },
    select: { records: (collection: string) => records[collection] || [] },
    files: {
      upload: vi.fn(async (input: { onProgress: (value: { completedBytes: number; totalBytes: number }) => void }) => {
        input.onProgress({ completedBytes: 5, totalBytes: 10 });
        return { record: { fileId: "file-1", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 5, chunkCount: 1, relays: [] } };
      }),
      inspect: vi.fn(async () => ({ title: "hello.txt", fileName: "hello.txt", mimeType: "text/plain" })),
      download: vi.fn(async () => ({ blob: new Blob(["file"]), fileName: "hello.txt", title: "hello.txt" }))
    },
    ...overrides
  } as any;
  return { live, records };
}

afterEach(() => vi.restoreAllMocks());

describe("useAttachments", () => {
  it("decrypts safe file metadata for attachment embeds", async () => {
    const { live, records } = liveFixture();
    records.files.push({ fileId: "file-1", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 5, chunkCount: 1, relays: [] });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general" }));

    await waitFor(() => expect(result.current.files[0]).toEqual(expect.objectContaining({ title: "hello.txt", mimeType: "text/plain" })));
    expect(live.files.inspect).toHaveBeenCalled();
  });

  it("queues a relay draft and uploads it only when the message is submitted", async () => {
    const { live } = liveFixture();
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general" }));

    await act(async () => result.current.uploadFile(file()));

    expect(live.files.upload).not.toHaveBeenCalled();
    expect(result.current.pendingAttachments).toEqual([expect.objectContaining({ name: "hello.txt", destination: "relay" })]);
    await act(async () => { await result.current.publishPendingAttachments(); });
    expect(live.files.upload).toHaveBeenCalledWith(expect.objectContaining({ title: "hello.txt", scopeType: "channel", scopeId: "general" }));
    expect(result.current.transfer).toEqual({ phase: "idle" });
    expect(result.current.pendingAttachmentCount).toBe(1);
    let consumed: string[] = [];
    act(() => { consumed = result.current.consumePendingAttachmentIds(); });
    expect(consumed).toEqual(["file-1"]);
    act(() => result.current.clearPendingAttachments());
    expect(result.current.pendingAttachmentCount).toBe(0);
  });

  it("keeps a submit-time upload error visible and retains the draft", async () => {
    const upload = vi.fn(async () => { throw new Error("relay unavailable"); });
    const { live } = liveFixture({ files: { upload, download: vi.fn() } });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general" }));

    await act(async () => result.current.uploadFile(file()));
    await act(async () => { await result.current.publishPendingAttachments(); });

    expect(result.current.transfer).toEqual({ phase: "idle", error: "relay unavailable" });
    expect(result.current.pendingAttachmentCount).toBe(1);
    expect(result.current.consumePendingAttachmentIds()).toEqual([]);
  });

  it("handles zero-byte progress and non-Error transport rejections", async () => {
    const upload = vi.fn(async (input: { onProgress: (value: { completedBytes: number; totalBytes: number }) => void }) => {
      input.onProgress({ completedBytes: 0, totalBytes: 0 });
      throw "relay closed";
    });
    const { live } = liveFixture({ files: { upload, download: vi.fn() } });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general" }));

    await act(async () => result.current.uploadFile(file()));
    await act(async () => { await result.current.publishPendingAttachments(); });

    expect(result.current.transfer).toEqual({ phase: "idle", error: "relay closed" });
    expect(result.current.pendingAttachmentCount).toBe(1);
  });

  it("abandons an unresponsive upload and leaves the draft retryable", async () => {
    vi.useFakeTimers();
    const upload = vi.fn(() => new Promise(() => undefined));
    const { live } = liveFixture({ files: { upload, download: vi.fn() } });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general" }));

    try {
      await act(async () => result.current.uploadFile(file()));
      let publishing!: Promise<string[]>;
      act(() => { publishing = result.current.publishPendingAttachments(); });
      expect(result.current.transfer).toEqual({ phase: "uploading", name: "hello.txt", progress: 0 });

      await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
      await act(async () => { await publishing; });

      expect(result.current.transfer).toEqual({ phase: "idle", error: "Upload stopped because the connection is no longer responding. Try again." });
      expect(result.current.pendingAttachments).toEqual([expect.objectContaining({ name: "hello.txt" })]);
      expect(result.current.consumePendingAttachmentIds()).toEqual([]);
      expect(upload.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
      expect(upload.mock.calls[0][0].signal.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels an active upload when its draft is removed", async () => {
    const upload = vi.fn(() => new Promise(() => undefined));
    const { live } = liveFixture({ files: { upload, download: vi.fn() } });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general" }));

    await act(async () => result.current.uploadFile(file()));
    const draftId = result.current.pendingAttachments[0].id;
    let publishing!: Promise<string[]>;
    act(() => { publishing = result.current.publishPendingAttachments(); });
    act(() => result.current.removePendingAttachment(draftId));
    await act(async () => { await publishing; });

    expect(result.current.transfer).toEqual({ phase: "idle" });
    expect(result.current.pendingAttachments).toEqual([]);
    expect(upload.mock.calls[0][0].signal.aborted).toBe(true);
  });

  it("shares through an existing Google Drive connection", async () => {
    const request = vi.fn(async ({ operation }: { operation: string }) => operation === "files.list" ? { files: [{ id: "folder" }] } : {});
    const upload = vi.fn(async () => ({ id: "uploaded", name: "hello.txt", mimeType: "text/plain" }));
    const shareToRoom = vi.fn(async () => ({ assetId: "asset-existing", fileId: "uploaded", title: "hello.txt", mimeType: "text/plain", scopeType: "channel", scopeId: "general" }));
    const driveManagement = {
      listConnections: vi.fn(async () => [{ connectionId: "gdrive-1", provider: "google-drive", status: "active", brokerIdentity: "drive", scopes: [], features: ["files.metadata.read", "files.content.read", "files.create", "files.delete", "permissions.write"], updatedAt: 1 }]),
      request,
      upload,
      createShareLink: vi.fn(async () => ({ url: "https://drive.example/file" })),
      remove: vi.fn(async () => ({ removed: true })),
      download: vi.fn(),
      shareToRoom
    };
    const { live } = liveFixture({ driveManagement });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general", roomName: "general" }));

    await act(async () => result.current.shareToGoogleDrive(file()));

    expect(upload).not.toHaveBeenCalled();
    await act(async () => { await result.current.publishPendingAttachments(); });
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ name: "hello.txt", parentId: "folder" }));
    expect(shareToRoom).toHaveBeenCalledWith(expect.objectContaining({
      connectionId: "gdrive-1",
      fileId: "uploaded",
      title: "hello.txt",
      scopeType: "channel",
      scopeId: "general",
      purpose: "attachment"
    }));
    expect(result.current.consumePendingAttachmentIds()).toEqual(["asset-existing"]);
  });

  it("keeps advanced local actions separate and honors the selected Drive connection", async () => {
    const request = vi.fn(async ({ operation }: { operation: string }) => operation === "files.list" ? { files: [{ id: "folder" }] } : {});
    const upload = vi.fn(async () => ({ id: "uploaded", name: "hello.txt", mimeType: "text/plain" }));
    const shareToRoom = vi.fn(async () => { throw new Error("room share denied"); });
    const remove = vi.fn(async () => ({ removed: true }));
    const driveManagement = {
      listConnections: vi.fn(async () => [
        { connectionId: "gdrive-1", provider: "google-drive", status: "active", brokerIdentity: "one", scopes: [], features: ["files.metadata.read", "files.content.read", "files.create", "files.delete", "permissions.write"], updatedAt: 1 },
        { connectionId: "gdrive-2", provider: "google-drive", status: "active", brokerIdentity: "two", scopes: [], features: ["files.metadata.read", "files.content.read", "files.create", "files.delete", "permissions.write"], updatedAt: 1 }
      ]), request, upload, createShareLink: vi.fn(async () => ({ url: "https://drive.example/file" })), remove, download: vi.fn(), shareToRoom
    };
    const { live } = liveFixture({ driveManagement });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general", roomName: "general" }));
    await act(async () => result.current.advancedPicker?.onLocalFile?.(file()));
    await act(async () => result.current.advancedPicker?.onLocalDriveUpload?.(file(), "gdrive-2"));
    expect(live.files.upload).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    await act(async () => { await result.current.publishPendingAttachments(); });
    expect(live.files.upload).toHaveBeenCalled();
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ connectionId: "gdrive-2" }));
    expect(remove).toHaveBeenCalledWith({ connectionId: "gdrive-2", fileId: "uploaded" });
    expect(result.current.transfer.recovery).toEqual({ fileId: "uploaded", cleanupFailed: false });
  });

  it("surfaces manual recovery when authoritative Drive cleanup fails", async () => {
    const request = vi.fn(async ({ operation }: { operation: string }) => operation === "files.list" ? { files: [{ id: "folder" }] } : {});
    const driveManagement = {
      listConnections: vi.fn(async () => [{ connectionId: "gdrive-1", provider: "google-drive", status: "active", brokerIdentity: "one", scopes: [], features: ["files.metadata.read", "files.content.read", "files.create", "files.delete", "permissions.write"], updatedAt: 1 }]),
      request,
      upload: vi.fn(async () => ({ id: "orphan", name: "hello.txt", mimeType: "text/plain" })),
      createShareLink: vi.fn(async () => ({ url: "https://drive.example/file" })),
      remove: vi.fn(async () => { throw new Error("remove denied"); }),
      download: vi.fn(),
      shareToRoom: vi.fn(async () => { throw new Error("room share denied"); })
    };
    const { result } = renderHook(() => useAttachments(liveFixture({ driveManagement }).live, { showingDm: false, channelId: "general", roomName: "general" }));
    await act(async () => result.current.shareToGoogleDrive(file()));
    await act(async () => { await result.current.publishPendingAttachments(); });
    expect(result.current.transfer.recovery).toEqual({ fileId: "orphan", cleanupFailed: true });
  });

  it("rejects local Drive sharing when no eligible Google Drive account is connected", async () => {
    const driveManagement = {
      listConnections: vi.fn(async () => []),
      request: vi.fn(),
      upload: vi.fn(),
      createShareLink: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
      shareToRoom: vi.fn()
    };
    const { live } = liveFixture({ driveManagement });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general", roomName: "general" }));

    await act(async () => result.current.shareToGoogleDrive(file()));
    await act(async () => { await result.current.publishPendingAttachments(); });

    expect(result.current.transfer.error).toBe("No eligible Google Drive account is connected.");
    expect(result.current.consumePendingAttachmentIds()).toEqual([]);
  });

  it("reports unavailable Drive configuration and missing host capabilities", async () => {
    const missingProvider = {
      listConnections: vi.fn(async () => []),
      request: vi.fn(),
      upload: vi.fn(),
      createShareLink: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
      shareToRoom: vi.fn()
    };
    const { live } = liveFixture({ driveManagement: missingProvider });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general", roomName: "general" }));

    await act(async () => result.current.shareToGoogleDrive(file()));
    await act(async () => { await result.current.publishPendingAttachments(); });
    expect(result.current.transfer.error).toBe("No eligible Google Drive account is connected.");

    const capabilityFailure = { ...missingProvider, listConnections: vi.fn(async () => { throw new Error("Matterhorn app did not declare optional capability"); }) };
    const second = renderHook(() => useAttachments(liveFixture({ driveManagement: capabilityFailure }).live, { showingDm: false, channelId: "general", roomName: "general" }));
    await act(async () => second.result.current.shareToGoogleDrive(file()));
    await act(async () => { await second.result.current.publishPendingAttachments(); });
    expect(second.result.current.transfer.error).toContain("optional capability");
  });

  it("queues only an authoritative Drive asset returned for the active channel scope", async () => {
    const driveManagement = {
      listConnections: vi.fn(async () => []),
      request: vi.fn(),
      upload: vi.fn(),
      createShareLink: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
      shareToRoom: vi.fn(async () => ({ assetId: "asset-authoritative", fileId: "file", title: "notes.pdf", mimeType: "application/pdf", scopeType: "channel", scopeId: "general" }))
    };
    const { result } = renderHook(() => useAttachments(liveFixture({ driveManagement }).live, { showingDm: false, channelId: "general", roomName: "general" }));

    await act(async () => result.current.advancedPicker.onSelect?.({
      kind: "drive",
      connectionId: "gdrive-1",
      file: { id: "file", name: "notes.pdf", mimeType: "application/pdf", isFolder: false },
      asset: { assetId: "asset-authoritative", fileId: "file", title: "notes.pdf", mimeType: "application/pdf", scopeType: "channel", scopeId: "general" }
    }));

    expect(driveManagement.shareToRoom).not.toHaveBeenCalled();
    await act(async () => { await result.current.publishPendingAttachments(); });
    expect(result.current.consumePendingAttachmentIds()).toEqual(["asset-authoritative"]);
  });

  it("leaves advanced local selection to the explicit local upload callback", async () => {
    const driveManagement = {
      listConnections: vi.fn(async () => []), request: vi.fn(), upload: vi.fn(), createShareLink: vi.fn(), remove: vi.fn(), download: vi.fn(), shareToRoom: vi.fn()
    };
    const { result } = renderHook(() => useAttachments(liveFixture({ driveManagement }).live, { showingDm: false, channelId: "general", roomName: "general" }));

    await act(async () => result.current.advancedPicker?.onSelect?.({ kind: "local", file: file() }));

    expect(result.current.transfer).toEqual({ phase: "idle" });
    expect(result.current.pendingAttachments).toEqual([expect.objectContaining({ name: "hello.txt" })]);
    expect(result.current.consumePendingAttachmentIds()).toEqual([]);
  });

  it("does not silently fall back when an explicitly selected Drive account is unavailable", async () => {
    const driveManagement = {
      listConnections: vi.fn(async () => [{ connectionId: "gdrive-1", provider: "google-drive", status: "active", brokerIdentity: "one", scopes: [], features: ["files.metadata.read", "files.content.read", "files.create", "files.delete", "permissions.write"], updatedAt: 1 }]),
      request: vi.fn(), upload: vi.fn(), createShareLink: vi.fn(), remove: vi.fn(), download: vi.fn(), shareToRoom: vi.fn()
    };
    const { result } = renderHook(() => useAttachments(liveFixture({ driveManagement }).live, { showingDm: false, channelId: "general", roomName: "general" }));

    await act(async () => result.current.advancedPicker?.onLocalDriveUpload?.(file(), "missing-account"));
    await act(async () => { await result.current.publishPendingAttachments(); });
    expect(result.current.transfer.error).toBe("No eligible Google Drive account is connected.");
    expect(driveManagement.request).not.toHaveBeenCalled();
  });

  it("shares a selected Drive file into the active room only on submit", async () => {
    const shareToRoom = vi.fn(async () => ({ assetId: "room-asset", fileId: "file", title: "notes.pdf", mimeType: "application/pdf", scopeType: "channel", scopeId: "general" }));
    const { live } = liveFixture({ driveManagement: { shareToRoom } });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general", roomName: "general" }));

    await act(async () => result.current.advancedPicker?.onSelect?.({
      kind: "drive",
      connectionId: "gdrive-1",
      file: { id: "file", name: "notes.pdf", mimeType: "application/pdf", isFolder: false },
    }));
    expect(shareToRoom).not.toHaveBeenCalled();
    await act(async () => { await result.current.publishPendingAttachments(); });
    expect(shareToRoom).toHaveBeenCalledWith(expect.objectContaining({ scopeType: "channel", scopeId: "general" }));
    expect(result.current.consumePendingAttachmentIds()).toEqual(["room-asset"]);
  });

  it("downloads encrypted files and opens only authoritative Drive assets", async () => {
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const driveManagement = {
      fetchRoomAsset: vi.fn()
    };
    const { live } = liveFixture({ driveManagement });
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general" }));
    const record = { fileId: "file-1", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 1, chunkCount: 1, relays: [] };

    await expect(result.current.previewFile(record)).resolves.toBeInstanceOf(Blob);

    await act(async () => result.current.downloadFile(record));
    expect(createObjectUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();

    driveManagement.fetchRoomAsset.mockResolvedValueOnce({ blob: new Blob(["asset"]), fileName: "asset.txt", title: "asset" });
    await act(async () => result.current.openAttachment({ id: "a1", assetId: "asset-1", title: "asset" }));
    driveManagement.fetchRoomAsset.mockResolvedValueOnce({ url: "https://drive.google.com/file/asset", title: "asset" });
    await act(async () => result.current.openAttachment({ id: "a2", assetId: "asset-2", title: "asset" }));
    await act(async () => result.current.openAttachment({ id: "a3", url: "https://drive.google.com/file/link" }));
    expect(open).toHaveBeenCalledWith("https://drive.google.com/file/asset", "_blank", "noopener,noreferrer");
    expect(open).toHaveBeenCalledTimes(1);
    expect(result.current.transfer.error).toBe("Attachment access requires an authoritative Drive asset id.");
  });

  it("does nothing when no scope or Drive host exists", async () => {
    const { live } = liveFixture();
    const { result } = renderHook(() => useAttachments(live, { showingDm: true }));
    await act(async () => {
      await result.current.uploadFile(file());
      await result.current.shareToGoogleDrive(file());
    });
    expect(live.files.upload).not.toHaveBeenCalled();
    expect(result.current.consumePendingAttachmentIds()).toEqual([]);
  });

  it("fails closed for a Drive asset when the authoritative host is unavailable", async () => {
    const { live } = liveFixture();
    const { result } = renderHook(() => useAttachments(live, { showingDm: false, channelId: "general" }));

    await act(async () => result.current.openAttachment({ id: "asset-record", assetId: "asset-1", url: "https://drive.google.com/file/fallback" }));

    expect(result.current.transfer.error).toBe("Google Drive room asset access is unavailable.");
  });

  it("uses the canonical reserved direct-thread id for draft attachment scope", async () => {
    const { live } = liveFixture();
    const reserved = renderHook(() => useAttachments(live, { showingDm: true, threadId: "mh-reserved-thread", committedDm: true }));

    await act(async () => reserved.result.current.uploadFile(file()));
    expect(live.files.upload).not.toHaveBeenCalled();
    await act(async () => { await reserved.result.current.publishPendingAttachments(); });
    expect(live.files.upload).toHaveBeenCalledWith(expect.objectContaining({ scopeType: "direct.thread", scopeId: "mh-reserved-thread" }));
    expect(reserved.result.current.consumePendingAttachmentIds()).toEqual(["file-1"]);

    const unreserved = renderHook(() => useAttachments(live, { showingDm: true, threadId: "draft_dm_alice__bob", committedDm: false }));
    await act(async () => unreserved.result.current.uploadFile(file()));
    expect(unreserved.result.current.scope).toBeUndefined();
    expect(live.files.upload).toHaveBeenCalledTimes(1);
  });
});
