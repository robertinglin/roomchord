import { describe, expect, it } from "vitest";
import { groupedChannelItems, orderedChannelCategories } from "@entities/chat/model/channelGroups";

describe("channel categories", () => {
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
});
