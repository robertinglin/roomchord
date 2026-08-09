import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommunityCapabilityPanel } from "./CommunityCapabilityPanel";

describe("CommunityCapabilityPanel", () => {
  it("renders an empty community state without claiming unsupported parity", () => {
    render(<CommunityCapabilityPanel channelId="general" />);

    expect(screen.queryByRole("region", { name: "Polls" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Unavailable community features" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Scheduled events" })).not.toBeInTheDocument();
  });

  it("renders sorted upcoming events and authoritative moderation status", () => {
    const now = Date.now();
    render(
      <CommunityCapabilityPanel
        channelId="general"
        moderation={{ bannedAt: 5 }}
        events={[
          { id: "later", title: "Later", startsAt: now + 30_000 },
          { id: "cancelled", title: "Cancelled", startsAt: now + 10_000, cancelledAt: now + 11_000 },
          { id: "soon", title: "Soon", startsAt: now + 20_000 }
        ]}
      />
    );

    const events = screen.getByRole("region", { name: "Scheduled events" });
    expect(screen.getByRole("region", { name: "Your moderation status" })).toHaveTextContent("banned");
    expect(events).toHaveTextContent("Soon");
    expect(events).toHaveTextContent("Later");
    expect(events).not.toHaveTextContent("Cancelled");
    expect(events.textContent?.indexOf("Soon")).toBeLessThan(events.textContent?.indexOf("Later") || 0);
  });

  it("submits valid event scheduling input", () => {
    const onScheduleEvent = vi.fn();
    render(<CommunityCapabilityPanel channelId="general" canModerate onScheduleEvent={onScheduleEvent} />);

    fireEvent.change(screen.getByPlaceholderText("Event title"), { target: { value: "Town hall" } });
    fireEvent.change(screen.getByLabelText("Event start time"), { target: { value: "2030-01-02T10:30" } });
    fireEvent.change(screen.getByPlaceholderText(/Location or voice room/), { target: { value: "Voice" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule event" }));

    expect(onScheduleEvent).toHaveBeenCalledWith(expect.objectContaining({
      scopeType: "channel",
      scopeId: "general",
      title: "Town hall",
      location: "Voice"
    }));
    expect(onScheduleEvent.mock.calls[0][0].startsAt).toEqual(expect.any(Number));
    expect(Number.isFinite(onScheduleEvent.mock.calls[0][0].startsAt)).toBe(true);
  });

  it("does not submit incomplete or invalid scheduling input", () => {
    const onScheduleEvent = vi.fn();
    render(<CommunityCapabilityPanel channelId="general" canModerate onScheduleEvent={onScheduleEvent} />);
    const title = screen.getByPlaceholderText("Event title");
    const datetime = screen.getByLabelText("Event start time");

    fireEvent.click(screen.getByRole("button", { name: "Schedule event" }));
    fireEvent.change(title, { target: { value: "Broken" } });
    fireEvent.change(datetime, { target: { value: "not-a-date" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule event" }));

    expect(onScheduleEvent).not.toHaveBeenCalled();
  });

  it("creates, votes on, and closes a poll with selection gating", () => {
    const onCreatePoll = vi.fn();
    const onVotePoll = vi.fn();
    const onClosePoll = vi.fn();
    render(
      <CommunityCapabilityPanel
        channelId="general"
        canModerate
        onCreatePoll={onCreatePoll}
        onVotePoll={onVotePoll}
        onClosePoll={onClosePoll}
        polls={[{ id: "poll-1", question: "Ship it?", kind: "single", options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }], counts: { yes: 2, no: 1 } }]}
      />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Poll question" }), { target: { value: "Ship it?" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Poll options" }), { target: { value: "Yes, No" } });
    fireEvent.click(screen.getByRole("button", { name: "Create poll" }));
    expect(onCreatePoll).toHaveBeenCalledWith({ scopeType: "channel", scopeId: "general", question: "Ship it?", options: ["Yes", "No"], kind: "single" });

    fireEvent.click(screen.getByRole("button", { name: /Yes/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Vote" })[0]);
    expect(onVotePoll).toHaveBeenCalledWith("poll-1", ["yes"]);
    fireEvent.click(screen.getByRole("button", { name: "Close poll" }));
    expect(onClosePoll).toHaveBeenCalledWith("poll-1");
  });

  it("dispatches calendar RSVP choices and read notification actions", () => {
    const onRsvpEvent = vi.fn();
    const onReadNotification = vi.fn();
    render(
      <CommunityCapabilityPanel
        channelId="general"
        events={[{ id: "event-1", title: "Town hall", startsAt: Date.now() + 60_000 }]}
        notifications={[{ id: "notification-1", eventId: "event-1", status: "going", readAt: null }, { id: "notification-2", status: "maybe", readAt: 2 }]}
        onRsvpEvent={onRsvpEvent}
        onReadNotification={onReadNotification}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "going" }));
    expect(onRsvpEvent).toHaveBeenCalledWith("event-1", "going");
    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    expect(onReadNotification).toHaveBeenCalledWith("notification-1");
    expect(screen.getByRole("button", { name: "Read" })).toBeDisabled();
  });

  it("creates a forum channel kind and updates its supported policies", () => {
    const onCreateChannelKind = vi.fn();
    const onSetChannelPolicy = vi.fn();
    render(
      <CommunityCapabilityPanel
        channelId="general"
        canModerate
        roomScopeId="room-1"
        onCreateChannelKind={onCreateChannelKind}
        onSetChannelPolicy={onSetChannelPolicy}
        channels={[{ id: "forum-1", name: "Ideas", kind: "forum", postingPolicy: "members", threadPolicy: "members" }]}
      />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Community channel name" }), { target: { value: "Announcements" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Community channel kind" }), { target: { value: "announcement" } });
    fireEvent.click(screen.getByRole("button", { name: "Create channel kind" }));
    expect(onCreateChannelKind).toHaveBeenCalledWith({ scopeType: "room", scopeId: "room-1", name: "Announcements", kind: "announcement", mediaRoomId: undefined });

    fireEvent.change(screen.getByRole("combobox", { name: "Posting policy for Ideas" }), { target: { value: "moderators" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Thread policy for Ideas" }), { target: { value: "moderators" } });
    expect(onSetChannelPolicy).toHaveBeenNthCalledWith(1, "forum-1", "posting", "moderators");
    expect(onSetChannelPolicy).toHaveBeenNthCalledWith(2, "forum-1", "thread", "moderators");
  });

  it("supports multiple-choice selection and keeps expired or closed polls inert", () => {
    const onVotePoll = vi.fn();
    render(
      <CommunityCapabilityPanel
        channelId="general"
        onVotePoll={onVotePoll}
        polls={{
          active: { id: "active", title: "Pick a team", kind: "multiple", options: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }] },
          expired: { id: "expired", question: "Expired", expiresAt: Date.now() - 1, options: [{ id: "x", label: "X" }, { id: "y", label: "Y" }] },
          closed: { id: "closed", options: [{ id: "c", label: "Closed option" }, { id: "d", label: "Other" }], closedAt: 1 }
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
    fireEvent.click(screen.getByRole("button", { name: /Beta/ }));
    fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Vote" })[0]);
    expect(onVotePoll).toHaveBeenCalledWith("active", ["b"]);
    expect(screen.getAllByText("Closed")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /X/ })).toBeDisabled();
  });

  it("rejects incomplete poll and voice-text channel forms, then accepts a valid binding", () => {
    const onCreatePoll = vi.fn();
    const onCreateChannelKind = vi.fn();
    render(<CommunityCapabilityPanel channelId="general" canModerate onCreatePoll={onCreatePoll} onCreateChannelKind={onCreateChannelKind} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Poll question" }), { target: { value: "Incomplete" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Poll options" }), { target: { value: "Only one" } });
    fireEvent.click(screen.getByRole("button", { name: "Create poll" }));
    expect(onCreatePoll).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: "Community channel name" }), { target: { value: "Voice chat" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Community channel kind" }), { target: { value: "voice-text" } });
    const create = screen.getByRole("button", { name: "Create channel kind" });
    expect(create).toBeDisabled();
    fireEvent.click(create);
    expect(onCreateChannelKind).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Media room id" }), { target: { value: "voice-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create channel kind" }));
    expect(onCreateChannelKind).toHaveBeenCalledWith({ scopeType: "room", scopeId: "general", name: "Voice chat", kind: "voice-text", mediaRoomId: "voice-1" });
  });

  it("renders object notifications and stage policies without requiring callbacks", () => {
    render(
      <CommunityCapabilityPanel
        channelId="general"
        channels={[{ id: "stage-1", name: "Stage", kind: "stage", mediaRoomId: "media-1" }]}
        notifications={{ update: { id: "update" } }}
      />
    );

    expect(screen.getByText("Calendar update")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Channel kinds" })).toHaveTextContent("#Stage · stage · media-1");
    expect(screen.queryByRole("combobox", { name: "Speaker policy for Stage" })).not.toBeInTheDocument();
  });
});
