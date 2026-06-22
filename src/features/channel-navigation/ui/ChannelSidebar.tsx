import React, { useState } from "react";
import type { Channel } from "@entities/chat/model/types";
import { groupedChannelItems, optionalChannelGroup } from "@entities/chat/model/channelGroups";
import { MediaRooms, type MediaRoomsProps } from "@features/channel-navigation/ui/MediaRooms";
import { Badge, ChannelCreateForm, ChannelGroup, ChannelRow } from "@shared/ui/design";
import { HashGlyph } from "@shared/ui/design/icons";

export function ChannelSidebar({
  channels,
  activeChannelId,
  canCreateChannels,
  unreadCounts,
  voice,
  onCreateChannel,
  onSelect
}: {
  channels: Channel[];
  activeChannelId?: string;
  canCreateChannels: boolean;
  unreadCounts: Record<string, number>;
  voice: MediaRoomsProps;
  onCreateChannel: (input: { name: string; group?: string }) => void | Promise<void>;
  onSelect: (id: string) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [creatingGroupKey, setCreatingGroupKey] = useState<string | undefined>();
  const grouped = groupedChannelItems(channels, "General");
  const groups = grouped.length || !canCreateChannels ? grouped : [{ key: "general", label: "General", items: [] }];

  function toggleCreateGroup(groupKey: string) {
    setCreatingGroupKey((current) => (current === groupKey ? undefined : groupKey));
  }

  async function createChannel(name: string, groupLabel: string) {
    await onCreateChannel({ name, group: optionalChannelGroup(groupLabel) });
    setCreatingGroupKey(undefined);
  }

  return (
    <section aria-label="Channels">
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
                onSubmit={(name) => createChannel(name, group.label)}
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
