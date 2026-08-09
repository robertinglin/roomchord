import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DirectMessages } from "./DirectMessages";
import type { DirectThread, MemberId, ThreadId } from "@entities/chat/model/types";

function thread(id: string, userIds: string[]): DirectThread {
  return { id: id as ThreadId, userIds: userIds as MemberId[], topic: null, createdAt: 1, archivedAt: null };
}

describe("DirectMessages direct-thread controls", () => {
  it("creates a group DM through the public reservation callback", async () => {
    const user = userEvent.setup();
    const onCreateGroup = vi.fn().mockResolvedValue({ threadId: "group-1", userIds: ["alice", "bob", "carol"] });
    const onSelect = vi.fn();
    render(<DirectMessages threads={[]} memberNamesById={{ bob: "Bob", carol: "Carol" }} memberAvatarsById={{}} unreadCounts={{}} onSelect={onSelect} onClose={vi.fn()} onCreateGroup={onCreateGroup} />);

    await user.click(screen.getByRole("button", { name: "Start group DM" }));
    expect(screen.getByRole("dialog", { name: "New group conversation" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Search participants" }), "Bob");
    expect(screen.getByRole("checkbox", { name: "Bob" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Carol" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Start group DM" }));
    await user.click(screen.getByRole("checkbox", { name: "Bob" }));
    await user.click(screen.getByRole("checkbox", { name: "Carol" }));
    await user.type(screen.getByRole("textbox", { name: "New group name" }), "Project");
    await user.click(screen.getByRole("button", { name: "Create group DM" }));

    expect(onCreateGroup).toHaveBeenCalledWith({ memberIds: ["bob", "carol"], name: "Project" });
    expect(onSelect).toHaveBeenCalledWith("group-1");
  });

  it("keeps empty group submissions inert and surfaces controller errors", async () => {
    const user = userEvent.setup();
    const onCreateGroup = vi.fn().mockRejectedValue(new Error("creation denied"));
    render(<DirectMessages threads={[]} memberNamesById={{ bob: "Bob" }} memberAvatarsById={{}} unreadCounts={{}} onSelect={vi.fn()} onClose={vi.fn()} onCreateGroup={onCreateGroup} />);
    await user.click(screen.getByRole("button", { name: "Start group DM" }));
    await user.click(screen.getByRole("button", { name: "Create group DM" }));
    expect(onCreateGroup).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: "Bob" }));
    await user.click(screen.getByRole("button", { name: "Create group DM" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("creation denied");
  });

  it("explains why a group cannot be created when no peers are eligible", async () => {
    const user = userEvent.setup();
    render(<DirectMessages threads={[]} currentUserId="alice" memberNamesById={{}} memberAvatarsById={{}} unreadCounts={{}} onSelect={vi.fn()} onClose={vi.fn()} onCreateGroup={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Start group DM" }));
    expect(screen.getByRole("status")).toHaveTextContent("No one to add yet");
    expect(screen.getByRole("textbox", { name: "New group name" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create group DM" })).toBeDisabled();
  });

  it("manages membership, rename, and leave through public callbacks", async () => {
    const user = userEvent.setup();
    const onAddMembers = vi.fn().mockResolvedValue(undefined);
    const onRemoveMembers = vi.fn().mockResolvedValue(undefined);
    const onLeaveThread = vi.fn().mockResolvedValue(undefined);
    const onRenameThread = vi.fn().mockResolvedValue(undefined);
    render(
      <DirectMessages
        threads={[thread("group-1", ["alice", "bob", "carol"])]}
        currentUserId="alice"
        memberNamesById={{ bob: "Bob", carol: "Carol", dana: "Dana", erin: "Erin" }}
        memberAvatarsById={{}}
        unreadCounts={{}}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onAddMembers={onAddMembers}
        onRemoveMembers={onRemoveMembers}
        onLeaveThread={onLeaveThread}
        onRenameThread={onRenameThread}
      />
    );

    await user.click(screen.getByRole("button", { name: "Manage Bob, Carol DM" }));
    await user.type(screen.getByRole("textbox", { name: "Group name" }), "Project");
    await user.click(screen.getByRole("button", { name: "Rename group" }));
    expect(onRenameThread).toHaveBeenCalledWith("group-1", "Project");
    await user.click(screen.getByRole("button", { name: "Close management" }));
    await user.click(screen.getByRole("button", { name: "Manage Bob, Carol DM" }));
    await user.click(screen.getByRole("checkbox", { name: "Dana" }));
    await user.click(screen.getByRole("button", { name: "Add members" }));
    expect(onAddMembers).toHaveBeenCalledWith("group-1", ["dana"]);
    await user.click(screen.getByRole("checkbox", { name: "Bob" }));
    await user.click(screen.getByRole("button", { name: "Remove members" }));
    expect(onRemoveMembers).toHaveBeenCalledWith("group-1", ["bob"]);
    await user.click(screen.getByRole("button", { name: "Leave group DM" }));
    expect(onLeaveThread).toHaveBeenCalledWith("group-1");
  });

  it("surfaces management errors from each public controller operation", async () => {
    const user = userEvent.setup();
    const onAddMembers = vi.fn().mockRejectedValue(new Error("add denied"));
    const onRemoveMembers = vi.fn().mockRejectedValue(new Error("remove denied"));
    const onLeaveThread = vi.fn().mockRejectedValue(new Error("leave denied"));
    const onRenameThread = vi.fn().mockRejectedValue(new Error("rename denied"));
    render(
      <DirectMessages
        threads={[thread("group-1", ["alice", "bob", "carol"])]}
        currentUserId="alice" memberNamesById={{ bob: "Bob", carol: "Carol", dana: "Dana", erin: "Erin" }} memberAvatarsById={{}} unreadCounts={{}}
        onSelect={vi.fn()} onClose={vi.fn()} onAddMembers={onAddMembers} onRemoveMembers={onRemoveMembers} onLeaveThread={onLeaveThread} onRenameThread={onRenameThread}
      />
    );
    await user.click(screen.getByRole("button", { name: "Manage Bob, Carol DM" }));
    await user.type(screen.getByRole("textbox", { name: "Group name" }), "Denied");
    await user.click(screen.getByRole("button", { name: "Rename group" }));
    await user.click(screen.getByRole("checkbox", { name: "Dana" }));
    await user.click(screen.getByRole("button", { name: "Add members" }));
    await user.click(screen.getByRole("checkbox", { name: "Erin" }));
    await user.click(screen.getByRole("button", { name: "Remove members" }));
    await user.click(screen.getByRole("button", { name: "Leave group DM" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("leave denied");
  });

  it("filters group add and remove choices by current membership", async () => {
    const user = userEvent.setup();
    render(
      <DirectMessages
        threads={[thread("group-1", ["alice", "bob", "carol"])]}
        currentUserId="alice"
        memberNamesById={{ bob: "Bob", carol: "Carol", dana: "Dana" }}
        memberAvatarsById={{}}
        unreadCounts={{}}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onAddMembers={vi.fn()}
        onRemoveMembers={vi.fn()}
        onLeaveThread={vi.fn()}
        onRenameThread={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "Manage Bob, Carol DM" }));
    const addGroup = screen.getByRole("group", { name: "People to add" });
    const removeGroup = screen.getByRole("group", { name: "People to remove" });
    expect(within(addGroup).queryByRole("checkbox", { name: "Bob" })).not.toBeInTheDocument();
    expect(within(addGroup).queryByRole("checkbox", { name: "Carol" })).not.toBeInTheDocument();
    expect(within(addGroup).getByRole("checkbox", { name: "Dana" })).toBeInTheDocument();
    expect(within(removeGroup).getByRole("checkbox", { name: "Bob" })).toBeInTheDocument();
    expect(within(removeGroup).getByRole("checkbox", { name: "Carol" })).toBeInTheDocument();
    expect(within(removeGroup).queryByRole("checkbox", { name: "Alice" })).not.toBeInTheDocument();
    expect(within(removeGroup).queryByRole("checkbox", { name: "Dana" })).not.toBeInTheDocument();
  });

  it("keeps a named group manageable after membership drops to two", async () => {
    const user = userEvent.setup();
    const named = { ...thread("group-1", ["alice", "bob"]), name: "Project", ownerId: "alice" as MemberId };
    render(
      <DirectMessages
        threads={[named]}
        currentUserId="alice"
        memberNamesById={{ bob: "Bob", carol: "Carol" }}
        memberAvatarsById={{}}
        unreadCounts={{}}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onAddMembers={vi.fn()}
        onRemoveMembers={vi.fn()}
        onLeaveThread={vi.fn()}
        onRenameThread={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Manage Project DM" }));
    expect(screen.getByRole("region", { name: "Manage Project group DM" })).toBeInTheDocument();
  });

  it("renders existing one-to-one rows without requiring group controls", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <DirectMessages
        threads={[thread("dm-1", ["alice", "bob"])]}
        activeThreadId="dm-1"
        currentUserId="alice"
        memberNamesById={{ bob: "Bob" }}
        memberAvatarsById={{ bob: "bob.png" }}
        unreadCounts={{ "dm-1": 2 }}
        callPresenceByThreadId={{ "dm-1": { label: "On a call", held: false, status: "connected" } }}
        onSelect={onSelect}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole("button", { name: "Bob, 2 unread DMs" }));
    expect(onSelect).toHaveBeenCalledWith("dm-1");
    await user.click(screen.getByRole("button", { name: "Close Bob DM" }));
    expect(onClose).toHaveBeenCalledWith("dm-1");
    expect(screen.queryByRole("button", { name: "Start group DM" })).not.toBeInTheDocument();
  });
});
