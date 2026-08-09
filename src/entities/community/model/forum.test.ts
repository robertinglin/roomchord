import { describe, expect, it } from "vitest";
import { activeForumTags, filterForumPosts, forumPosts, normalizeForumTagIds } from "@entities/community/model/forum";
function post(id: string, body: string, createdAt: number, deletedAt: number | null = null) {
  return { id, body, createdAt, deletedAt, channelId: "ideas", authorId: "mina" };
}

describe("authoritative forum posts", () => {
  it("projects non-deleted channel messages newest first", () => {
    expect(forumPosts([post("old", "Old", 1), post("new", "New", 2), post("deleted", "Hidden", 3, 4)]).map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("filters the projected posts without creating local records", () => {
    const messages = [{ ...post("one", "Release notes", 1), tagIds: ["release"] }, { ...post("two", "Question about launch", 2), tagIds: ["question"] }];
    expect(filterForumPosts(messages, "launch").map((item) => item.id)).toEqual(["two"]);
    expect(filterForumPosts(messages, " ").map((item) => item.id)).toEqual(["two", "one"]);
    expect(filterForumPosts(messages, "", "release").map((item) => item.id)).toEqual(["one"]);
  });

  it("projects active tags and validates selected ids against authoritative tag state", () => {
    const tags = [{ id: "archived", name: "Old", archivedAt: 1 }, { id: "release", name: "Release", archivedAt: null }, { id: "support", name: "Support" }];
    expect(activeForumTags(tags).map((tag) => tag.id)).toEqual(["release", "support"]);
    expect(normalizeForumTagIds([" release ", "release", "archived", "missing"], activeForumTags(tags))).toEqual(["release"]);
  });
});
