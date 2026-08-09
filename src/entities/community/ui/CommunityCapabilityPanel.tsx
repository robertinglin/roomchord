import React, { useMemo, useState } from "react";
import { activeModeration, upcomingEvents, type CommunityEvent, type ModerationRecord } from "@entities/community/model/communityCapabilities";

export type CommunityPollOption = { id: string; label: string };
export type CommunityPoll = {
  id: string;
  question?: string;
  title?: string;
  options: CommunityPollOption[];
  kind?: "single" | "multiple";
  maxSelections?: number;
  expiresAt?: number | null;
  closedAt?: number | null;
  counts?: Record<string, number>;
};
export type CommunityNotification = { id: string; eventId?: string; status?: string; readAt?: number | null };
export type CommunityChannelKind = "text" | "forum" | "announcement" | "onboarding" | "rules" | "voice-text" | "stage";
export type CommunityChannelPolicy = "members" | "moderators" | "none";
export type CommunityForumTag = { id: string; name: string; color?: string | null; archivedAt?: number | null };
export type CommunityChannel = { id: string; name: string; kind?: CommunityChannelKind; mediaRoomId?: string; postingPolicy?: CommunityChannelPolicy; threadPolicy?: CommunityChannelPolicy; speakerPolicy?: CommunityChannelPolicy; forumLayout?: "list" | "gallery"; forumTags?: Record<string, CommunityForumTag> };

type Props = {
  channelId: string;
  events?: Record<string, CommunityEvent> | CommunityEvent[];
  moderation?: ModerationRecord;
  canModerate?: boolean;
  onScheduleEvent?: (input: { scopeType: string; scopeId: string; title: string; startsAt: number; location?: string }) => void;
  polls?: Record<string, CommunityPoll> | CommunityPoll[];
  notifications?: Record<string, CommunityNotification> | CommunityNotification[];
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
  roomScopeId?: string;
  onCreateChannelKind?: (input: { scopeType: string; scopeId: string; name: string; kind: CommunityChannelKind; mediaRoomId?: string }) => void;
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function records<T>(value: Record<string, T> | T[] | undefined): T[] {
  return Array.isArray(value) ? value : Object.values(value || {});
}

export function CommunityCapabilityPanel({ channelId, events = [], moderation, canModerate = false, onScheduleEvent, polls = [], notifications = [], onCreatePoll, onVotePoll, onClosePoll, onRsvpEvent, onReadNotification, channels = [], onSetChannelPolicy, onSetForumLayout, onCreateForumTag, onUpdateForumTag, onArchiveForumTag, roomScopeId, onCreateChannelKind }: Props) {
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [pollKind, setPollKind] = useState<"single" | "multiple">("single");
  const [selectedPollOptions, setSelectedPollOptions] = useState<Record<string, string[]>>({});
  const [channelName, setChannelName] = useState("");
  const [channelKind, setChannelKind] = useState<CommunityChannelKind>("forum");
  const [mediaRoomId, setMediaRoomId] = useState("");
  const [forumTagName, setForumTagName] = useState("");
  const [forumTagColor, setForumTagColor] = useState("");
  const [editingForumTagId, setEditingForumTagId] = useState<string>();
  const [editingForumTagName, setEditingForumTagName] = useState("");
  const [editingForumTagColor, setEditingForumTagColor] = useState("");
  const visibleEvents = useMemo(() => upcomingEvents(events), [events]);
  const visiblePolls = useMemo(() => records(polls), [polls]);
  const visibleNotifications = useMemo(() => records(notifications), [notifications]);
  const moderationLabels = activeModeration(moderation);

  function submitEvent(event: React.FormEvent) {
    event.preventDefault();
    const startsAt = Date.parse(eventStartsAt);
    if (!onScheduleEvent || !eventTitle.trim() || !Number.isFinite(startsAt)) return;
    onScheduleEvent({ scopeType: "channel", scopeId: channelId, title: eventTitle.trim(), startsAt, location: eventLocation.trim() || undefined });
    setEventTitle("");
    setEventStartsAt("");
    setEventLocation("");
  }

  function submitPoll(event: React.FormEvent) {
    event.preventDefault();
    const options = pollOptions.split(",").map((option) => option.trim()).filter(Boolean);
    if (!onCreatePoll || !pollQuestion.trim() || options.length < 2) return;
    onCreatePoll({ scopeType: "channel", scopeId: channelId, question: pollQuestion.trim(), options, kind: pollKind });
    setPollQuestion("");
    setPollOptions("");
    setPollKind("single");
  }

  function togglePollOption(poll: CommunityPoll, optionId: string) {
    const selected = selectedPollOptions[poll.id] || [];
    const next = poll.kind === "multiple"
      ? selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId]
      : selected.includes(optionId) ? [] : [optionId];
    setSelectedPollOptions((current) => ({ ...current, [poll.id]: next }));
  }

  function submitChannelKind(event: React.FormEvent) {
    event.preventDefault();
    if (!onCreateChannelKind || !channelName.trim() || !channelKind) return;
    if (channelKind === "voice-text" && !mediaRoomId.trim()) return;
    onCreateChannelKind({ scopeType: "room", scopeId: roomScopeId || channelId, name: channelName.trim(), kind: channelKind, mediaRoomId: mediaRoomId.trim() || undefined });
    setChannelName("");
    setMediaRoomId("");
  }

  return (
    <div className="community-capabilities" data-testid="community-capability-panel">
      {moderationLabels.length ? (
        <section className="community-card community-moderation" aria-label="Your moderation status">
          <strong>Account restrictions</strong>
          <span>{moderationLabels.join(" · ")}</span>
        </section>
      ) : null}

      <section className="community-section" aria-label="Participation">
        <header className="community-section-head"><h3>Participation</h3><p>Run lightweight decisions and keep the room’s calendar visible.</p></header>
        <div className="community-grid">
      {onCreatePoll && canModerate ? (
        <form className="community-card" onSubmit={submitPoll} aria-label="Create a poll">
          <strong>Create a poll</strong>
          <small>Polls are encrypted and reduced by Matterhorn.</small>
          <input aria-label="Poll question" value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="Ask a question" maxLength={500} />
          <input aria-label="Poll options" value={pollOptions} onChange={(event) => setPollOptions(event.target.value)} placeholder="Options separated by commas" />
          <select aria-label="Poll kind" value={pollKind} onChange={(event) => setPollKind(event.target.value as "single" | "multiple")}>
            <option value="single">Single choice</option>
            <option value="multiple">Multiple choice</option>
          </select>
          <button type="submit" disabled={!pollQuestion.trim() || pollOptions.split(",").filter((option) => option.trim()).length < 2}>Create poll</button>
        </form>
      ) : null}

      {onScheduleEvent && canModerate ? (
        <form className="community-card" onSubmit={submitEvent} aria-label="Schedule an event">
          <strong>Schedule an event</strong>
          <small>Publish a calendar entry for this channel. Attendees can RSVP below.</small>
          <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Event title" maxLength={180} />
          <input aria-label="Event start time" type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} />
          <input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder="Location or voice room (optional)" maxLength={240} />
          <button type="submit" disabled={!eventTitle.trim() || !eventStartsAt}>Schedule event</button>
        </form>
      ) : null}
        </div>

      {visiblePolls.length ? (
        <section className="community-card" aria-label="Polls">
          <header><strong>Polls</strong><span>{visiblePolls.length}</span></header>
          {visiblePolls.map((poll) => {
            const selected = selectedPollOptions[poll.id] || [];
            const closed = Boolean(poll.closedAt || (poll.expiresAt !== null && poll.expiresAt !== undefined && poll.expiresAt <= Date.now()));
            return (
              <article className="community-poll" key={poll.id}>
                <strong>{poll.question || poll.title || "Poll"}</strong>
                {poll.options.map((option) => (
                  <button key={option.id} type="button" disabled={closed} aria-pressed={selected.includes(option.id)} onClick={() => togglePollOption(poll, option.id)}>
                    {option.label}<span>{poll.counts?.[option.id] ?? 0}</span>
                  </button>
                ))}
                <div className="community-event-actions">
                  {onVotePoll ? <button type="button" disabled={closed || selected.length === 0} onClick={() => onVotePoll(poll.id, selected)}>Vote</button> : null}
                  {canModerate && onClosePoll ? <button type="button" disabled={closed} onClick={() => onClosePoll(poll.id)}>Close poll</button> : null}
                  {closed ? <span>Closed</span> : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {visibleEvents.length ? (
        <section className="community-card" aria-label="Scheduled events">
          <header><strong>Scheduled events</strong><span>{visibleEvents.length}</span></header>
          {visibleEvents.map((event) => (
            <article className="community-event" key={event.id}>
              <div><strong>{event.title}</strong><span>{formatDate(event.startsAt || 0)}{event.location ? ` · ${event.location}` : ""}</span></div>
              <span>Calendar event</span>
              {onRsvpEvent ? (
                <div className="community-event-actions">
                  {(["going", "maybe", "declined"] as const).map((status) => <button key={status} type="button" onClick={() => onRsvpEvent(event.id, status)}>{status}</button>)}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {visibleNotifications.length ? (
        <section className="community-card" aria-label="Calendar notifications">
          <header><strong>Calendar notifications</strong><span>{visibleNotifications.length}</span></header>
          {visibleNotifications.map((notification) => (
            <div key={notification.id}>
              <span>{notification.status ? `RSVP: ${notification.status}` : "Calendar update"}</span>
              {onReadNotification ? <button type="button" disabled={Boolean(notification.readAt)} onClick={() => onReadNotification(notification.id)}>{notification.readAt ? "Read" : "Mark read"}</button> : null}
            </div>
          ))}
        </section>
      ) : null}
      </section>

      {(channels.length || (onCreateChannelKind && canModerate)) ? (
        <section className="community-section" aria-label="Channel setup">
          <header className="community-section-head"><h3>Channel setup</h3><p>Choose a channel’s purpose first, then set the minimum permissions it needs.</p></header>
          <div className="community-grid">
      {onCreateChannelKind && canModerate ? (
        <form className="community-card" onSubmit={submitChannelKind} aria-label="Create channel kind">
          <strong>Create a channel</strong>
          <small>Channel kinds give members an expectation before they enter.</small>
          <input aria-label="Community channel name" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Channel name" />
          <select aria-label="Community channel kind" value={channelKind} onChange={(event) => setChannelKind(event.target.value as CommunityChannelKind)}>
            {(["forum", "announcement", "onboarding", "rules", "stage", "voice-text"] as const).map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </select>
          {channelKind === "voice-text" ? <input aria-label="Media room id" value={mediaRoomId} onChange={(event) => setMediaRoomId(event.target.value)} placeholder="Media room id" /> : null}
          <button type="submit" disabled={!channelName.trim() || (channelKind === "voice-text" && !mediaRoomId.trim())}>Create channel kind</button>
        </form>
      ) : null}
      {channels.length ? (
        <section className="community-card" aria-label="Channel kinds">
          <header><strong>Channel kinds and policies</strong><span>{channels.length}</span></header>
          {channels.map((channel) => (
            <div className="community-channel" key={channel.id}>
              <span>#{channel.name} · {channel.kind || "text"}{channel.mediaRoomId ? ` · ${channel.mediaRoomId}` : ""}</span>
              {canModerate && onSetChannelPolicy ? (
                <div className="community-channel-controls">
                  <select aria-label={`Posting policy for ${channel.name}`} value={channel.postingPolicy || "members"} onChange={(event) => onSetChannelPolicy(channel.id, "posting", event.target.value as "members" | "moderators" | "none")}>
                    <option value="members">Members can post</option>
                    <option value="moderators">Moderators can post</option>
                    <option value="none">Posting disabled</option>
                  </select>
                  {channel.kind === "forum" ? <select aria-label={`Thread policy for ${channel.name}`} value={channel.threadPolicy || "members"} onChange={(event) => onSetChannelPolicy(channel.id, "thread", event.target.value as "members" | "moderators" | "none")}><option value="members">Members can thread</option><option value="moderators">Moderators can thread</option><option value="none">Threads disabled</option></select> : null}
                  {channel.kind === "stage" || channel.kind === "voice-text" ? <select aria-label={`Speaker policy for ${channel.name}`} value={channel.speakerPolicy || "moderators"} onChange={(event) => onSetChannelPolicy(channel.id, "speaker", event.target.value as "members" | "moderators" | "none")}><option value="members">Members can speak</option><option value="moderators">Moderators can speak</option><option value="none">Speaking disabled</option></select> : null}
                </div>
              ) : null}
              {channel.kind === "forum" ? (
                <div className="community-forum-controls" aria-label={`Forum settings for ${channel.name}`}>
                  {canModerate && onSetForumLayout ? <label>Layout<select aria-label={`Forum layout for ${channel.name}`} value={channel.forumLayout || "list"} onChange={(event) => onSetForumLayout(channel.id, event.target.value as "list" | "gallery")}><option value="list">List</option><option value="gallery">Gallery</option></select></label> : <span>Layout: {channel.forumLayout || "list"}</span>}
                  <strong>Tags</strong>
                  {Object.values(channel.forumTags || {}).filter((tag) => !tag.archivedAt).map((tag) => editingForumTagId === tag.id ? (
                    <form key={tag.id} onSubmit={(event) => { event.preventDefault(); if (!editingForumTagName.trim() || !onUpdateForumTag) return; onUpdateForumTag(channel.id, tag.id, editingForumTagName.trim(), editingForumTagColor.trim() || undefined); setEditingForumTagId(undefined); }}>
                      <input aria-label={`Edit forum tag ${tag.name}`} value={editingForumTagName} onChange={(event) => setEditingForumTagName(event.target.value)} />
                      <input aria-label={`Edit forum tag color ${tag.name}`} value={editingForumTagColor} onChange={(event) => setEditingForumTagColor(event.target.value)} placeholder="Color" />
                      <button type="submit" disabled={!editingForumTagName.trim()}>Save tag</button>
                    </form>
                  ) : (
                    <div key={tag.id}><span>{tag.name}</span>{canModerate && onUpdateForumTag ? <button type="button" onClick={() => { setEditingForumTagId(tag.id); setEditingForumTagName(tag.name); setEditingForumTagColor(tag.color || ""); }}>Edit tag</button> : null}{canModerate && onArchiveForumTag ? <button type="button" onClick={() => onArchiveForumTag(channel.id, tag.id)}>Archive tag</button> : null}</div>
                  ))}
                  {canModerate && onCreateForumTag ? <form onSubmit={(event) => { event.preventDefault(); if (!forumTagName.trim()) return; onCreateForumTag(channel.id, forumTagName.trim(), forumTagColor.trim() || undefined); setForumTagName(""); setForumTagColor(""); }}><input aria-label={`New forum tag for ${channel.name}`} value={forumTagName} onChange={(event) => setForumTagName(event.target.value)} placeholder="New tag" /><input aria-label={`New forum tag color for ${channel.name}`} value={forumTagColor} onChange={(event) => setForumTagColor(event.target.value)} placeholder="Color" /><button type="submit" disabled={!forumTagName.trim()}>Create tag</button></form> : null}
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
