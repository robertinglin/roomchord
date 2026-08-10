import { describe, expect, it } from "vitest";
import { botChannelAccessOverrides } from "./botChannelAccess";

describe("bot channel access", () => {
  it("uses normal member overrides and denies every channel outside the allowlist", () => {
    const channels = [
      { id: "general", scopeType: "channel", scopeId: "general", archivedAt: null },
      { id: "private", scopeType: "channel", scopeId: "private", archivedAt: null },
      { id: "old", scopeType: "channel", scopeId: "old", archivedAt: 1 }
    ] as never;
    expect(botChannelAccessOverrides("bot-member", channels, ["general"])).toEqual([
      { memberId: "bot-member", scopeType: "channel", scopeId: "general", level: "editor", allowOperations: [], denyOperations: [], reason: "Bot channel allowlist" },
      { memberId: "bot-member", scopeType: "channel", scopeId: "private", level: "none", allowOperations: [], denyOperations: [], reason: "Bot channel allowlist" }
    ]);
  });
});
