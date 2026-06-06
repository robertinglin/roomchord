export type GroupedChannelItem<T> = {
  key: string;
  label: string;
  items: T[];
};

function cleanGroup(value?: string | null) {
  return value?.trim() || "";
}

function groupKey(label: string) {
  return label.toLowerCase();
}

export function optionalChannelGroup(value?: string | null) {
  return cleanGroup(value) || undefined;
}

export function groupedChannelItems<T extends { group?: string | null }>(items: T[], fallbackLabel: string): GroupedChannelItem<T>[] {
  const groups: GroupedChannelItem<T>[] = [];
  const byKey = new Map<string, GroupedChannelItem<T>>();
  for (const item of items) {
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
  return groups;
}
