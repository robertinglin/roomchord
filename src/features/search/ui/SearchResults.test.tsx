import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchResults } from "@features/search/ui/SearchResults";
import type { RoomSearchState } from "@features/search/model/useRoomSearch";

describe("SearchResults", () => {
  it("enables the authorized global search categories", () => {
    render(<SearchResults filters={{ query: "launch", scope: "all" }} state={{ loading: false }} />);
    expect(screen.getByRole("region", { name: "Search results" })).not.toHaveTextContent("unavailable");
    expect(screen.getAllByRole("button")).toHaveLength(7);
    expect(screen.getAllByRole("button").every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
  });

  it("does not render a panel for an empty query", () => {
    render(<SearchResults filters={{ query: "  " }} />);
    expect(screen.queryByRole("region", { name: "Search unavailable" })).not.toBeInTheDocument();
  });

  it("renders loading, error, and authorized records", () => {
    const onScopeChange = vi.fn();
    const loading: RoomSearchState = { loading: true };
    const { rerender } = render(<SearchResults filters={{ query: "launch", scope: "messages" }} state={loading} onScopeChange={onScopeChange} />);
    expect(screen.getByRole("status")).toHaveTextContent("Searching encrypted room history");
    const messages = screen.getByRole("button", { name: "Messages" });
    expect(messages).not.toBeDisabled();
    messages.click();
    expect(onScopeChange).toHaveBeenCalledWith("messages");
    expect(screen.getByRole("button", { name: "All" })).not.toBeDisabled();

    rerender(<SearchResults filters={{ query: "launch", scope: "messages" }} state={{ loading: false, error: "search failed" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("search failed");
    rerender(<SearchResults filters={{ query: "launch", scope: "messages" }} state={{ loading: false, result: { events: [], matches: [], records: [{ id: "1", body: "launch now" }], total: 1, queryTokenCount: 1 } }} />);
    expect(screen.getByRole("region", { name: "Search results" })).toHaveTextContent("launch now");
    expect(screen.getByText("1 encrypted result")).toBeInTheDocument();
  });

  it("does not expose browser transport internals as search copy", () => {
    render(<SearchResults filters={{ query: "launch", scope: "all" }} state={{ loading: false, error: "DataCloneError: AbortSignal object could not be cloned." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Encrypted search could not be completed. Try again.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("DataCloneError");
  });

  it("renders safe match and event fallbacks when records are omitted", () => {
    const { rerender } = render(<SearchResults filters={{ query: "launch", scope: "all" }} state={{ loading: false, result: {
      events: [{ id: "event-1" }],
      matches: [{ eventId: "event-1", score: 1, matchedTokens: 1, queryTokenCount: 1, scope: { scopeType: "channel", scopeId: "general" } }],
      total: 1,
      queryTokenCount: 1
    } }} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Encrypted match 1 · channel:general");
    rerender(<SearchResults filters={{ query: "launch", scope: "all" }} state={{ loading: false, result: {
      events: [{ id: "event-1" }], matches: [], total: 1, queryTokenCount: 1
    } }} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Encrypted event event-1");
    rerender(<SearchResults filters={{ query: "launch", scope: "all" }} state={{ loading: false, result: {
      events: [], matches: [], records: [{ id: "record-1" }], total: 1, queryTokenCount: 1
    } }} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Encrypted result 1");
  });

  it("reports unavailable state only when the room controller is absent", () => {
    render(<SearchResults filters={{ query: "launch", scope: "all" }} />);
    expect(screen.getByRole("region", { name: "Search unavailable" })).toHaveTextContent("room connection");
  });

  it("keeps filtered-search controls authorized", () => {
    render(<SearchResults filters={{ query: "launch", scope: "messages", authorId: "alice" }} state={{ loading: false }} />);
    expect(screen.getByRole("region", { name: "Search results" })).not.toHaveTextContent("filtered-search");
    expect(screen.getByRole("button", { name: "Messages" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Files" })).not.toBeDisabled();
  });

  it("dispatches accessible author and date filters without local filtering", () => {
    const onFiltersChange = vi.fn();
    const { rerender } = render(<SearchResults
      filters={{ query: "launch", scope: "all" }}
      state={{ loading: false }}
      memberNamesById={{ bob: "Bob", alice: "Alice" }}
      onFiltersChange={onFiltersChange}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Search author" }), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText("Search after"), { target: { value: "2024-01-02" } });
    fireEvent.change(screen.getByLabelText("Search before"), { target: { value: "2024-01-03" } });
    rerender(<SearchResults
      filters={{ query: "launch", scope: "all", after: Date.UTC(2024, 0, 2), before: Date.UTC(2024, 0, 3) }}
      state={{ loading: false }}
      memberNamesById={{ bob: "Bob", alice: "Alice" }}
      onFiltersChange={onFiltersChange}
    />);
    fireEvent.change(screen.getByLabelText("Search after"), { target: { value: "" } });
    expect(onFiltersChange).toHaveBeenNthCalledWith(1, { authorId: "alice" });
    expect(onFiltersChange).toHaveBeenNthCalledWith(2, { after: Date.UTC(2024, 0, 2) });
    expect(onFiltersChange).toHaveBeenNthCalledWith(3, { before: Date.UTC(2024, 0, 3) });
    expect(onFiltersChange).toHaveBeenNthCalledWith(4, { after: undefined });
    expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
  });

  it("keeps advanced filters out of the narrow sidebar until requested and exposes removable chips", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(<SearchResults filters={{ query: "launch", scope: "all", authorId: "alice" }} state={{ loading: false }} memberNamesById={{ alice: "Alice" }} onFiltersChange={onFiltersChange} />);
    expect(screen.queryByRole("combobox", { name: "Search author" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Author: Alice ×" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ authorId: undefined });
  });
});
