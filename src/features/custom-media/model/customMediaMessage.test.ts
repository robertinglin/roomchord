import { describe, expect, it, vi } from "vitest";
import { customMediaForMessage, projectCustomMediaRecords } from "@shared/model/customMediaMessage";

const records = [
  { id: "emoji-1", scopeType: "channel", scopeId: "general", mediaType: "emoji" as const, name: "Party", reference: { kind: "files-v2" as const, id: "file-1" }, render: { mode: "image" as const, altText: "Party" } },
  { id: "voice-1", scopeType: "channel", scopeId: "general", mediaType: "voice" as const, name: "Voice", reference: { kind: "files-v2" as const, id: "file-2" }, render: { mode: "audio" as const, durationMs: 1000 } },
  { id: "sticker-1", scopeType: "channel", scopeId: "general", mediaType: "sticker" as const, name: "Sticker", reference: { kind: "files-v2" as const, id: "file-4" }, render: { mode: "image" as const } },
  { id: "gif-1", scopeType: "channel", scopeId: "general", mediaType: "gif" as const, name: "GIF", reference: { kind: "files-v2" as const, id: "file-5" }, render: { mode: "video" as const } },
  { id: "removed", scopeType: "channel", scopeId: "general", mediaType: "gif" as const, name: "Removed", removedAt: 12, reference: { kind: "files-v2" as const, id: "file-3" }, render: { mode: "image" as const } }
];

describe("custom media message projection", () => {
  it("projects only live records through the SDK validator", () => {
    const safe = vi.fn((value: unknown) => value as { mode: "image" | "audio" | "video" | "external" });
    expect(projectCustomMediaRecords(records, safe)).toHaveLength(4);
    expect(safe).toHaveBeenCalledTimes(4);
  });

  it("fails closed when render metadata is rejected", () => {
    expect(projectCustomMediaRecords(records, () => { throw new Error("unsafe"); })).toEqual([]);
  });

  it("accepts matching references and rejects cross-scope, tombstone, and type mismatches", () => {
    const projected = projectCustomMediaRecords(records, (value) => value as { mode: "image" | "audio" | "video" | "external" });
    expect(customMediaForMessage([
      { mediaId: "emoji-1", scopeType: "channel", scopeId: "general", mediaType: "emoji" },
      { mediaId: "voice-1", scopeType: "channel", scopeId: "other", mediaType: "voice" },
      { mediaId: "voice-1", scopeType: "channel", scopeId: "general", mediaType: "gif" },
      { mediaId: "sticker-1", scopeType: "channel", scopeId: "general", mediaType: "sticker" },
      { mediaId: "gif-1", scopeType: "channel", scopeId: "general", mediaType: "gif" }
    ], projected, "channel", "general")).toEqual([projected[0], projected[2], projected[3]]);
    expect(customMediaForMessage(undefined, projected, "channel", "general")).toEqual([]);
  });
});
