import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export function communityActions(input: ChatActionHandlersInput) {
  async function scheduleEvent(value: { scopeType: string; scopeId: string; title: string; startsAt: number; endsAt?: number | null; location?: string; description?: string }) {
    await input.live.dispatch("calendarEventCreate", {
      ...value,
      endsAt: value.endsAt ?? undefined
    });
  }

  async function cancelEvent(eventId: string) {
    await input.live.dispatch("calendarEventCancel", { eventId });
  }

  async function rsvpEvent(eventId: string, status: "going" | "maybe" | "declined") {
    await input.live.dispatch("calendarEventRsvp", { eventId, status });
  }

  async function readCalendarNotification(notificationId: string) {
    await input.live.dispatch("calendarNotificationRead", { notificationId });
  }

  async function createPoll(value: { scopeType: string; scopeId: string; question: string; options: string[]; kind?: "single" | "multiple"; maxSelections?: number; expiresAt?: number | null }) {
    await input.live.dispatch("pollCreate", { ...value, kind: value.kind || "single", expiresAt: value.expiresAt ?? undefined });
  }

  async function votePoll(pollId: string, optionIds: string[]) {
    await input.live.dispatch("pollVote", { pollId, optionIds });
  }

  async function closePoll(pollId: string) {
    await input.live.dispatch("pollClose", { pollId });
  }

  async function createChannelKind(value: { scopeType: string; scopeId: string; name: string; kind?: "text" | "forum" | "announcement" | "onboarding" | "rules" | "voice-text" | "stage"; mediaRoomId?: string; postingPolicy?: "members" | "moderators" | "none"; threadPolicy?: "members" | "moderators" | "none"; speakerPolicy?: "members" | "moderators" | "none" }) {
    await input.live.dispatch("channelKindCreate", { ...value, kind: value.kind || "text" });
  }

  async function setChannelPostingPolicy(channelId: string, policy: "members" | "moderators" | "none") {
    await input.live.dispatch("channelPostingPolicy", { channelId, policy });
  }

  async function setChannelThreadPolicy(channelId: string, policy: "members" | "moderators" | "none") {
    await input.live.dispatch("channelThreadPolicy", { channelId, policy });
  }

  async function setChannelSpeakerPolicy(channelId: string, policy: "members" | "moderators" | "none") {
    await input.live.dispatch("channelSpeakerPolicy", { channelId, policy });
  }

  async function bindVoiceTextChannel(channelId: string, mediaRoomId: string) {
    await input.live.dispatch("channelVoiceTextBind", { channelId, mediaRoomId });
  }

  async function setForumLayout(channelId: string, layout: "list" | "gallery") {
    await input.live.dispatch("channelForumLayout", { channelId, layout });
  }

  async function createForumTag(channelId: string, name: string, color?: string, tagId?: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await input.live.dispatch("channelForumTagCreate", { channelId, name: trimmedName, ...(tagId?.trim() ? { tagId: tagId.trim() } : {}), ...(color?.trim() ? { color: color.trim() } : {}) });
  }

  async function updateForumTag(channelId: string, tagId: string, name?: string, color?: string) {
    if (!tagId.trim()) return;
    await input.live.dispatch("channelForumTagUpdate", { channelId, tagId: tagId.trim(), ...(name?.trim() ? { name: name.trim() } : {}), ...(color?.trim() ? { color: color.trim() } : {}) });
  }

  async function archiveForumTag(channelId: string, tagId: string) {
    if (!tagId.trim()) return;
    await input.live.dispatch("channelForumTagArchive", { channelId, tagId: tagId.trim() });
  }

  return {
    bindVoiceTextChannel,
    archiveForumTag,
    cancelEvent,
    closePoll,
    createChannelKind,
    createForumTag,
    createPoll,
    readCalendarNotification,
    rsvpEvent,
    scheduleEvent,
    setForumLayout,
    setChannelPostingPolicy,
    setChannelSpeakerPolicy,
    setChannelThreadPolicy,
    updateForumTag,
    votePoll
  };
}
