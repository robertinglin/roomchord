import React, { useState } from "react";
import type { Channel, ChannelCategory } from "@entities/chat/model/types";
import { groupedChannelItems, optionalChannelGroup, orderedChannelCategories } from "@entities/chat/model/channelGroups";
import { MediaRooms, type MediaRoomsProps } from "@features/channel-navigation/ui/MediaRooms";
import { Badge, ChannelCreateForm, ChannelGroup, ChannelRow } from "@shared/ui/design";
import { HashGlyph } from "@shared/ui/design/icons";

export function ChannelSidebar({
  channels,
  categories = [],
  activeChannelId,
  canCreateChannels,
  canManageCategories = false,
  unreadCounts,
  voice,
  onCreateCategory,
  onCreateChannel,
  onSelect
}: {
  channels: Channel[];
  categories?: ChannelCategory[];
  activeChannelId?: string;
  canCreateChannels: boolean;
  canManageCategories?: boolean;
  unreadCounts: Record<string, number>;
  voice: MediaRoomsProps;
  onCreateCategory?: (input: { name: string; position?: number }) => void | Promise<void>;
  onCreateChannel: (input: { name: string; group?: string; categoryId?: string }) => void | Promise<void>;
  onSelect: (id: string) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [creatingGroupKey, setCreatingGroupKey] = useState<string | undefined>();
  const [creatingCategory, setCreatingCategory] = useState(false);
  const grouped = groupedChannelItems(channels, "General", categories);
  const groups = grouped.length || !canCreateChannels ? grouped : [{ key: "general", label: "General", items: [] }];
  const sortedCategories = orderedChannelCategories(categories);

  function toggleCreateGroup(groupKey: string) {
    setCreatingGroupKey((current) => (current === groupKey ? undefined : groupKey));
  }

  async function createChannel(name: string, groupLabel: string, categoryId?: string) {
    await onCreateChannel({ name, group: optionalChannelGroup(groupLabel), categoryId });
    setCreatingGroupKey(undefined);
  }

  async function createCategory(name: string) {
    if (!onCreateCategory || !name.trim()) return;
    await onCreateCategory({ name: name.trim(), position: sortedCategories.length });
    setCreatingCategory(false);
  }

  return (
    <section aria-label="Channels">
      {canManageCategories && onCreateCategory ? (
        <div>
          {creatingCategory ? (
            <ChannelCreateForm
              placeholder="category-name"
              ariaLabel="New category name"
              onSubmit={createCategory}
            />
          ) : (
            <button type="button" onClick={() => setCreatingCategory(true)}>New category</button>
          )}
        </div>
      ) : null}
      {groups.map((group) => {
        const collapsed = Boolean(collapsedGroups[group.key]);
        const creating = creatingGroupKey === group.key;
        return (
          <ChannelGroup
            key={group.key}
            label={group.label}
            open={!collapsed}
            onToggle={() => setCollapsedGroups((c) => ({ ...c, [group.key]: !c[group.key] }))}
            onAdd={canCreateChannels ? () => toggleCreateGroup(group.key) : undefined}
          >
            {creating ? (
              <ChannelCreateForm
                placeholder="channel-name"
                ariaLabel={`New text channel name in ${group.label}`}
                onSubmit={(name) => createChannel(name, group.label, group.categoryId)}
              />
            ) : null}
            {!collapsed
              ? group.items.map((channel) => (
                  <ChannelRow
                    key={channel.id}
                    icon={<HashGlyph size={18} />}
                    name={channel.name}
                    topic={channel.topic || undefined}
                    active={channel.id === activeChannelId}
                    badge={(unreadCounts[`channel:${channel.id}`] || 0) > 0 ? <Badge count={unreadCounts[`channel:${channel.id}`]} /> : undefined}
                    aria-label={`#${channel.name}`}
                    onClick={() => onSelect(channel.id)}
                  />
                ))
              : null}
          </ChannelGroup>
        );
      })}

      <MediaRooms {...voice} />
    </section>
  );
}
