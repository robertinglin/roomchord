import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DirectThreadReservation } from "matterhorn-sdk/client";

export type GroupThreadInput = { memberIds: string[]; name?: string };
export type MemberOption = { id: string; name: string };

export function GroupDmCreateDialog({
  memberCandidates,
  onClose,
  onCreate,
  onCreated
}: {
  memberCandidates: MemberOption[];
  onClose: () => void;
  onCreate: (input: GroupThreadInput) => Promise<DirectThreadReservation>;
  onCreated: (threadId: string) => void;
}) {
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string>();
  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return memberCandidates;
    return memberCandidates.filter((member) => member.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [memberCandidates, query]);

  useEffect(() => {
    searchRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) => current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]);
  }

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedMemberIds.length) return;
    try {
      const reservation = await onCreate({ memberIds: selectedMemberIds, name: groupName.trim() || undefined });
      onCreated(reservation.threadId);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create group DM.");
    }
  }

  return createPortal(
    <div className="group-dm-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="group-dm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="group-dm-dialog-head">
          <span>
            <h2 id={titleId}>New group conversation</h2>
            <p>Search for people, then choose who to add.</p>
          </span>
          <button type="button" aria-label="Close group DM dialog" onClick={onClose}>×</button>
        </header>
        <form aria-label="Create group DM" onSubmit={(event) => { void createGroup(event); }}>
          <label className="group-dm-search">
            <span>Participants</span>
            <input
              ref={searchRef}
              type="search"
              aria-label="Search participants"
              placeholder="Type a name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <fieldset className="group-dm-people" aria-label="People to add">
            <legend>{selectedMemberIds.length ? `${selectedMemberIds.length} selected` : "Choose people"}</legend>
            {filteredMembers.map((member) => (
              <label key={member.id}>
                <input type="checkbox" aria-label={member.name} checked={selectedMemberIds.includes(member.id)} onChange={() => toggleMember(member.id)} />
                <span>{member.name}</span>
              </label>
            ))}
            {memberCandidates.length === 0 ? (
              <div className="group-dm-empty" role="status"><strong>No one to add yet</strong><span>Invite or connect with someone before starting a group conversation.</span></div>
            ) : filteredMembers.length === 0 ? (
              <div className="group-dm-empty" role="status"><strong>No matches</strong><span>Try another name.</span></div>
            ) : null}
          </fieldset>
          <label className="group-dm-name">Group name <span>Optional</span><input aria-label="New group name" disabled={!memberCandidates.length} placeholder="e.g. Design crew" value={groupName} onChange={(event) => setGroupName(event.target.value)} /></label>
          {error ? <span role="alert" className="group-dm-error">{error}</span> : null}
          <footer className="group-dm-actions">
            <button className="group-dm-cancel" type="button" onClick={onClose}>Cancel</button>
            <button className="group-dm-create" type="submit" disabled={!selectedMemberIds.length}>Create group DM</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
}
