import React, { useState } from "react";
import { dateInputValue, epochMillisForDateInput, type SearchFilters, type SearchScope } from "@features/search/model/search";
import type { RoomSearchState } from "@features/search/model/useRoomSearch";

function resultLabel(record: Record<string, unknown>, fallback: string) {
  for (const key of ["body", "text", "title", "name"]) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  return fallback;
}

function resultItems(state: NonNullable<RoomSearchState["result"]>) {
  if (state.records?.length) return state.records.map((record, index) => resultLabel(record, `Encrypted result ${index + 1}`));
  if (state.matches.length) return state.matches.map((match, index) => {
    const scope = match.scope ? ` · ${match.scope.scopeType}:${match.scope.scopeId}` : "";
    return `Encrypted match ${index + 1}${scope}`;
  });
  return state.events.map((event, index) => `Encrypted event ${event.id || index + 1}`);
}

function visibleSearchError(error: string) {
  return /DataCloneError|could not be cloned|AbortSignal/iu.test(error)
    ? "Encrypted search could not be completed. Try again."
    : error;
}

export function SearchResults({
  filters,
  state,
  onScopeChange,
  onFiltersChange,
  memberNamesById = {}
}: {
  filters: SearchFilters;
  state?: RoomSearchState;
  onScopeChange?: (scope: SearchScope) => void;
  onFiltersChange?: (patch: Partial<SearchFilters>) => void;
  memberNamesById?: Record<string, string>;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  if (!filters.query.trim()) return null;
  const scopeOptions: SearchScope[] = ["all", "messages", "files", "members", "channels", "threads"];
  const unavailableReason = state?.unavailableReason
    || (!state ? "Current-channel message search is unavailable until the room connection is ready." : undefined);
  return (
    <section className="search-results" aria-label={unavailableReason ? "Search unavailable" : "Search results"}>
      <header className="search-head">
        <strong>Search this room</strong>
        <span>Messages, people, channels, and shared files</span>
      </header>
      <div className="search-filters" role="toolbar" aria-label="Search filters">
        {scopeOptions.map((scope) => {
          const scopeName = scope;
          return (
          <button
            key={scopeName}
            type="button"
            disabled={!state}
            className={filters.scope === scopeName ? "active" : ""}
            aria-pressed={filters.scope === scopeName}
            title={`Search encrypted ${scopeName}`}
            onClick={() => onScopeChange?.(scopeName)}
          >
            {scopeName === "all" ? "All" : scopeName[0].toUpperCase() + scopeName.slice(1)}
          </button>
          );
        })}
        <button type="button" className="search-more" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
          Filters{filters.authorId || filters.after || filters.before ? " · active" : ""}
        </button>
      </div>
      {filters.authorId || filters.after || filters.before ? <div className="search-filter-chips" aria-label="Active search filters">
        {filters.authorId ? <button type="button" onClick={() => onFiltersChange?.({ authorId: undefined })}>Author: {memberNamesById[filters.authorId] || filters.authorId} ×</button> : null}
        {filters.after ? <button type="button" onClick={() => onFiltersChange?.({ after: undefined })}>After: {dateInputValue(filters.after)} ×</button> : null}
        {filters.before ? <button type="button" onClick={() => onFiltersChange?.({ before: undefined })}>Before: {dateInputValue(filters.before)} ×</button> : null}
      </div> : null}
      {filtersOpen ? <div className="search-query-filters" aria-label="Search query filters">
        <label>
          Author
          <select
            aria-label="Search author"
            value={filters.authorId || ""}
            onChange={(event) => onFiltersChange?.({ authorId: event.currentTarget.value || undefined })}
          >
            <option value="">All authors</option>
            {Object.entries(memberNamesById).sort(([left], [right]) => left.localeCompare(right)).map(([memberId, name]) => (
              <option key={memberId} value={memberId}>{name || memberId}</option>
            ))}
          </select>
        </label>
        <label>
          After
          <input
            aria-label="Search after"
            type="date"
            value={dateInputValue(filters.after)}
            onChange={(event) => onFiltersChange?.({ after: epochMillisForDateInput(event.currentTarget.value) })}
          />
        </label>
        <label>
          Before
          <input
            aria-label="Search before"
            type="date"
            value={dateInputValue(filters.before)}
            onChange={(event) => onFiltersChange?.({ before: epochMillisForDateInput(event.currentTarget.value) })}
          />
        </label>
      </div>
      : null}
      {unavailableReason ? <p className="search-empty" role="status">{unavailableReason}</p> : null}
      {state?.loading ? <p className="search-empty" role="status">Searching encrypted room history…</p> : null}
      {state?.error ? <div className="search-error" role="alert" title={state.error}><strong>Search unavailable</strong><span>{visibleSearchError(state.error)}</span></div> : null}
      {!state?.loading && !state?.error && state?.result ? (
        <div aria-label="Search results">
          <p className="search-empty">{state.result.total} encrypted result{state.result.total === 1 ? "" : "s"}</p>
          {resultItems(state.result).length ? (
            <ol className="search-result-list">
              {resultItems(state.result).map((label, index) => (
                <li key={`${label}:${index}`}>{label}</li>
              ))}
            </ol>
          ) : <p className="search-empty">No matching results.</p>}
        </div>
      ) : null}
    </section>
  );
}
