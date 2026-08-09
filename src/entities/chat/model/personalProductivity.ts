import { useCallback, useEffect, useRef, useState } from "react";
import type { MatterhornBookmark, MatterhornReminder } from "matterhorn-sdk/browser";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh } from "../../../../types";

export type PersonalProductivityInput = {
  roomName: string;
  scopeType: string;
  scopeId: string;
  messageId: string;
};

export type PersonalProductivityController = ReturnType<typeof usePersonalProductivity>;

type PersonalProductivityRoom = Pick<MatterhornRoom<Mosh>, "personal">;

function itemId(prefix: "bookmark" | "reminder", messageId: string) {
  return `${prefix}:${messageId}`;
}

export function bookmarkInput(input: PersonalProductivityInput): Omit<MatterhornBookmark, "updatedAt"> {
  return {
    id: itemId("bookmark", input.messageId),
    roomName: input.roomName,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    messageId: input.messageId,
    createdAt: Date.now()
  };
}

export function reminderInput(input: PersonalProductivityInput, dueAt = Date.now() + 24 * 60 * 60 * 1000): Omit<MatterhornReminder, "updatedAt"> {
  return {
    id: itemId("reminder", input.messageId),
    roomName: input.roomName,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    messageId: input.messageId,
    dueAt,
    createdAt: Date.now()
  };
}

export function usePersonalProductivity(live: PersonalProductivityRoom) {
  const [bookmarks, setBookmarks] = useState<MatterhornBookmark[]>([]);
  const [reminders, setReminders] = useState<MatterhornReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const refreshRequest = useRef(0);
  const mutationEpoch = useRef(0);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequest.current;
    const epoch = mutationEpoch.current;
    setLoading(true);
    try {
      const [, nextBookmarks, nextReminders] = await Promise.all([
        live.personal.load(),
        live.personal.bookmarks(),
        live.personal.reminders({ includeCompleted: true })
      ]);
      if (requestId !== refreshRequest.current) return;
      setBookmarks(nextBookmarks);
      setReminders(nextReminders);
      if (epoch === mutationEpoch.current) setError(undefined);
    } catch (cause) {
      if (requestId !== refreshRequest.current) return;
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (requestId === refreshRequest.current) setLoading(false);
    }
  }, [live.personal]);

  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = useCallback((task: () => Promise<unknown>) => {
    const queued = mutationQueue.current.then(async () => {
      mutationEpoch.current += 1;
      setError(undefined);
      try {
        await task();
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    });
    mutationQueue.current = queued;
    return queued;
  }, [refresh]);

  const addBookmark = useCallback((input: Omit<MatterhornBookmark, "updatedAt">) => mutate(() => live.personal.addBookmark(input)), [live.personal, mutate]);
  const removeBookmark = useCallback((id: string) => mutate(() => live.personal.removeBookmark(id)), [live.personal, mutate]);
  const addReminder = useCallback((input: Omit<MatterhornReminder, "updatedAt">) => mutate(() => live.personal.addReminder(input)), [live.personal, mutate]);
  const scheduleReminder = useCallback((input: Omit<MatterhornReminder, "updatedAt">) => mutate(() => live.personal.scheduleReminder(input)), [live.personal, mutate]);
  const markReminderRead = useCallback((id: string) => mutate(() => live.personal.markReminderRead(id)), [live.personal, mutate]);
  const completeReminder = useCallback((id: string) => mutate(() => live.personal.completeReminder(id)), [live.personal, mutate]);
  const removeReminder = useCallback((id: string) => mutate(() => live.personal.removeReminder(id)), [live.personal, mutate]);

  return { addBookmark, addReminder, bookmarks, completeReminder, error, loading, markReminderRead, refresh, removeBookmark, removeReminder, reminders, scheduleReminder };
}
