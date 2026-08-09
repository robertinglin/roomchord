import { useEffect, useState } from "react";
import type { EncryptedSearchResult, MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh } from "../../../../types";
import { matterhornSearchInput, type SearchFilters } from "./search";

export type RoomSearchState = {
  error?: string;
  loading: boolean;
  unavailableReason?: string;
  result?: EncryptedSearchResult;
};

export function useRoomSearch(live: MatterhornRoom<Mosh>, filters: SearchFilters, scopeId?: string): RoomSearchState {
  const [state, setState] = useState<RoomSearchState>({ loading: false });

  useEffect(() => {
    const query = filters.query.trim();
    if (!query) {
      setState({ loading: false });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState({ loading: true });
      void Promise.resolve().then(() => live.searchRoom(matterhornSearchInput(filters, scopeId, controller.signal))).then((result) => {
        if (!controller.signal.aborted) setState({ loading: false, result });
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Encrypted room search failed." });
      });
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [filters.after, filters.authorId, filters.before, filters.concurrency, filters.limit, filters.offset, filters.query, filters.scope, filters.scopes, live, scopeId]);

  return state;
}
