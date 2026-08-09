import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultNotificationPreference,
  loadNotificationPreference,
  notificationDefinitionAllowed,
  notificationIsMuted,
  notificationPreferenceStorageKey,
  normalizeNotificationPreference,
  saveNotificationPreference
} from "@shared/model/notificationPreferences";

const scope = { roomId: "room/one", scopeType: "channel", scopeId: "general" };

describe("notification preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses a stable scoped storage key and persists normalized values", () => {
    expect(notificationPreferenceStorageKey(scope)).toContain(encodeURIComponent("room/one"));
    saveNotificationPreference(scope, { mode: "invalid" as never, muteUntil: -1 });
    expect(loadNotificationPreference(scope)).toEqual(defaultNotificationPreference());
  });

  it("fails closed to defaults for malformed storage", () => {
    window.localStorage.setItem(notificationPreferenceStorageKey(scope), "not-json");
    expect(loadNotificationPreference(scope)).toEqual(defaultNotificationPreference());
    expect(normalizeNotificationPreference({ mode: "mentions", muteUntil: 12 })).toEqual({ mode: "mentions", muteUntil: 12 });
  });

  it("supports mute durations and mentions-only filtering", () => {
    const preference = { mode: "mentions" as const, muteUntil: null };
    expect(notificationDefinitionAllowed(preference, "messageMention")).toBe(true);
    expect(notificationDefinitionAllowed(preference, "directMessage")).toBe(true);
    expect(notificationDefinitionAllowed(preference, "roomMessage")).toBe(false);
    expect(notificationIsMuted({ mode: "all", muteUntil: 20 }, 19)).toBe(true);
    expect(notificationIsMuted({ mode: "all", muteUntil: 20 }, 20)).toBe(false);
    expect(notificationIsMuted({ mode: "none", muteUntil: null })).toBe(true);
  });
});
