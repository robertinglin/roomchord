import { useCallback, useEffect, useState } from "react";
import type { Room, PersonalUnreadMarker } from "matterhorn-sdk/client";
import type { Mosh } from "../../../../types";

export function usePersonalUnread(live: Room<Mosh>, topic?: string) {
  const [marker, setMarker] = useState<PersonalUnreadMarker | undefined>();

  useEffect(() => {
    let active = true;
    if (!topic) {
      setMarker(undefined);
      return () => { active = false; };
    }
    void Promise.resolve().then(() => live.getPersonalUnreadMarker(topic)).then((value) => {
      if (active) setMarker(value);
    }).catch(() => {
      if (active) setMarker(undefined);
    });
    let unsubscribe = () => {};
    try {
      unsubscribe = live.subscribePersonalUnread((markers) => {
        if (active) setMarker(markers[topic]);
      });
    } catch {
      if (active) setMarker(undefined);
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [live, topic]);

  const mark = useCallback((messageId: string, createdAt: number, label?: string) => {
    if (!topic) return;
    void Promise.resolve()
      .then(() => live.markPersonalUnread({ topic, messageId, createdAt, ...(label ? { label } : {}) }))
      .then(setMarker)
      .catch(() => undefined);
  }, [live, topic]);

  const clear = useCallback(() => {
    if (!topic) return;
    void Promise.resolve()
      .then(() => live.clearPersonalUnread(topic))
      .then(() => setMarker(undefined))
      .catch(() => undefined);
  }, [live, topic]);

  return { clear, mark, marker };
}
