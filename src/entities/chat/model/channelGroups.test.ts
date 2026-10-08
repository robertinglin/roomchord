import { describe, expect, it } from "vitest";
import { canViewChannelCategory, groupedChannelItems, orderedChannelCategories } from "@entities/chat/model/channelGroups";

describe("channel categories", () => {
  it("limits private categories to selected roles and members", () => {
    const category = { id: "staff", name: "Staff", position: 0, visibility: "private" as const, allowedRoleIds: ["moderator"], allowedMemberIds: ["alice"] };
    expect(canViewChannelCategory(category, "alice", ["member"])).toBe(true);
    expect(canViewChannelCategory(category, "bob", ["moderator"])).toBe(true);
    expect(canViewChannelCategory(category, "bob", ["member"])).toBe(false);
  });

  it("orders active categories by position and keeps empty categories visible", () => {
    const categories = [
      { id: "later", name: "Later", position: 2 },
      { id: "empty", name: "Empty", position: 1 },
      { id: "archived", name: "Archived", position: 0, archivedAt: 1 },
      { id: "first", name: "First", position: 0 }
    ];
    expect(orderedChannelCategories(categories)).toEqual([
      { id: "first", name: "First", position: 0 },
      { id: "empty", name: "Empty", position: 1 },
      { id: "later", name: "Later", position: 2 }
    ]);
    expect(groupedChannelItems([{ id: "one", categoryId: "later", group: "Legacy" }], "General", categories)).toEqual([
      { key: "category:first", label: "First", categoryId: "first", items: [] },
      { key: "category:empty", label: "Empty", categoryId: "empty", items: [] },
      { key: "category:later", label: "Later", categoryId: "later", items: [{ id: "one", categoryId: "later", group: "Legacy" }] }
    ]);
  });

  it("keeps legacy string groups for uncategorized channels", () => {
    expect(groupedChannelItems([
      { id: "one", group: " Ops " },
      { id: "two", group: undefined }
    ], "General")).toEqual([
      { key: "ops", label: "Ops", items: [{ id: "one", group: " Ops " }] },
      { key: "general", label: "General", items: [{ id: "two", group: undefined }] }
    ]);
  });

  it("only renders explicitly categorized channels when categories exist", () => {
    expect(groupedChannelItems([{ id: "orphan", group: "General" }], "General", [
      { id: "general", name: "General", position: 0 }
    ])).toEqual([{ key: "category:general", label: "General", categoryId: "general", items: [] }]);
  });

  it("orders channels within each group by their persisted position", () => {
    expect(groupedChannelItems([
      { id: "second", categoryId: "first", position: 2 },
      { id: "first", categoryId: "first", position: 1 },
    ], "General", [{ id: "first", name: "First", position: 0 }])).toEqual([
      { key: "category:first", label: "First", categoryId: "first", items: [
        { id: "first", categoryId: "first", position: 1 },
        { id: "second", categoryId: "first", position: 2 },
      ] },
    ]);
  });
});
