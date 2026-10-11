import { useEffect, useRef, useState } from "react";
import type { EncryptedEventResponse, Room } from "matterhorn-sdk/client";
import type { Mosh } from "../../../../types";

export type RoomHistoryState = {
  error?: string;
  loading: boolean;
  records: Array<Record<string, unknown>>;
  cursor?: string;
  loadOlder: () => void;
  jumpToCursor: (cursor: string) => void;
};
export type RoomHistoryScopeType = "channel" | "thread" | "direct.thread";

function recordsFromResponse(response: EncryptedEventResponse) {
  return (response.records || []).filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === "object" && !Array.isArray(record));
}

export function useRoomHistory(live: Room<Mosh>, scopeId?: string, scopeType: RoomHistoryScopeType = "channel"): RoomHistoryState {
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const request = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    request.current?.abort();
    setRecords([]);
    setCursor(undefined);
    setLoading(false);
    setError(undefined);
    return () => {
      request.current?.abort();
      request.current = undefined;
    };
  }, [scopeId, scopeType]);

  function run(loader: (signal: AbortSignal) => Promise<EncryptedEventResponse>, replace = false) {
    if (!scopeId || loading) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(undefined);
    void Promise.resolve().then(() => loader(controller.signal)).then((response) => {
      if (controller.signal.aborted) return;
      const nextRecords = recordsFromResponse(response);
      setRecords((current) => replace ? nextRecords : [...current, ...nextRecords]);
      setCursor(response.nextBeforeHlc);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Encrypted room history failed.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
  }

  function loadOlder() {
    run((signal) => live.loadRoomHistory({
      scope: { scopeType, scopeId: scopeId! },
      ...(cursor ? { beforeHlc: cursor } : {}),
      limit: 50,
      timeoutMs: 10_000,
      signal
    }));
  }

  function jumpToCursor(nextCursor: string) {
    const value = nextCursor.trim();
    if (!value) return;
    run((signal) => live.jumpRoomHistory({
      scope: { scopeType, scopeId: scopeId! },
      beforeHlc: value,
      limit: 50,
      timeoutMs: 10_000,
      signal
    }), true);
  }

  return { cursor, error, loading, records, loadOlder, jumpToCursor };
}
