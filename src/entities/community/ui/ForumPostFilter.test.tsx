import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForumPostFilter } from "@entities/community/ui/ForumPostFilter";

describe("ForumPostFilter", () => {
  it("renders the authoritative count and forwards filter changes", () => {
    const onQueryChange = vi.fn();
    render(<ForumPostFilter query="launch" postCount={2} onQueryChange={onQueryChange} />);
    expect(screen.getByRole("region", { name: "Forum posts" })).toHaveTextContent("2 posts");
    fireEvent.change(screen.getByRole("textbox", { name: "Filter forum posts" }), { target: { value: "release" } });
    expect(onQueryChange).toHaveBeenCalledWith("release");
    expect(screen.getByText(/No forum tags are configured/)).toBeInTheDocument();
  });

  it("filters by authoritative tags and exposes moderator layout/tag operations", () => {
    const onTagChange = vi.fn();
    const onLayoutChange = vi.fn();
    const onCreateTag = vi.fn();
    const onUpdateTag = vi.fn();
    const onArchiveTag = vi.fn();
    render(<ForumPostFilter query="" postCount={1} onQueryChange={vi.fn()} tags={[{ id: "release", name: "Release", color: "#fff" }]} onTagChange={onTagChange} onLayoutChange={onLayoutChange} onCreateTag={onCreateTag} onUpdateTag={onUpdateTag} onArchiveTag={onArchiveTag} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Filter forum posts by tag" }), { target: { value: "release" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Forum layout" }), { target: { value: "gallery" } });
    expect(onTagChange).toHaveBeenCalledWith("release");
    expect(onLayoutChange).toHaveBeenCalledWith("gallery");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Edit tag Release" }), { target: { value: "Ship" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onUpdateTag).toHaveBeenCalledWith("release", "Ship", "#fff");
    fireEvent.change(screen.getByRole("textbox", { name: "New forum tag" }), { target: { value: "Support" } });
    fireEvent.click(screen.getByRole("button", { name: "Create tag" }));
    expect(onCreateTag).toHaveBeenCalledWith("Support", undefined);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onArchiveTag).toHaveBeenCalledWith("release");
  });
});
