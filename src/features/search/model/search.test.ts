import { describe, expect, it } from "vitest";
import { dateInputValue, epochMillisForDateInput, matterhornSearchInput } from "@features/search/model/search";

describe("encrypted Matterhorn search query", () => {
  it("builds the authorized global and filtered room search contract", () => {
    const signal = new AbortController().signal;
    expect(matterhornSearchInput({ query: "launch", scope: "all", authorId: "alice", after: 1, before: 4 }, undefined, signal)).toEqual(expect.objectContaining({
      scope: "all",
      category: "all",
      authorId: "alice",
      after: 1,
      before: 4,
      concurrency: 4,
      signal
    }));
    const scopes = [{ scopeType: "channel" as const, scopeId: "general" }];
    expect(matterhornSearchInput({ query: "launch", scope: "files", scopes, concurrency: 2 }, undefined, signal)).toEqual(expect.objectContaining({
      scopes,
      category: "files",
      concurrency: 2,
      signal
    }));
    expect(matterhornSearchInput({ query: "launch", scope: "messages" }, "general", signal)).toEqual(expect.objectContaining({
      scope: { scopeType: "channel", scopeId: "general" },
      category: "messages"
    }));
  });

  it("converts only valid date controls to UTC epoch milliseconds", () => {
    expect(epochMillisForDateInput("2024-01-02")).toBe(Date.UTC(2024, 0, 2));
    expect(epochMillisForDateInput("2024-02-30")).toBeUndefined();
    expect(epochMillisForDateInput("")).toBeUndefined();
    expect(dateInputValue(Date.UTC(2024, 0, 2))).toBe("2024-01-02");
    expect(dateInputValue(undefined)).toBe("");
  });
});
