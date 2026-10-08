import React from "react";
import type { Channel, MediaRoom } from "@entities/chat/model/types";
import type { NotificationPreferencesController } from "@entities/chat/model/useNotificationPreferences";
import { NotificationControlsMenu } from "@shared/ui/NotificationControlsMenu";
import type { NotificationMute, NotificationScope } from "matterhorn-sdk/browser";

function copyScopeLink(scope: "channel" | "voice", id: string) {
  const url = new URL(window.location.href);
  url.hash = `${scope}=${encodeURIComponent(id)}`;
  void navigator.clipboard?.writeText(url.toString());
}

function notificationSummary(mode: "all" | "mentions" | "none", muted: boolean) {
  if (muted) return "Muted";
  if (mode === "mentions") return "Only @mentions";
  if (mode === "none") return "Nothing";
  return "All Messages";
}

function preferenceIsMuted(mute: NotificationMute | undefined) {
  return mute?.kind === "indefinite" || mute?.kind === "until" && mute.expiresAt > Date.now();
}

function preferenceProps(
  notificationPreferences: NotificationPreferencesController,
  scope: NotificationScope,
  categoryId?: string
) {
  const preference = notificationPreferences.preference(scope);
  const resolved = notificationPreferences.resolve(scope, categoryId);
  return {
    muted: preferenceIsMuted(preference?.mute),
    notificationMode: preference?.mode || "inherit" as const,
    notificationSummary: notificationSummary(resolved.mode, resolved.muted),
    onMuteChange: (mute: Parameters<NotificationPreferencesController["setMute"]>[1]) => notificationPreferences.setMute(scope, mute),
    onNotificationModeChange: (mode: Parameters<NotificationPreferencesController["setMode"]>[1]) => notificationPreferences.setMode(scope, mode)
  };
}

export function TextChannelContextMenu({
  canManage,
  channel,
  children,
  notificationPreferences,
  onArchive,
  onCreate,
  onDuplicate,
  onInvite,
  onMarkRead,
  onOpenSettings,
  onTogglePin,
  pinned,
  roomId
}: {
  canManage: boolean;
  channel: Channel;
  children: React.ReactNode;
  notificationPreferences: NotificationPreferencesController;
  onArchive?: () => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onInvite?: () => void;
  onMarkRead: () => void;
  onOpenSettings?: () => void;
  onTogglePin?: () => void;
  pinned?: boolean;
  roomId: string;
}) {
  const scope = { type: "channel" as const, roomId, channelId: channel.id };
  return (
    <NotificationControlsMenu
      {...preferenceProps(notificationPreferences, scope, channel.categoryId || undefined)}
      label="Channel"
      inheritLabel="Use Category Default"
      preferenceUnavailableMessage={notificationPreferences.error || "Notification preferences are still loading."}
      onCopyLink={() => copyScopeLink("channel", channel.id)}
      beforeActions={[
        { id: "mark-read", label: "Mark As Read", onSelect: onMarkRead },
        { id: "invite", label: "Invite to Channel", sectionBefore: true, onSelect: onInvite, unavailableMessage: "Channel invites require the Matterhorn invite picker." },
        ...(onTogglePin ? [{ id: "pin", label: pinned ? "Unpin Channel from Top" : "Pin Channel to Top", onSelect: onTogglePin }] : [])
      ]}
      afterActions={canManage ? [
        { id: "edit", label: "Edit Channel", sectionBefore: true, onSelect: onOpenSettings },
        { id: "duplicate", label: "Duplicate Channel", onSelect: onDuplicate },
        { id: "create", label: "Create Text Channel", onSelect: onCreate },
        { id: "delete", label: "Delete Channel", danger: true, onSelect: onArchive }
      ] : []}
    >
      {children}
    </NotificationControlsMenu>
  );
}

export function VoiceChannelContextMenu({
  canManage,
  children,
  hideNames,
  notificationChannelId,
  notificationPreferences,
  onArchive,
  onCreate,
  onDuplicate,
  onInvite,
  onMarkRead,
  onOpenChat,
  onOpenSettings,
  onToggleHideNames,
  onTogglePin,
  pinned,
  room,
  roomId,
  categoryId
}: {
  canManage: boolean;
  children: React.ReactNode;
  hideNames: boolean;
  notificationChannelId?: string;
  notificationPreferences: NotificationPreferencesController;
  onArchive?: () => void;
  onCreate: () => void;
  onDuplicate?: () => void;
  onInvite?: () => void;
  onMarkRead?: () => void;
  onOpenChat?: () => void;
  onOpenSettings?: () => void;
  onToggleHideNames: () => void;
  onTogglePin?: () => void;
  pinned?: boolean;
  room: MediaRoom;
  roomId: string;
  categoryId?: string;
}) {
  const scope = { type: "channel" as const, roomId, channelId: notificationChannelId || room.id };
  return (
    <NotificationControlsMenu
      {...preferenceProps(notificationPreferences, scope, categoryId)}
      label="Channel"
      inheritLabel="Use Category Default"
      preferenceUnavailableMessage={notificationPreferences.error || "Notification preferences are still loading."}
      onCopyLink={() => copyScopeLink("voice", room.id)}
      beforeActions={[
        { id: "mark-read", label: "Mark As Read", onSelect: onMarkRead, unavailableMessage: "This voice channel does not have a bound text chat." },
        { id: "invite", label: "Invite to Voice", sectionBefore: true, onSelect: onInvite, unavailableMessage: "Voice invites require the Matterhorn invite picker." },
        ...(onTogglePin ? [{ id: "pin", label: pinned ? "Unpin Channel from Top" : "Pin Channel to Top", onSelect: onTogglePin }] : [])
      ]}
      middleActions={[
        { id: "open-chat", label: "Open Chat", sectionBefore: true, onSelect: onOpenChat, unavailableMessage: "Create and bind a voice-text channel before opening chat." },
        { id: "status", label: "Set Channel Status", unavailableMessage: "Voice channel status needs a Matterhorn media-room status field." },
        { id: "hide-names", label: "Hide Names", checked: hideNames, onSelect: onToggleHideNames }
      ]}
      afterActions={canManage ? [
        { id: "edit", label: "Edit Channel", sectionBefore: true, onSelect: onOpenSettings },
        { id: "duplicate", label: "Duplicate Channel", onSelect: onDuplicate },
        { id: "create", label: "Create Voice Channel", onSelect: onCreate },
        { id: "delete", label: "Delete Channel", danger: true, onSelect: onArchive }
      ] : []}
    >
      {children}
    </NotificationControlsMenu>
  );
}
