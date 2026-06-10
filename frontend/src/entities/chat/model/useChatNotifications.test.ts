import { describe, expect, it } from "vitest";
import { notificationLinkParam } from "./useChatNotifications";

describe("notificationLinkParam", () => {
  it("reads link params from legacy notification intents", () => {
    const intent = { link: { params: { channelId: "general" } } };

    expect(notificationLinkParam(intent, "channelId")).toBe("general");
  });

  it("reads link params from kind-wrapped notification intents", () => {
    const intent = {
      kind: "roomkit.notification-intent",
      value: { link: { params: { memberId: "lee" } } }
    };

    expect(notificationLinkParam(intent, "memberId")).toBe("lee");
  });

  it("reads link params from nested payload wrappers", () => {
    const intent = {
      kind: "roomkit.notification-envelope",
      payload: {
        kind: "roomkit.notification-intent",
        value: { link: { params: { channelId: "launch" } } }
      }
    };

    expect(notificationLinkParam(intent, "channelId")).toBe("launch");
  });
});
