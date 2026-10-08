import type { ChannelCategory } from "@entities/chat/model/types";

export type GroupedChannelItem<T> = {
  key: string;
  label: string;
  items: T[];
  categoryId?: string;
};

function cleanGroup(value?: string | null) {
  return value?.trim() || "";
}

function groupKey(label: string) {
  return label.toLowerCase();
}

function orderedItems<T>(items: T[]) {
  return items
    .map((item, index) => ({ item, index, position: (item as T & { position?: number }).position }))
    .sort((left, right) => (left.position ?? left.index) - (right.position ?? right.index) || left.index - right.index)
    .map(({ item }) => item);
}

export function optionalChannelGroup(value?: string | null) {
  return cleanGroup(value) || undefined;
}

export function canViewChannelCategory(category: ChannelCategory, memberId: string, roleIds: string[]) {
  if (category.visibility !== "private") return true;
  return (category.allowedMemberIds || []).includes(memberId)
    || roleIds.some((roleId) => (category.allowedRoleIds || []).includes(roleId));
}

export function orderedChannelCategories(categories: ChannelCategory[] = []) {
  return categories
    .filter((category) => !category.archivedAt)
    .slice()
    .sort((left, right) => (left.position - right.position) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

export function groupedChannelItems<T extends { group?: string | null; categoryId?: string | null }>(items: T[], fallbackLabel: string, categories?: ChannelCategory[]): GroupedChannelItem<T>[] {
  const groups: GroupedChannelItem<T>[] = [];
  const byKey = new Map<string, GroupedChannelItem<T>>();
  const categoryItems = new Map<string, T[]>();
  for (const item of items) {
    if (item.categoryId) {
      const category = categoryItems.get(item.categoryId) || [];
      category.push(item);
      categoryItems.set(item.categoryId, category);
    }
  }
  for (const category of orderedChannelCategories(categories)) {
    const key = `category:${category.id}`;
    const group = { key, label: category.name, categoryId: category.id, items: categoryItems.get(category.id) || [] };
    groups.push(group);
    byKey.set(key, group);
  }
  const knownCategoryIds = new Set(orderedChannelCategories(categories).map((category) => category.id));
  if (knownCategoryIds.size > 0) return groups.map((group) => ({ ...group, items: orderedItems(group.items) }));
  for (const item of items) {
    if (item.categoryId && knownCategoryIds.has(item.categoryId)) continue;
    const label = cleanGroup(item.group) || fallbackLabel;
    const key = groupKey(label);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.map((group) => ({ ...group, items: orderedItems(group.items) }));
}
