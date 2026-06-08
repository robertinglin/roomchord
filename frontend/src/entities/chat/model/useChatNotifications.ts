import { useEffect } from "react";
import type { ChatActionHandlers } from "@entities/chat/model/chatActions";
import type { ChatUiActions } from "@entities/chat/model/chatUiStore";
import type { ChordLiveClient } from "@entities/chat/model/useChordClient";
import { currentHash } from "@entities/chat/model/chatViewModel";
import { notificationHref, notificationTargetFromHash } from "@entities/chat/model/messageLinks";

export type ChatNotificationsInput = {
  actions: ChatActionHandlers;
  live: ChordLiveClient;
  ui: ChatUiActions;
};

// Wires roomchord into the RoomKit notification Player API. The declarative
// `notifications` block in the app schema drives *who* gets pushed; here we
// customize the deep link a recipient lands on when they click, and route the
// app to the right channel / DM when that link is opened.
export function useChatNotifications(input: ChatNotificationsInput) {
  const { actions, live, ui } = input;
  const notifications = live.notifications;

  // resolveLink runs on the sender when the push payload is built. We translate
  // the intent's scope into a room deep link the recipient's app understands.
  useEffect(() => {
    if (!notifications) return;
    const channelLink = {
      resolveLink: (intent: { link: { params: Record<string, string> } }) => {
        const url = notificationHref({ channelId: intent.link.params.channelId });
        return url ? { url } : undefined;
      }
    };
    const unsubscribes = [
      notifications.subscribe("messageMention", channelLink),
      notifications.subscribe("replyMention", channelLink),
      notifications.subscribe("directMessage", {
        resolveLink: (intent) => {
          const url = notificationHref({ dmMemberId: intent.link.params.memberId });
          return url ? { url } : undefined;
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
      if ("channelId" in target) ui.selectChannel(target.channelId);
      else actions.openDirectThreadForMember(target.dmMemberId);
    }

    routeToTarget();
    const onHashChange = () => routeToTarget();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [actions, ui]);
}
