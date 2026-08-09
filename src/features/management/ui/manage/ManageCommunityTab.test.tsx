import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageCommunityTab } from "./ManageCommunityTab";

describe("ManageCommunityTab", () => {
  it("passes projected state-backed community records and management actions through", () => {
    const onRsvpEvent = vi.fn();
    const onReadNotification = vi.fn();
    const onSetChannelPolicy = vi.fn();
    render(
      <ManageCommunityTab
        channelId="general"
        canModerate
        state={{
          calendarEvents: { event: { id: "event", title: "Town hall", startsAt: Date.now() + 60_000 } },
          calendarNotifications: { notice: { id: "notice", status: "going" } },
          polls: {},
        } as never}
        onScheduleEvent={vi.fn()}
        onRsvpEvent={onRsvpEvent}
        onReadNotification={onReadNotification}
        channels={[{ id: "general", name: "General", kind: "forum", threadPolicy: "members" }]}
        onSetChannelPolicy={onSetChannelPolicy}
      />
    );

    expect(screen.getByRole("region", { name: "Scheduled events" })).toHaveTextContent("Town hall");
    expect(screen.getByRole("region", { name: "Calendar notifications" })).toHaveTextContent("RSVP: going");
    fireEvent.click(screen.getByRole("button", { name: "maybe" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Thread policy for General" }), { target: { value: "moderators" } });

    expect(onRsvpEvent).toHaveBeenCalledWith("event", "maybe");
    expect(onReadNotification).toHaveBeenCalledWith("notice");
    expect(onSetChannelPolicy).toHaveBeenCalledWith("general", "thread", "moderators");
  });
});
