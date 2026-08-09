import { describe, expect, it } from "vitest";
import { attachmentScope, scopedRecords } from "@features/attachments/model/attachmentScope";

describe("attachment scopes", () => {
  it("maps channel and DM views to isolated scopes", () => {
    expect(attachmentScope({ showingDm: false, channelId: "general" })).toEqual({ scopeType: "channel", scopeId: "general" });
    expect(attachmentScope({ showingDm: true, threadId: "direct_9f2c" })).toEqual({ scopeType: "direct.thread", scopeId: "direct_9f2c" });
    expect(attachmentScope({ showingDm: true, threadId: "draft_dm_alice__bob", committedDm: false })).toBeUndefined();
  });

  it("does not expose records from another scope or removed records", () => {
    const records = [
      { scopeType: "channel", scopeId: "general", id: "one" },
      { scopeType: "channel", scopeId: "general", id: "removed", removedAt: 2 },
      { scopeType: "channel", scopeId: "private", id: "other" }
    ];
    expect(scopedRecords(records, { scopeType: "channel", scopeId: "general" }).map((record) => record.id)).toEqual(["one"]);
    expect(scopedRecords(records, undefined)).toEqual([]);
  });
});
