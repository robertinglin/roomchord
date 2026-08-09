import React from "react";
import type { PersonalProductivityController } from "../model/usePersonalProductivity";

export function PersonalProductivityPanel({ productivity }: { productivity: PersonalProductivityController }) {
  if (!productivity.bookmarks.length && !productivity.reminders.length && !productivity.loading && !productivity.error) return null;

  return (
    <details onToggle={(event) => {
      const nextOpen = event.currentTarget.open;
      if (nextOpen) void productivity.refresh();
    }}>
      <summary><span>Bookmarks &amp; reminders</span> <span aria-hidden="true">·</span> {productivity.bookmarks.length} bookmarks, {productivity.reminders.length} reminders</summary>
      <section aria-label="Bookmarks and reminders">
          <div className="personal-productivity-head"><strong>Saved for you</strong><button type="button" onClick={() => { void productivity.refresh(); }} disabled={productivity.loading}>Refresh</button></div>
          {productivity.loading ? <span role="status">Loading personal items…</span> : null}
          {productivity.error ? <span role="alert">{productivity.error}</span> : null}
          <h3>Bookmarks</h3>
          {productivity.bookmarks.length ? <div className="personal-productivity-list">{productivity.bookmarks.map((bookmark) => (
            <div className="personal-productivity-item" key={bookmark.id}>
              <span>Saved message</span>
              <button type="button" aria-label="Remove bookmark" onClick={() => { void productivity.removeBookmark(bookmark.id); }}>Remove</button>
            </div>
          ))}</div> : <div className="personal-productivity-empty"><p>No bookmarks yet.</p><small>Save a message from its action menu.</small></div>}
          <h3>Reminders</h3>
          {productivity.reminders.length ? <div className="personal-productivity-list">{productivity.reminders.map((reminder) => (
            <div className="personal-productivity-item" key={reminder.id}>
              <span>{reminder.label || "Saved message reminder"}</span>
              <button type="button" onClick={() => { void productivity.markReminderRead(reminder.id); }}>Mark read</button>
              <button type="button" onClick={() => { void productivity.completeReminder(reminder.id); }}>Complete</button>
              <button type="button" onClick={() => { void productivity.removeReminder(reminder.id); }}>Remove reminder</button>
            </div>
          ))}</div> : <div className="personal-productivity-empty"><p>No reminders yet.</p><small>Set one from a message you want to revisit.</small></div>}
      </section>
    </details>
  );
}
