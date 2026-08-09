import { describe, expect, it } from "vitest";
import { activeModeration, upcomingEvents } from "./communityCapabilities";

describe("Matterhorn-backed community projections", () => {
  it("orders upcoming, non-cancelled calendar events", () => {
    const events = [
      { id: "later", title: "Later", startsAt: 30 },
      { id: "soon", title: "Soon", startsAt: 20 },
      { id: "cancelled", title: "Cancelled", startsAt: 10, cancelledAt: 11 }
    ];
    expect(upcomingEvents(events, 15).map((event) => event.id)).toEqual(["soon", "later"]);
  });

  it("only reports authoritative membership restrictions", () => {
    expect(activeModeration({ bannedAt: 4, revokedAt: 6 })).toEqual(["banned", "removed"]);
    expect(activeModeration(undefined)).toEqual([]);
  });

  it("accepts object projections and ignores events without a valid start", () => {
    const now = Date.now();
    expect(upcomingEvents({
      valid: { id: "valid", title: "Valid", startsAt: now + 1_000 },
      missing: { id: "missing", title: "Missing" },
      old: { id: "old", title: "Old", startsAt: now - 1_000 }
    }, now).map((event) => event.id)).toEqual(["valid"]);
  });
});
