import React, { useState } from "react";
import type { DirectThread } from "@entities/chat/model/types";
import type { DirectCallThreadPresence } from "@entities/chat/model/directCallThreads";
import { threadAvatar, threadTitle } from "@entities/chat/model/directThreads";
import { Badge, ChannelGroup, DirectMessageRow } from "@shared/ui/design";
import type { DirectThreadReservation } from "matterhorn-sdk/client";
import { GroupDmCreateDialog, type GroupThreadInput, type MemberOption } from "./GroupDmCreateDialog";

export function DirectMessages({
  threads,
  activeThreadId,
  currentUserId,
  memberNamesById,
  memberOptions,
  memberAvatarsById,
  unreadCounts,
  callPresenceByThreadId = {},
  onSelect,
  onClose,
  onCreateGroup,
  onAddMembers,
  onRemoveMembers,
  onLeaveThread,
  onRenameThread
}: {
  threads: DirectThread[];
  activeThreadId?: string;
  currentUserId?: string;
  memberNamesById: Record<string, string>;
  memberOptions?: MemberOption[];
  memberAvatarsById: Record<string, string>;
  unreadCounts: Record<string, number>;
  callPresenceByThreadId?: Record<string, DirectCallThreadPresence>;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCreateGroup?: (input: GroupThreadInput) => Promise<DirectThreadReservation>;
  onAddMembers?: (threadId: string, memberIds: string[]) => Promise<void>;
  onRemoveMembers?: (threadId: string, memberIds: string[]) => Promise<void>;
  onLeaveThread?: (threadId: string) => Promise<void>;
  onRenameThread?: (threadId: string, name: string) => Promise<void>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [manageThreadId, setManageThreadId] = useState<string>();
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedRemovalMemberIds, setSelectedRemovalMemberIds] = useState<string[]>([]);
  const [renameText, setRenameText] = useState("");
  const [error, setError] = useState<string>();

  const memberCandidates = (memberOptions || Object.entries(memberNamesById)
    .filter(([id]) => id !== currentUserId)
    .map(([id, name]) => ({ id, name })))
    .filter((member) => member.id !== currentUserId && Boolean(member.name.trim()) && member.name !== member.id);

  function membersForGroup(thread: DirectThread | undefined, kind: "add" | "remove") {
    if (!thread) return [];
    const participantIds = new Set<string>(thread.userIds.map(String));
    return memberCandidates.filter((member) => kind === "add" ? !participantIds.has(member.id) : participantIds.has(member.id));
  }

  function toggleMember(memberId: string, kind: "add" | "remove") {
    const setSelected = kind === "add" ? setSelectedMemberIds : setSelectedRemovalMemberIds;
    setSelected((current) => current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]);
  }

  async function manageMembers(kind: "add" | "remove") {
    if (!manageThreadId) return;
    const memberIds = kind === "add" ? selectedMemberIds : selectedRemovalMemberIds;
    if (!memberIds.length) return;
    try {
      if (kind === "add") await onAddMembers?.(manageThreadId, memberIds);
      else await onRemoveMembers?.(manageThreadId, memberIds);
      if (kind === "add") setSelectedMemberIds([]);
      else setSelectedRemovalMemberIds([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update group members.");
    }
  }

  async function renameThread(event: React.FormEvent) {
    event.preventDefault();
    if (!manageThreadId || !renameText.trim()) return;
    try {
      await onRenameThread?.(manageThreadId, renameText.trim());
      setRenameText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to rename group DM.");
    }
  }

  async function leaveThread() {
    if (!manageThreadId) return;
    try {
      await onLeaveThread?.(manageThreadId);
      setManageThreadId(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to leave group DM.");
    }
  }

  return (
    <ChannelGroup
      addLabel="Start group DM"
      label="Direct Messages"
      onAdd={onCreateGroup ? () => { setCreateOpen(true); setError(undefined); } : undefined}
    >
      {threads.length === 0 ? null : threads.map((thread) => {
        const title = threadTitle(thread, memberNamesById, currentUserId);
        const unread = unreadCounts[thread.id] || 0;
        const callPresence = callPresenceByThreadId[thread.id];
        return (
          <React.Fragment key={thread.id}>
            <DirectMessageRow
              avatar={threadAvatar(thread, memberAvatarsById, currentUserId)}
              name={title}
              preview={callPresence?.label}
              previewTone={callPresence?.held ? "warning" : callPresence ? "success" : "muted"}
              active={thread.id === activeThreadId}
              badge={unread > 0 ? <Badge count={unread} /> : undefined}
              onClose={() => onClose(thread.id)}
              onClick={() => onSelect(thread.id)}
              aria-label={unread > 0 ? `${title}, ${unread} unread DM${unread === 1 ? "" : "s"}` : title}
            />
            {(thread.userIds.length > 2 || Boolean(thread.name?.trim()) || Boolean(thread.ownerId)) && onAddMembers && onLeaveThread && onRenameThread ? (
              <button className="direct-message-manage" type="button" onClick={() => { setManageThreadId(thread.id); setSelectedMemberIds([]); setSelectedRemovalMemberIds([]); setRenameText(""); setError(undefined); }}>Manage {title} DM</button>
            ) : null}
            {manageThreadId === thread.id ? (
              <div className="group-dm-panel" role="region" aria-label={`Manage ${title} group DM`}>
                <form onSubmit={renameThread}>
                  <label>Group name<input aria-label="Group name" value={renameText} onChange={(event) => setRenameText(event.target.value)} /></label>
                  <button type="submit">Rename group</button>
                </form>
                <form onSubmit={(event) => { event.preventDefault(); void manageMembers("add"); }}>
                  <fieldset aria-label="People to add">
                    <legend>People to add</legend>
                    {membersForGroup(thread, "add").map((member) => (
                      <label key={member.id}><input type="checkbox" aria-label={member.name} checked={selectedMemberIds.includes(member.id)} onChange={() => toggleMember(member.id, "add")} />{member.name}</label>
                    ))}
                  </fieldset>
                  <button type="submit">Add members</button>
                  {onRemoveMembers ? (
                    <>
                      <fieldset aria-label="People to remove">
                        <legend>People to remove</legend>
                        {membersForGroup(thread, "remove").map((member) => (
                          <label key={member.id}><input type="checkbox" aria-label={member.name} checked={selectedRemovalMemberIds.includes(member.id)} onChange={() => toggleMember(member.id, "remove")} />{member.name}</label>
                        ))}
                      </fieldset>
                      <button type="button" onClick={() => { void manageMembers("remove"); }}>Remove members</button>
                    </>
                  ) : null}
                </form>
                <button type="button" onClick={() => { void leaveThread(); }}>Leave group DM</button>
                <button type="button" onClick={() => setManageThreadId(undefined)}>Close management</button>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      {createOpen && onCreateGroup ? (
        <GroupDmCreateDialog
          memberCandidates={memberCandidates}
          onClose={() => setCreateOpen(false)}
          onCreate={onCreateGroup}
          onCreated={onSelect}
        />
      ) : null}
      {error ? <span role="alert">{error}</span> : null}
    </ChannelGroup>
  );
}
