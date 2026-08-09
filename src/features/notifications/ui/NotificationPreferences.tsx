import React, { useEffect, useMemo, useState } from "react";
import {
  defaultNotificationPreference,
  loadNotificationPreference,
  saveNotificationPreference,
  type NotificationMode,
  type NotificationPreference,
  type NotificationPreferenceScope
} from "@shared/model/notificationPreferences";

const DURATION_OPTIONS = [
  { value: "none", label: "No mute" },
  { value: "3600000", label: "1 hour" },
  { value: "28800000", label: "8 hours" },
  { value: "86400000", label: "24 hours" },
  { value: "forever", label: "Until I turn it back on" }
] as const;

function preferenceLabel(preference: NotificationPreference) {
  if (preference.mode === "none") return "Nothing";
  if (preference.mode === "mentions") return "Mentions only";
  return "All activity";
}

function selectedDuration(preference: NotificationPreference) {
  if (preference.muteUntil === null) return "none";
  if (preference.muteUntil === Number.MAX_SAFE_INTEGER) return "forever";
  const remaining = preference.muteUntil - Date.now();
  if (remaining <= 0) return "none";
  const matching = DURATION_OPTIONS.find((option) => option.value !== "none" && option.value !== "forever" && Number(option.value) >= remaining);
  return matching?.value || "forever";
}

export function NotificationPreferences({ scope, label = "Notifications" }: { scope: NotificationPreferenceScope; label?: string }) {
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<NotificationPreference>(() => loadNotificationPreference(scope));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPreference(loadNotificationPreference(scope));
    setSaved(false);
  }, [scope.roomId, scope.scopeId, scope.scopeType]);

  const summary = useMemo(() => preferenceLabel(preference), [preference]);

  function update(next: NotificationPreference) {
    const normalized = { ...next };
    setPreference(normalized);
    saveNotificationPreference(scope, normalized);
    setSaved(true);
  }

  function setMode(mode: NotificationMode) {
    update({ ...preference, mode });
  }

  function setDuration(value: string) {
    if (value === "none") update({ ...preference, muteUntil: null });
    else if (value === "forever") update({ ...preference, muteUntil: Number.MAX_SAFE_INTEGER });
    else update({ ...preference, muteUntil: Date.now() + Number(value) });
  }

  return (
    <section aria-label={`${label} preferences`} style={{ position: "relative", zIndex: 3 }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} style={{ padding: "6px 10px", border: "1px solid rgba(255,255,255,.14)", borderRadius: 6, color: "inherit", background: "rgba(255,255,255,.04)", cursor: "pointer" }}>
        {label}: {summary}
      </button>
      {open ? (
        <div role="dialog" aria-label={`${label} preferences`} style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 280, padding: 14, display: "grid", gap: 10, border: "1px solid rgba(255,255,255,.16)", borderRadius: 8, background: "#15171a", boxShadow: "0 12px 35px rgba(0,0,0,.35)" }}>
          <strong>{label} for this space</strong>
          <fieldset style={{ display: "grid", gap: 6, border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 12, opacity: .72 }}>Notify me about</legend>
            {(["all", "mentions", "none"] as const).map((mode) => (
              <label key={mode} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" name={`notification-mode-${scope.scopeType}-${scope.scopeId}`} checked={preference.mode === mode} onChange={() => setMode(mode)} />
                {mode === "all" ? "All activity" : mode === "mentions" ? "Mentions and direct messages" : "Nothing"}
              </label>
            ))}
          </fieldset>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: .72 }}>Mute duration</span>
            <select aria-label="Mute duration" value={selectedDuration(preference)} onChange={(event) => setDuration(event.target.value)}>
              {DURATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {saved ? <span role="status">Notification preferences saved on this device.</span> : null}
        </div>
      ) : null}
    </section>
  );
}

export function resetNotificationPreference(scope: NotificationPreferenceScope) {
  saveNotificationPreference(scope, defaultNotificationPreference());
}
