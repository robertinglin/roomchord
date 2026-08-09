import { describe, expect, it } from "vitest";
import { scopedRoomAccessDecision, scopedRoomAccessSummary } from "@entities/chat/model/roles";

const scope = { scopeType: "channel", scopeId: "general" };

describe("scoped voice access", () => {
  it("uses the most specific scoped rule and honors explicit deny", () => {
    expect(scopedRoomAccessDecision([
      { scopeType: "*", scopeId: "*", allowOperations: ["media.room.join"], denyOperations: [] },
      { scopeType: "channel", scopeId: "general", allowOperations: [], denyOperations: ["media.room.join"] }
    ], scope)).toBe("hidden");
    expect(scopedRoomAccessDecision([
      { scopeType: "channel", scopeId: "*", allowOperations: ["media.room.join"], denyOperations: [] }
    ], scope)).toBe("editor");
  });

  it("reports inherited legacy access when no scoped rule is present", () => {
    const room = { id: "voice", name: "Voice", group: "General", allowsVideo: true, locked: false, archivedAt: null, participantCount: 0, roleAccess: { member: "editor" as const } };
    expect(scopedRoomAccessSummary(room, [{ id: "member", name: "Member" }], { member: [] })).toContain("inherit legacy access");
  });
});
