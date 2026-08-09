import { describe, expect, it } from "vitest";
import { notificationLinkParam, notificationVisible } from "./useChatNotifications";
import { notificationPreferenceStorageKey, saveNotificationPreference } from "@shared/model/notificationPreferences";

describe("notificationLinkParam", () => {
  it("reads link params from legacy notification intents", () => {
    const intent = { link: { params: { channelId: "general" } } };

    expect(notificationLinkParam(intent, "channelId")).toBe("general");
  });

  it("reads link params from kind-wrapped notification intents", () => {
    const intent = {
      kind: "matterhorn.notification-intent",
      value: { link: { params: { memberId: "lee" } } }
    };

    expect(notificationLinkParam(intent, "memberId")).toBe("lee");
  });

  it("reads link params from nested payload wrappers", () => {
    const intent = {
      kind: "matterhorn.notification-envelope",
      payload: {
        kind: "matterhorn.notification-intent",
        value: { link: { params: { channelId: "launch" } } }
      }
    };

    expect(notificationLinkParam(intent, "channelId")).toBe("launch");
  });
});

describe("notificationVisible", () => {
  it("applies a scoped local mute to the notification player", () => {
    const scope = { roomId: "room-1", scopeType: "channel", scopeId: "general" };
    saveNotificationPreference(scope, { mode: "none", muteUntil: null });
    const live = { envelope: { room: { id: "room-1" } } } as never;
    expect(notificationVisible({ roomName: "room-1", kind: "messageMention", scope: { type: "channel", id: "general" } }, live, "notification")).toBe(false);
    expect(notificationVisible({ kind: "matterhorn.notification-intent", value: { roomName: "room-1", kind: "messageMention", scope: { type: "channel", id: "general" } } }, live, "notification")).toBe(false);
    expect(notificationVisible({ roomName: "room-1", kind: "messageMention", scope: { type: "channel", id: "other" } }, live, "notification")).toBe(true);
    window.localStorage.removeItem(notificationPreferenceStorageKey(scope));
  });
});
