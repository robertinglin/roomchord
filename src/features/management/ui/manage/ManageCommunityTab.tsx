import React from "react";
import { CommunityCapabilityPanel, type CommunityChannel, type CommunityChannelKind, type CommunityNotification, type CommunityPoll } from "@entities/community/ui/CommunityCapabilityPanel";
import type { CommunityEvent, ModerationRecord } from "@entities/community/model/communityCapabilities";
import type { ChatState } from "@entities/chat/model/types";

type CommunityState = ChatState & {
  calendarEvents?: Record<string, CommunityEvent>;
  polls?: Record<string, CommunityPoll>;
  calendarNotifications?: Record<string, CommunityNotification>;
};

export function ManageCommunityTab({ channelId, state, moderation, canModerate, onScheduleEvent, onCreatePoll, onVotePoll, onClosePoll, onRsvpEvent, onReadNotification, channels, onSetChannelPolicy, onSetForumLayout, onCreateForumTag, onUpdateForumTag, onArchiveForumTag, polls, notifications, events, roomScopeId, onCreateChannelKind }: {
  channelId: string;
  state: CommunityState;
  moderation?: ModerationRecord;
  canModerate: boolean;
  onScheduleEvent: (input: { scopeType: string; scopeId: string; title: string; startsAt: number; location?: string }) => void;
  onCreatePoll?: (input: { scopeType: string; scopeId: string; question: string; options: string[]; kind?: "single" | "multiple"; maxSelections?: number }) => void;
  onVotePoll?: (pollId: string, optionIds: string[]) => void;
  onClosePoll?: (pollId: string) => void;
  onRsvpEvent?: (eventId: string, status: "going" | "maybe" | "declined") => void;
  onReadNotification?: (notificationId: string) => void;
  channels?: CommunityChannel[];
  onSetChannelPolicy?: (channelId: string, policyType: "posting" | "thread" | "speaker", policy: "members" | "moderators" | "none") => void;
  onSetForumLayout?: (channelId: string, layout: "list" | "gallery") => void;
  onCreateForumTag?: (channelId: string, name: string, color?: string) => void;
  onUpdateForumTag?: (channelId: string, tagId: string, name: string, color?: string) => void;
  onArchiveForumTag?: (channelId: string, tagId: string) => void;
  polls?: Record<string, CommunityPoll> | CommunityPoll[];
  notifications?: Record<string, CommunityNotification> | CommunityNotification[];
  events?: Record<string, CommunityEvent> | CommunityEvent[];
  roomScopeId?: string;
  onCreateChannelKind?: (input: { scopeType: string; scopeId: string; name: string; kind: CommunityChannelKind; mediaRoomId?: string }) => void;
}) {
  return (
    <CommunityCapabilityPanel
      channelId={channelId}
      events={events || state.calendarEvents}
      moderation={moderation}
      canModerate={canModerate}
      onScheduleEvent={onScheduleEvent}
      onCreatePoll={onCreatePoll}
      onVotePoll={onVotePoll}
      onClosePoll={onClosePoll}
      onRsvpEvent={onRsvpEvent}
      onReadNotification={onReadNotification}
      notifications={notifications || state.calendarNotifications}
      polls={polls || state.polls}
      channels={channels}
      onSetChannelPolicy={onSetChannelPolicy}
      onSetForumLayout={onSetForumLayout}
      onCreateForumTag={onCreateForumTag}
      onUpdateForumTag={onUpdateForumTag}
      onArchiveForumTag={onArchiveForumTag}
      roomScopeId={roomScopeId}
      onCreateChannelKind={onCreateChannelKind}
    />
  );
}
