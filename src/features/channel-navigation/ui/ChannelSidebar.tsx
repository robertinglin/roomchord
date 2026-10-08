import React, { useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { Channel, ChannelCategory, MediaRoom, RoleDefinition, VoiceRoomPlacement } from "@entities/chat/model/types";
import { groupedChannelItems, orderedChannelCategories } from "@entities/chat/model/channelGroups";
import { sharedPinnedChannelKeys } from "@entities/chat/model/state";
import { MediaRoomItem, visibleMediaRooms, type MediaRoomsProps } from "@features/channel-navigation/ui/MediaRooms";
import { Badge, ChannelGroup, ChannelRow, DropLine, GroupHeading } from "@shared/ui/design";
import { HashGlyph } from "@shared/ui/design/icons";
import { ChannelCreateDialog, type CategoryCreateInput, type ChannelCreateInput } from "./ChannelCreateDialog";
import { ChannelCreateMenu } from "./ChannelCreateMenu";
import { TextChannelContextMenu, VoiceChannelContextMenu } from "./ChannelContextMenus";
import type { NotificationPreferencesController } from "@entities/chat/model/useNotificationPreferences";

type DragItem = { kind: "category" | "channel" | "voice"; id: string };
type DropTarget = { kind: "category" | "channel" | "voice"; id: string; groupKey?: string; after: boolean };
type SidebarItem =
  | { kind: "channel"; id: string; position: number; channel: Channel }
  | { kind: "voice"; id: string; position: number; room: MediaRoom };

const styles = stylex.create({
  channelItem: { marginBottom: "2px" },
});

export function ChannelSidebar({
  channels,
  categories = [],
  activeChannelId,
  canCreateChannels,
  canManageChannels = false,
  canManagePins = false,
  canManageCategories = false,
  unreadCounts,
  roleDefinitions,
  memberOptions,
  notificationPreferences,
  roomId,
  voice,
  onCreateCategory,
  onCreateChannel,
  onArchiveChannel,
  onOpenChannelSettings,
  onOpenInvites,
  onMarkRead,
  onTogglePin,
  onOpenVoiceChat,
  onReorderCategory,
  onReorderChannel,
  onSelect
}: {
  channels: Channel[];
  categories?: ChannelCategory[];
  activeChannelId?: string;
  canCreateChannels: boolean;
  canManageChannels?: boolean;
  canManagePins?: boolean;
  canManageCategories?: boolean;
  unreadCounts: Record<string, number>;
  roleDefinitions?: RoleDefinition[];
  memberOptions?: Array<{ id: string; name: string }>;
  notificationPreferences: NotificationPreferencesController;
  roomId: string;
  voice: MediaRoomsProps;
  onCreateCategory?: (input: CategoryCreateInput) => void | Promise<void>;
  onCreateChannel: (input: ChannelCreateInput) => void | Promise<void>;
  onArchiveChannel?: (id: string) => void | Promise<void>;
  onOpenChannelSettings?: (channelId: string) => void;
  onOpenInvites?: () => void;
  onMarkRead?: (channelId: string) => void;
  onTogglePin?: (kind: "channel" | "voice", id: string, pinned: boolean) => void | Promise<void>;
  onOpenVoiceChat?: (room: MediaRoom, categoryId?: string) => void;
  onReorderCategory?: (id: string, position: number) => void | Promise<void>;
  onReorderChannel?: (id: string, categoryId: string, position: number) => void | Promise<void>;
  onSelect: (id: string) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [createDialog, setCreateDialog] = useState<{ kind: "category" | "channel" | "voice"; categoryId?: string }>();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [dragging, setDragging] = useState<DragItem | undefined>(undefined);
  const [dropTarget, setDropTarget] = useState<DropTarget | undefined>(undefined);
  const draggingRef = useRef<DragItem | undefined>(undefined);
  const [hiddenVoiceNames, setHiddenVoiceNames] = useState<Record<string, boolean>>({});
  const grouped = groupedChannelItems(channels, "General", categories);
  const groups = grouped.length || !canCreateChannels ? grouped : [{ key: "general", label: "General", items: [] as Channel[] }];
  const sortedCategories = orderedChannelCategories(categories);
  const placements = ((voice.state as typeof voice.state & { voiceRoomPlacements?: VoiceRoomPlacement[] }).voiceRoomPlacements || []);
  const pinnedChannels = sharedPinnedChannelKeys(voice.state);
  const placementByRoomId = new Map(placements.map((placement) => [placement.roomId, placement]));
  const rooms = visibleMediaRooms(voice);
  const voiceTextChannelByRoomId = new Map(channels
    .filter((channel) => channel.kind === "voice-text" && channel.mediaRoomId)
    .map((channel) => [channel.mediaRoomId!, channel]));
  const sidebarGroups = groups.map((group) => ({
    ...group,
    items: [
      ...group.items.map((channel, index): SidebarItem => ({ kind: "channel", id: channel.id, position: channel.position ?? index, channel })),
      ...rooms.flatMap((room): SidebarItem[] => {
        const placement = placementByRoomId.get(room.id);
        return placement && placement.categoryId === group.categoryId
          ? [{ kind: "voice", id: room.id, position: placement.position, room }]
          : [];
      })
    ].sort((left, right) => {
      const leftPinned = pinnedChannels.has(`${left.kind}:${left.id}`);
      const rightPinned = pinnedChannels.has(`${right.kind}:${right.id}`);
      return Number(rightPinned) - Number(leftPinned) || left.position - right.position || left.id.localeCompare(right.id);
    })
  }));
  const canReorder = canManageCategories && Boolean(onCreateCategory);

  function togglePin(kind: "channel" | "voice", id: string) {
    if (!canManagePins || !onTogglePin) return;
    void onTogglePin(kind, id, !pinnedChannels.has(`${kind}:${id}`));
  }

  function startDrag(event: React.DragEvent<HTMLElement>, item: DragItem) {
    if (!canReorder) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${item.kind}:${item.id}`);
    draggingRef.current = item;
    setDragging(item);
  }

  function dragOver(event: React.DragEvent<HTMLElement>, target: Omit<DropTarget, "after">) {
    if (!draggingRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    setDropTarget({ ...target, after: event.clientY > rect.top + rect.height / 2 });
  }

  function drop(event: React.DragEvent<HTMLElement>, target: Omit<DropTarget, "after">) {
    event.preventDefault();
    event.stopPropagation();
    const item = draggingRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const resolvedTarget = { ...target, after: event.clientY > rect.top + rect.height / 2 };
    draggingRef.current = undefined;
    setDragging(undefined);
    setDropTarget(undefined);
    if (item) void finishReorder(item, resolvedTarget);
  }

  function endDrag() {
    draggingRef.current = undefined;
    setDragging(undefined);
    setDropTarget(undefined);
  }


  async function finishReorder(item: DragItem, target: DropTarget) {
    if (!canReorder) return;
    if (item.kind === "category") {
      if (target.kind !== "category" || !onReorderCategory || item.id === target.id) return;
      const from = sortedCategories.findIndex((category) => category.id === item.id);
      const targetIndex = sortedCategories.findIndex((category) => category.id === target.id);
      if (from < 0 || targetIndex < 0) return;
      const next = sortedCategories.slice();
      const [moved] = next.splice(from, 1);
      const insertAt = Math.max(0, Math.min(next.length, targetIndex + (target.after ? 1 : 0) - (from < targetIndex ? 1 : 0)));
      next.splice(insertAt, 0, moved);
      for (const [position, category] of next.entries()) {
        if (category.position !== position) await onReorderCategory(category.id, position);
      }
      return;
    }
    if (item.kind === "channel" && !onReorderChannel || item.kind === "voice" && !voice.onReorder || target.kind === "category" && !target.id) return;
    const sourceGroup = sidebarGroups.find((group) => group.items.some((candidate) => candidate.kind === item.kind && candidate.id === item.id));
    if (!sourceGroup) return;
    const destinationGroup = target.kind === "channel"
      ? sidebarGroups.find((group) => group.items.some((candidate) => candidate.kind === target.kind && candidate.id === target.id))
      : target.kind === "voice"
        ? sidebarGroups.find((group) => group.items.some((candidate) => candidate.kind === "voice" && candidate.id === target.id))
        : sidebarGroups.find((group) => group.categoryId === target.id);
    if (!destinationGroup) return;
    const sourceItems = sourceGroup.items.slice();
    const sourceIndex = sourceItems.findIndex((candidate) => candidate.kind === item.kind && candidate.id === item.id);
    if (sourceIndex < 0) return;
    const [moved] = sourceItems.splice(sourceIndex, 1);
    const destinationItems = sourceGroup.key === destinationGroup.key ? sourceItems : destinationGroup.items.slice();
    let insertAt = destinationItems.length;
    if (target.kind === "channel" || target.kind === "voice") {
      const targetIndex = destinationItems.findIndex((candidate) => candidate.kind === target.kind && candidate.id === target.id);
      if (targetIndex < 0) return;
      insertAt = targetIndex + (target.after ? 1 : 0);
    }
    destinationItems.splice(Math.max(0, Math.min(destinationItems.length, insertAt)), 0, moved);
    const destinationCategoryId = destinationGroup.categoryId;
    if (!destinationCategoryId) return;
    if (sourceGroup.key !== destinationGroup.key) {
      for (const [position, candidate] of sourceItems.entries()) {
        if (candidate.position !== position && sourceGroup.categoryId) await persistSidebarItem(candidate, sourceGroup.categoryId, position);
      }
    }
    for (const [position, candidate] of destinationItems.entries()) {
      const isMoved = candidate.kind === moved.kind && candidate.id === moved.id;
      if (isMoved || candidate.position !== position) {
        await persistSidebarItem(candidate, destinationCategoryId, position);
      }
    }
  }

  async function persistSidebarItem(item: SidebarItem, categoryId: string, position: number) {
    if (item.kind === "channel") await onReorderChannel?.(item.id, categoryId, position);
    else await voice.onReorder?.(item.id, categoryId, position);
  }

  function keyboardReorder(item: DragItem, delta: -1 | 1) {
    if (!canReorder) return;
    if (item.kind === "category") {
      const index = sortedCategories.findIndex((category) => category.id === item.id);
      const target = sortedCategories[index + delta];
      if (target) void finishReorder(item, { kind: "category", id: target.id, after: delta > 0 });
      return;
    }
    const group = sidebarGroups.find((candidate) => candidate.items.some((entry) => entry.kind === item.kind && entry.id === item.id));
    if (!group) return;
    const index = group.items.findIndex((entry) => entry.kind === item.kind && entry.id === item.id);
    const target = group.items[index + delta];
    if (target) void finishReorder(item, { kind: target.kind, id: target.id, groupKey: group.key, after: delta > 0 });
  }

  return (
    <section aria-label="Channels">
      {canCreateChannels || canManageCategories && onCreateCategory ? (
        <ChannelCreateMenu
          canCreateCategory={canManageCategories && Boolean(onCreateCategory)}
          canCreateVoice={voice.canManageRooms && Boolean(voice.onCreate)}
          menuOpen={createMenuOpen}
          onMenuOpenChange={setCreateMenuOpen}
          onCreateChannel={() => { setCreateMenuOpen(false); setCreateDialog({ kind: "channel" }); }}
          onCreateVoice={() => { setCreateMenuOpen(false); setCreateDialog({ kind: "voice", categoryId: sortedCategories.find((category) => category.id === "voice-rooms")?.id || sortedCategories[0]?.id }); }}
          onCreateCategory={() => { setCreateMenuOpen(false); setCreateDialog({ kind: "category" }); }}
        />
      ) : null}
      {sidebarGroups.map((group) => {
        const collapsed = Boolean(collapsedGroups[group.key]);
        const categoryItem = group.categoryId ? { kind: "category" as const, id: group.categoryId } : undefined;
        const categoryDropPosition = dragging?.kind === "category" && dropTarget?.kind === "category" && dropTarget.id === categoryItem?.id
          ? dropTarget.after ? "after" : "before"
          : undefined;
        const heading = categoryItem && canReorder ? (
            <GroupHeading
              label={group.label}
              open={!collapsed}
              dragging={dragging?.kind === "category" && dragging.id === categoryItem.id}
              dropPosition={dropTarget?.kind === "category" && dropTarget.id === categoryItem.id
                ? dragging?.kind !== "category" ? "inside" : undefined
                : undefined}
              onToggle={() => setCollapsedGroups((c) => ({ ...c, [group.key]: !c[group.key] }))}
              dragProps={{
              draggable: true,
              "aria-grabbed": dragging?.kind === "category" && dragging.id === categoryItem.id,
              onDragStart: (event) => startDrag(event, categoryItem),
              onDragOver: (event) => dragOver(event, categoryItem),
              onDrop: (event) => drop(event, categoryItem),
              onDragEnd: endDrag,
              onKeyDown: (event) => {
                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                  event.preventDefault();
                  keyboardReorder(categoryItem, event.key === "ArrowUp" ? -1 : 1);
                }
              }
            }}
            />
        ) : undefined;
        return (
          <React.Fragment key={group.key}>
            {categoryDropPosition === "before" ? <DropLine marker="category-before" /> : null}
            <ChannelGroup
            label={group.label}
            open={!collapsed}
            onToggle={() => setCollapsedGroups((c) => ({ ...c, [group.key]: !c[group.key] }))}
            heading={heading}
            dropProps={categoryItem ? {
              onDragOver: (event) => dragOver(event, categoryItem),
              onDrop: (event) => drop(event, categoryItem)
            } : undefined}
          >
            {!collapsed
              ? group.items.map((item) => {
                  const itemDropPosition = dragging?.kind !== "category" && dropTarget?.kind === item.kind && dropTarget.id === item.id
                    ? dropTarget.after ? "after" : "before"
                    : undefined;
                  const dragProps = canReorder ? {
                    draggable: true,
                    "aria-grabbed": dragging?.kind === item.kind && dragging.id === item.id,
                    onDragStart: (event: React.DragEvent<HTMLElement>) => startDrag(event, item),
                    onDragOver: (event: React.DragEvent<HTMLElement>) => dragOver(event, { kind: item.kind, id: item.id, groupKey: group.key }),
                    onDrop: (event: React.DragEvent<HTMLElement>) => drop(event, { kind: item.kind, id: item.id, groupKey: group.key }),
                    onDragEnd: endDrag,
                    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
                      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                        event.preventDefault();
                        keyboardReorder(item, event.key === "ArrowUp" ? -1 : 1);
                      }
                    }
                  } : undefined;
                  if (item.kind === "voice") {
                    const voiceTextChannel = voiceTextChannelByRoomId.get(item.id);
                    const openChat = voiceTextChannel
                      ? () => onSelect(voiceTextChannel.id)
                      : onOpenVoiceChat ? () => onOpenVoiceChat(item.room, group.categoryId) : undefined;
                    return (
                    <React.Fragment key={`voice:${item.id}`}>
                      {itemDropPosition === "before" ? <DropLine marker="item-before" /> : null}
                      <div {...stylex.props(styles.channelItem)}>
                        <VoiceChannelContextMenu
                          canManage={voice.canManageRooms}
                          hideNames={Boolean(hiddenVoiceNames[item.id])}
                          notificationChannelId={voiceTextChannel?.id}
                          notificationPreferences={notificationPreferences}
                          onMarkRead={voiceTextChannel ? () => onMarkRead?.(voiceTextChannel.id) : undefined}
                          room={item.room}
                          roomId={roomId}
                          categoryId={group.categoryId}
                          onOpenChat={openChat}
                          onInvite={voice.onOpenInvites}
                          onOpenSettings={voice.onOpenSettings ? () => voice.onOpenSettings?.(item.id) : undefined}
                          onToggleHideNames={() => setHiddenVoiceNames((current) => ({ ...current, [item.id]: !current[item.id] }))}
                          onTogglePin={canManagePins ? () => togglePin("voice", item.id) : undefined}
                          pinned={pinnedChannels.has(`voice:${item.id}`)}
                          onDuplicate={voice.onCreate && group.categoryId ? () => { void voice.onCreate?.({ name: `${item.room.name} Copy`, categoryId: group.categoryId!, position: group.items.length }); } : undefined}
                          onCreate={() => setCreateDialog({ kind: "voice", categoryId: group.categoryId })}
                          onArchive={voice.onArchive ? () => { if (window.confirm(`Delete ${item.room.name}?`)) void voice.onArchive?.(item.id); } : undefined}
                        >
                          <MediaRoomItem
                            room={item.room}
                            controller={voice}
                            dragProps={dragProps}
                            dragging={dragging?.kind === "voice" && dragging.id === item.id}
                            hideNames={Boolean(hiddenVoiceNames[item.id])}
                          />
                        </VoiceChannelContextMenu>
                      </div>
                      {itemDropPosition === "after" ? <DropLine marker="item-after" /> : null}
                    </React.Fragment>
                    );
                  }
                  const channel = item.channel;
                  return (
                    <React.Fragment key={`channel:${item.id}`}>
                      {itemDropPosition === "before" ? <DropLine marker="item-before" /> : null}
                      <div {...stylex.props(styles.channelItem)}>
                        <TextChannelContextMenu
                          canManage={canManageChannels}
                          channel={channel}
                          notificationPreferences={notificationPreferences}
                          roomId={roomId}
                          onMarkRead={() => onMarkRead?.(channel.id)}
                          onInvite={onOpenInvites}
                          onOpenSettings={onOpenChannelSettings ? () => onOpenChannelSettings(channel.id) : undefined}
                          onDuplicate={() => { void onCreateChannel({ name: `${channel.name}-copy`, topic: channel.topic || undefined, categoryId: channel.categoryId || undefined, visibility: channel.visibility, allowedRoleIds: channel.allowedRoleIds, allowedMemberIds: channel.allowedMemberIds }); }}
                          onCreate={() => setCreateDialog({ kind: "channel", categoryId: channel.categoryId || undefined })}
                          onArchive={onArchiveChannel ? () => { if (window.confirm(`Delete #${channel.name}?`)) void onArchiveChannel(channel.id); } : undefined}
                          onTogglePin={canManagePins ? () => togglePin("channel", channel.id) : undefined}
                          pinned={pinnedChannels.has(`channel:${channel.id}`)}
                        >
                          <ChannelRow
                            dragProps={canReorder ? { ...dragProps } : undefined}
                            icon={<HashGlyph size={18} />}
                            name={channel.name}
                            topic={channel.topic || undefined}
                            active={channel.id === activeChannelId}
                            dragging={dragging?.kind === "channel" && dragging.id === channel.id}
                            pinned={pinnedChannels.has(`channel:${channel.id}`)}
                            badge={(unreadCounts[`channel:${channel.id}`] || 0) > 0 ? <Badge count={unreadCounts[`channel:${channel.id}`]} /> : undefined}
                            aria-label={`#${channel.name}`}
                            onClick={() => onSelect(channel.id)}
                          />
                        </TextChannelContextMenu>
                      </div>
                      {itemDropPosition === "after" ? <DropLine marker="item-after" /> : null}
                    </React.Fragment>
                  );
                })
              : null}
            </ChannelGroup>
            {categoryDropPosition === "after" ? <DropLine marker="category-after" /> : null}
          </React.Fragment>
        );
      })}

      <ChannelCreateDialog
        open={Boolean(createDialog)}
        kind={createDialog?.kind || "channel"}
        categories={categories}
        defaultCategoryId={createDialog?.categoryId || sortedCategories[0]?.id}
        roles={roleDefinitions}
        members={memberOptions}
        onClose={() => setCreateDialog(undefined)}
        onCreateCategory={onCreateCategory ? async (input) => { await onCreateCategory({ ...input, position: sortedCategories.length }); } : undefined}
        onCreateChannel={onCreateChannel}
        onCreateVoice={voice.onCreate ? async ({ name, categoryId }) => {
          const position = sidebarGroups.find((group) => group.categoryId === categoryId)?.items.length || 0;
          await voice.onCreate?.({ name, categoryId, position });
        } : undefined}
      />
    </section>
  );
}
