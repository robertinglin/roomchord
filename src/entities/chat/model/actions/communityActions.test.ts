import { describe, expect, it, vi } from "vitest";
import { communityActions } from "./communityActions";

function actions() {
  const dispatch = vi.fn().mockResolvedValue(undefined);
  const input = { live: { dispatch } } as never;
  return { dispatch, handlers: communityActions(input) };
}

describe("Matterhorn calendar community actions", () => {
  it("dispatches event creation while preserving optional fields and normalizing null end times", async () => {
    const { dispatch, handlers } = actions();
    await handlers.scheduleEvent({
      scopeType: "channel",
      scopeId: "general",
      title: "Town hall",
      startsAt: 10,
      endsAt: null,
      location: "General voice",
      description: "Questions"
    });

    expect(dispatch).toHaveBeenCalledWith("calendarEventCreate", {
      scopeType: "channel",
      scopeId: "general",
      title: "Town hall",
      startsAt: 10,
      endsAt: undefined,
      location: "General voice",
      description: "Questions"
    });
  });

  it("dispatches a finite event end time and calendar cancellation", async () => {
    const { dispatch, handlers } = actions();
    await handlers.scheduleEvent({ scopeType: "channel", scopeId: "general", title: "Launch", startsAt: 20, endsAt: 30 });
    await handlers.cancelEvent("cal_1");

    expect(dispatch).toHaveBeenNthCalledWith(1, "calendarEventCreate", expect.objectContaining({ endsAt: 30 }));
    expect(dispatch).toHaveBeenNthCalledWith(2, "calendarEventCancel", { eventId: "cal_1" });
  });

  it("dispatches RSVP and notification read operations", async () => {
    const { dispatch, handlers } = actions();
    await handlers.rsvpEvent("cal_1", "maybe");
    await handlers.readCalendarNotification("cal_1:mina");

    expect(dispatch).toHaveBeenNthCalledWith(1, "calendarEventRsvp", { eventId: "cal_1", status: "maybe" });
    expect(dispatch).toHaveBeenNthCalledWith(2, "calendarNotificationRead", { notificationId: "cal_1:mina" });
  });

  it("dispatches poll lifecycle operations without implementing poll state locally", async () => {
    const { dispatch, handlers } = actions();
    await handlers.createPoll({ scopeType: "channel", scopeId: "general", question: "Ship it?", options: ["Yes", "No"], kind: "single" });
    await handlers.votePoll("poll_1", ["option_1"]);
    await handlers.closePoll("poll_1");

    expect(dispatch).toHaveBeenNthCalledWith(1, "pollCreate", expect.objectContaining({ kind: "single", expiresAt: undefined }));
    expect(dispatch).toHaveBeenNthCalledWith(2, "pollVote", { pollId: "poll_1", optionIds: ["option_1"] });
    expect(dispatch).toHaveBeenNthCalledWith(3, "pollClose", { pollId: "poll_1" });
  });

  it("applies authoritative defaults for polls and channel kinds", async () => {
    const { dispatch, handlers } = actions();
    await handlers.createPoll({ scopeType: "channel", scopeId: "general", question: "Default?", options: ["Yes", "No"], expiresAt: null });
    await handlers.createChannelKind({ scopeType: "room", scopeId: "room-1", name: "General" });

    expect(dispatch).toHaveBeenNthCalledWith(1, "pollCreate", expect.objectContaining({ kind: "single", expiresAt: undefined }));
    expect(dispatch).toHaveBeenNthCalledWith(2, "channelKindCreate", expect.objectContaining({ kind: "text" }));
  });

  it("dispatches channel kind and policy operations", async () => {
    const { dispatch, handlers } = actions();
    await handlers.createChannelKind({ scopeType: "room", scopeId: "room-1", name: "Announcements", kind: "announcement" });
    await handlers.setChannelPostingPolicy("channel-1", "moderators");
    await handlers.setChannelThreadPolicy("channel-1", "members");
    await handlers.setChannelSpeakerPolicy("channel-1", "moderators");
    await handlers.bindVoiceTextChannel("channel-1", "voice-1");

    expect(dispatch).toHaveBeenNthCalledWith(1, "channelKindCreate", expect.objectContaining({ kind: "announcement" }));
    expect(dispatch).toHaveBeenNthCalledWith(2, "channelPostingPolicy", { channelId: "channel-1", policy: "moderators" });
    expect(dispatch).toHaveBeenNthCalledWith(3, "channelThreadPolicy", { channelId: "channel-1", policy: "members" });
    expect(dispatch).toHaveBeenNthCalledWith(4, "channelSpeakerPolicy", { channelId: "channel-1", policy: "moderators" });
    expect(dispatch).toHaveBeenNthCalledWith(5, "channelVoiceTextBind", { channelId: "channel-1", mediaRoomId: "voice-1" });
  });

  it("dispatches authoritative forum layout and tag operations", async () => {
    const { dispatch, handlers } = actions();
    await handlers.setForumLayout("forum-1", "gallery");
    await handlers.createForumTag("forum-1", " Release ", "#ff00aa", "release");
    await handlers.updateForumTag("forum-1", " release ", " Ship ", "#00ffaa");
    await handlers.archiveForumTag("forum-1", "release");

    expect(dispatch).toHaveBeenNthCalledWith(1, "channelForumLayout", { channelId: "forum-1", layout: "gallery" });
    expect(dispatch).toHaveBeenNthCalledWith(2, "channelForumTagCreate", { channelId: "forum-1", name: "Release", tagId: "release", color: "#ff00aa" });
    expect(dispatch).toHaveBeenNthCalledWith(3, "channelForumTagUpdate", { channelId: "forum-1", tagId: "release", name: "Ship", color: "#00ffaa" });
    expect(dispatch).toHaveBeenNthCalledWith(4, "channelForumTagArchive", { channelId: "forum-1", tagId: "release" });
  });
});
