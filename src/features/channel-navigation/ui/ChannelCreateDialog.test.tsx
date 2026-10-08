import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChannelCreateDialog } from "./ChannelCreateDialog";

const roles = [
  { id: "moderator", name: "Moderator", rank: 10, systemRole: false, archivedAt: null },
  { id: "member", name: "Member", rank: 1, systemRole: true, archivedAt: null },
] as never[];

describe("ChannelCreateDialog", () => {
  it("creates a private channel with selected roles and users", async () => {
    const user = userEvent.setup();
    const onCreateChannel = vi.fn();
    render(<ChannelCreateDialog kind="channel" open categories={[]} roles={roles} members={[{ id: "alice", name: "Alice" }]} onClose={vi.fn()} onCreateChannel={onCreateChannel} />);

    await user.type(screen.getByRole("textbox", { name: "Channel name" }), "Staff room");
    await user.selectOptions(screen.getByRole("combobox", { name: "Channel visibility" }), "private");
    await user.click(screen.getByRole("checkbox", { name: "Moderator" }));
    await user.click(screen.getByRole("checkbox", { name: "Alice" }));
    await user.click(screen.getByRole("button", { name: "Create channel" }));

    expect(onCreateChannel).toHaveBeenCalledWith(expect.objectContaining({
      name: "Staff room",
      visibility: "private",
      allowedRoleIds: ["moderator"],
      allowedMemberIds: ["alice"],
    }));
  });

  it("creates a private category with selected roles and users", async () => {
    const user = userEvent.setup();
    const onCreateCategory = vi.fn();
    render(<ChannelCreateDialog kind="category" open roles={roles} members={[{ id: "bob", name: "Bob" }]} onClose={vi.fn()} onCreateCategory={onCreateCategory} />);

    await user.type(screen.getByRole("textbox", { name: "Category name" }), "Operations");
    await user.selectOptions(screen.getByRole("combobox", { name: "Category visibility" }), "private");
    await user.click(screen.getByRole("checkbox", { name: "Member" }));
    await user.click(screen.getByRole("checkbox", { name: "Bob" }));
    await user.click(screen.getByRole("button", { name: "Create category" }));

    expect(onCreateCategory).toHaveBeenCalledWith({
      name: "Operations",
      visibility: "private",
      allowedRoleIds: ["member"],
      allowedMemberIds: ["bob"],
    });
  });
});
