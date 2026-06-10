import { useEffect, useRef } from "react";
import type { ChatActionHandlers } from "@entities/chat/model/chatActions";
import type { ChatUiActions } from "@entities/chat/model/chatUiStore";
import type { ChordLiveClient } from "@entities/chat/model/useChordClient";
import { currentHash } from "@entities/chat/model/chatViewModel";
import { notificationHref, NotificationTarget, notificationTargetFromHash } from "@entities/chat/model/messageLinks";

export type ChatNotificationsInput = {
  actions: ChatActionHandlers;
  live: ChordLiveClient;
  ui: ChatUiActions;
};

type NotificationIntent = { link?: { params?: Record<string, string | undefined> } };
type WrappedNotificationIntent = {
  kind?: string;
  value?: unknown;
  payload?: unknown;
  intent?: unknown;
};

function intentRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function notificationIntent(value: unknown): NotificationIntent {
  const record = intentRecord(value);
  if (!record || record.link) return (value || {}) as NotificationIntent;

  const wrapped = record as WrappedNotificationIntent;
  if (typeof wrapped.kind !== "string") return {};
  const inner = wrapped.value ?? wrapped.payload ?? wrapped.intent;
  return notificationIntent(inner);
}

export function notificationLinkParam(intent: unknown, key: string) {
  return notificationIntent(intent).link?.params?.[key];
}

function linkResult(url: string | undefined) {
  return url ? { kind: "url", url } : undefined;
}

// Wires roomchord into the RoomKit notification Player API. The declarative
// `notifications` block in the app schema drives *who* gets pushed; here we
// customize the deep link a recipient lands on when they click, and route the
// app to the right channel / DM when that link is opened.
export function useChatNotifications(input: ChatNotificationsInput) {
  const { actions, live, ui } = input;
  const notifications = live.notifications;
  const lastTargetRef = useRef<NotificationTarget>();

  // resolveLink runs on the sender when the push payload is built. We translate
  // the intent's scope into a room deep link the recipient's app understands.
  useEffect(() => {
    if (!notifications) return;
    const channelLink = {
      resolveLink: (intent: unknown) => {
        const channelId = notificationLinkParam(intent, "channelId");
        return linkResult(channelId ? notificationHref({ channelId }) : undefined);
      }
    };
    const unsubscribes = [
      notifications.subscribe("messageMention", channelLink),
      notifications.subscribe("replyMention", channelLink),
      notifications.subscribe("directMessage", {
        resolveLink: (intent: unknown) => {
          const memberId = notificationLinkParam(intent, "memberId");
          return linkResult(memberId ? notificationHref({ dmMemberId: memberId }) : undefined);
        }
      })
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [notifications]);
  

  // When a notification deep link is opened (service worker navigates the client
  // to the URL above), route to the referenced channel or DM thread.
  useEffect(() => {
    function routeToTarget(hash = currentHash()) {
      const target = notificationTargetFromHash(hash);
      if (!target) return;
      if (JSON.stringify(target) === JSON.stringify(lastTargetRef.current)) return;
      lastTargetRef.current = target;
      if ("channelId" in target) ui.selectChannel(target.channelId);
      else actions.openDirectThreadForMember(target.dmMemberId);
      window.location.hash = window.location.hash.split('?')[0]; // Clear the hash so that the same notification can be clicked again to route
    }

    routeToTarget();
    const onHashChange = () => routeToTarget();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [actions, ui]);
}
