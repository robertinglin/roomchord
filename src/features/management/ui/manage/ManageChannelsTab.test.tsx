import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManageChannelsTab } from "./ManageChannelsTab";

const categories = [
  { id: "alpha", name: "Alpha", position: 0 },
  { id: "beta", name: "Beta", position: 1 }
];

function renderChannels(overrides: Partial<React.ComponentProps<typeof ManageChannelsTab>> = {}) {
  return render(
    <ManageChannelsTab
      canCreateChannels={false}
      canManageCategories
      categories={categories}
      channels={[]}
      onArchiveChannel={vi.fn()}
      onCreateChannel={vi.fn()}
      onUpdateChannel={vi.fn()}
      {...overrides}
    />
  );
}

describe("ManageChannelsTab management flows", () => {
  it("creates a category at the end of the ordered list", async () => {
    const user = userEvent.setup();
    const onCreateCategory = vi.fn();
    renderChannels({ onCreateCategory });

    await user.type(screen.getByRole("textbox", { name: "Category name" }), "Community");
    await user.click(screen.getByRole("button", { name: "Create category" }));

    expect(onCreateCategory).toHaveBeenCalledWith({ name: "Community", position: 2 });
  });

  it("reorders adjacent categories using their persisted positions", async () => {
    const user = userEvent.setup();
    const onReorderCategory = vi.fn();
    renderChannels({ onReorderCategory });

    await user.click(screen.getByRole("button", { name: "Move Beta up" }));

    expect(onReorderCategory).toHaveBeenNthCalledWith(1, "beta", 0);
    expect(onReorderCategory).toHaveBeenNthCalledWith(2, "alpha", 1);
  });

  it("archives the selected category", async () => {
    const user = userEvent.setup();
    const onArchiveCategory = vi.fn();
    renderChannels({ onArchiveCategory });

    await user.click(screen.getAllByRole("button", { name: "Archive" })[0]);

    expect(onArchiveCategory).toHaveBeenCalledWith("alpha");
  });

  it("keeps a private channel restricted to administrators without explicit roles", async () => {
    const user = userEvent.setup();
    const onCreateChannel = vi.fn();
    renderChannels({ canCreateChannels: true, onCreateChannel });

    await user.click(screen.getByRole("button", { name: "New channel" }));
    await user.type(screen.getByRole("textbox", { name: "Channel name" }), "Private notes");
    await user.selectOptions(screen.getByRole("combobox", { name: "Channel visibility" }), "private");
    await user.click(screen.getByRole("button", { name: "Create channel" }));

    expect(onCreateChannel).toHaveBeenCalledWith(expect.objectContaining({
      name: "Private notes",
      visibility: "private",
      allowedRoleIds: ["admin", "owner"],
      allowedMemberIds: []
    }));
  });

  it("submits role-or-member private channel grants", async () => {
    const user = userEvent.setup();
    const onCreateChannel = vi.fn();
    renderChannels({ canCreateChannels: true, onCreateChannel });

    await user.click(screen.getByRole("button", { name: "New channel" }));
    await user.type(screen.getByRole("textbox", { name: "Channel name" }), "Project room");
    await user.selectOptions(screen.getByRole("combobox", { name: "Channel visibility" }), "private");
    await user.type(screen.getByRole("textbox", { name: "Allowed role IDs" }), "reviewer, moderator");
    await user.type(screen.getByRole("textbox", { name: "Allowed member IDs" }), "alice, bob");
    await user.click(screen.getByRole("button", { name: "Create channel" }));

    expect(onCreateChannel).toHaveBeenCalledWith(expect.objectContaining({
      allowedRoleIds: ["admin", "owner", "reviewer", "moderator"],
      allowedMemberIds: ["alice", "bob"]
    }));
  });

  it("shows authoritative inherited-access provenance", () => {
    renderChannels({
      channels: [{ id: "planning", name: "planning", categoryId: "alpha" } as never],
      accessScopes: {
        "channel:planning": { source: "inherited", inheritedFrom: { scopeType: "category", scopeId: "alpha" } }
      }
    });

    expect(screen.getByText(/Access inherited from Alpha/)).toBeInTheDocument();
  });

  it("opens a requested channel directly in its editor", () => {
    renderChannels({
      initialChannelId: "planning",
      channels: [{ id: "planning", name: "planning", topic: "Plans", categoryId: "alpha" } as never]
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Manage channel name" })).toHaveValue("planning");
    expect(screen.getByRole("textbox", { name: "Manage channel topic" })).toHaveValue("Plans");
  });
});
