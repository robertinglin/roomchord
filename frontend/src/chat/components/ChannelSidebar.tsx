import React, { useState } from "react";
import type { Channel } from "../types";
import { groupedChannelItems, optionalChannelGroup } from "../channelGroups";
import { ChevronRightIcon, HashIcon, PlusIcon } from "./Icons";
import { MediaRooms, type MediaRoomsProps } from "./MediaRooms";

export function ChannelSidebar({
  channels,
  activeChannelId,
  canCreateChannels,
  voice,
  onCreateChannel,
  onSelect
}: {
  channels: Channel[];
  activeChannelId?: string;
  canCreateChannels: boolean;
  voice: MediaRoomsProps;
  onCreateChannel: (input: { name: string; group?: string }) => void | Promise<void>;
  onSelect: (id: string) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [creatingGroupKey, setCreatingGroupKey] = useState<string | undefined>();
  const [newChannelName, setNewChannelName] = useState("");
  const grouped = groupedChannelItems(channels, "General");
  const groups = grouped.length || !canCreateChannels ? grouped : [{ key: "general", label: "General", items: [] }];

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  }

  async function createChannel(event: React.FormEvent<HTMLFormElement>, groupLabel: string) {
    event.preventDefault();
    const name = newChannelName.trim().replace(/^#/, "");
    if (!name) return;
    await onCreateChannel({ name, group: optionalChannelGroup(groupLabel) });
    setNewChannelName("");
    setCreatingGroupKey(undefined);
  }

  function toggleCreateGroup(groupKey: string) {
    setNewChannelName("");
    setCreatingGroupKey((current) => current === groupKey ? undefined : groupKey);
  }

  return (
    <section className="sidebar-section channels-section" aria-label="Channels">
      <div className="channel-group-list">
        {groups.length === 0 ? <p className="sidebar-empty">No channels</p> : null}
        {groups.map((group) => {
          const collapsed = Boolean(collapsedGroups[group.key]);
          const creating = creatingGroupKey === group.key;
          return (
            <div className="channel-group" key={group.key}>
              <div className={`channel-group-heading${canCreateChannels ? " has-add" : ""}`}>
                <button className="channel-group-toggle" type="button" aria-expanded={!collapsed} onClick={() => toggleGroup(group.key)}>
                  <span>{group.label}</span>
                  <ChevronRightIcon className={`ui-icon channel-group-chevron${collapsed ? "" : " open"}`} />
                </button>
                {canCreateChannels ? (
                  <button
                    className="sidebar-icon-button channel-group-add"
                    type="button"
                    aria-label={creating ? `Cancel new text channel in ${group.label}` : `Add text channel to ${group.label}`}
                    aria-expanded={creating}
                    onClick={() => toggleCreateGroup(group.key)}
                  >
                    <PlusIcon className={`ui-icon${creating ? " open" : ""}`} />
                  </button>
                ) : null}
              </div>
              {creating ? (
                <form className="sidebar-form channel-create-form" onSubmit={(event) => createChannel(event, group.label)}>
                  <label>
                    <span>Name</span>
                    <input aria-label={`New text channel name in ${group.label}`} value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} placeholder="channel-name" />
                  </label>
                  <button className="primary-action" type="submit" disabled={!newChannelName.trim()}>
                    Create
                  </button>
                </form>
              ) : null}
              {!collapsed ? (
                <div className="sidebar-list channel-group-items">
                  {group.items.map((channel) => (
                    <button
                      className={`sidebar-item channel-button${channel.id === activeChannelId ? " active" : ""}`}
                      type="button"
                      aria-label={`#${channel.name}`}
                      onClick={() => onSelect(channel.id)}
                      key={channel.id}
                    >
                      <HashIcon className="ui-icon channel-type-icon" />
                      <span className="sidebar-item-text">
                        <span>{channel.name}</span>
                        {channel.topic ? <small>{channel.topic}</small> : null}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <MediaRooms {...voice} />
    </section>
  );
}
