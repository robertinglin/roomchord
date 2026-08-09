import { describe, expect, it } from "vitest";
import { createPendingAttachmentIds } from "@features/attachments/model/pendingAttachmentIds";

describe("pending attachment linkage", () => {
  it("keeps uploads isolated by scope and only consumes the sent channel", () => {
    const pending = createPendingAttachmentIds();
    pending.add("channel:general", "file-1");
    pending.add("dm:alice__bob", "file-dm");
    expect(pending.count("channel:general")).toBe(1);
    expect(pending.count("dm:alice__bob")).toBe(1);
    expect(pending.take("channel:general")).toEqual(["file-1"]);
    expect(pending.count("channel:general")).toBe(0);
    expect(pending.count("dm:alice__bob")).toBe(1);
    expect(pending.take("dm:alice__bob")).toEqual(["file-dm"]);
    expect(pending.take("channel:general")).toEqual([]);
  });
});
