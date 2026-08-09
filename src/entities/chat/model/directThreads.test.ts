import { describe, expect, it } from "vitest";
import { threadTitle } from "@entities/chat/model/directThreads";

describe("direct thread titles", () => {
  it("prefers a persisted group name over participant names", () => {
    expect(threadTitle({
      id: "group-1",
      userIds: ["alice", "bob", "carol"],
      name: "Launch team",
      topic: null,
      createdAt: 1,
      archivedAt: null
    } as any, { alice: "Alice", bob: "Bob", carol: "Carol" }, "alice")).toBe("Launch team");
  });

  it("falls back to participant names for unnamed direct threads", () => {
    expect(threadTitle({
      id: "dm-1",
      userIds: ["alice", "bob"],
      topic: null,
      createdAt: 1,
      archivedAt: null
    } as any, { bob: "Bob" }, "alice")).toBe("Bob");
  });
});
