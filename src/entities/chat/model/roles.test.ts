import { describe, expect, it } from "vitest";
import { memberOptions, scopedRoomAccessDecision, scopedRoomAccessSummary } from "@entities/chat/model/roles";

const scope = { scopeType: "channel", scopeId: "general" };

describe("scoped voice access", () => {
  it("projects bot kind only from the authoritative member record", () => {
    const actor = { memberId: "self", role: "member", name: "Self" } as never;
    const members = memberOptions(actor, {
      bot: { memberId: "bot", kind: "bot", displayName: "Guest 123", serviceDisplayName: "Helper" },
      spoof: { memberId: "spoof", displayName: "Definitely a BOT", serviceId: "fake.service" }
    } as never, {
      bot: { memberId: "bot", displayName: "Guest 999", status: "online" },
      spoof: { memberId: "spoof", status: "online", activity: "bot" }
    } as never);
    expect(members.find((member) => member.id === "bot")?.kind).toBe("bot");
    expect(members.find((member) => member.id === "bot")?.name).toBe("Helper");
    expect(members.find((member) => member.id === "spoof")?.kind).toBeUndefined();
    expect(members.find((member) => member.id === "bot")?.roleIds).toEqual(members.find((member) => member.id === "spoof")?.roleIds);
  });
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
