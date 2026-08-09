import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThreadPanel } from "@shared/ui/ThreadPanel";

describe("ThreadPanel", () => {
  it("renders comments and sends a reply", async () => {
    const user = userEvent.setup();
    const onAddComment = vi.fn();
    render(<ThreadPanel
      thread={{ id: "thread", scopeType: "channel", scopeId: "general", title: "Launch", resolved: false, createdAt: 1, archivedAt: null }}
      comments={[
        { id: "comment", threadId: "thread", body: "Ready", authorId: "mina", createdAt: 1, deletedAt: null, reactions: {} },
        { id: "comment-2", threadId: "thread", body: "Fallback", authorId: "unknown", authorName: "Guest", createdAt: 2, deletedAt: null, reactions: {} }
      ]}
      memberNamesById={{ mina: "Mina" }}
      currentUserId="mina"
      onAddComment={onAddComment}
      onResolve={vi.fn()}
      onClose={vi.fn()}
    />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Thread reply" }), "Ship it");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onAddComment).toHaveBeenCalledWith("Ship it");
  });

  it("renders the empty and resolved branches and supports reopen/close", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<ThreadPanel
      thread={{ id: "thread", scopeType: "channel", scopeId: "general", title: null, resolved: false, createdAt: 1, archivedAt: null }}
      comments={[]}
      memberNamesById={{}}
      onAddComment={vi.fn()}
      onResolve={onResolve}
      onClose={onClose}
    />);
    expect(screen.getByText("No replies yet.")).toBeInTheDocument();
    fireEvent.submit(screen.getByRole("button", { name: "Send" }).closest("form")!);
    await user.click(screen.getByRole("button", { name: "Close thread" }));
    expect(onClose).toHaveBeenCalled();
    rerender(<ThreadPanel
      thread={{ id: "thread", scopeType: "channel", scopeId: "general", title: null, resolved: true, createdAt: 1, archivedAt: null }}
      comments={[]}
      memberNamesById={{}}
      onAddComment={vi.fn()}
      onResolve={onResolve}
      onClose={onClose}
    />);
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Thread reply" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reopen" }));
    expect(onResolve).toHaveBeenCalledWith(false);
  });

  it("exposes authoritative lifecycle, follow, notification, source, and private-member controls", async () => {
    const user = userEvent.setup();
    const callbacks = {
      onArchive: vi.fn(),
      onFollow: vi.fn(),
      onSetNotifications: vi.fn(),
      onAddMember: vi.fn(),
      onRemoveMember: vi.fn(),
      onOpenSource: vi.fn()
    };
    render(<ThreadPanel
      thread={{ id: "thread", scopeType: "channel", scopeId: "general", title: "Private", resolved: false, lifecycle: "open", visibility: "private", source: { kind: "channel", scopeId: "general", messageId: "message-1" }, privateMemberIds: ["mina"], followers: [], notificationPreferences: { mina: true }, createdAt: 1 } as never}
      comments={[]}
      memberNamesById={{ mina: "Mina", bob: "Bob" }}
      currentUserId="mina"
      onAddComment={vi.fn()}
      onResolve={vi.fn()}
      onClose={vi.fn()}
      {...callbacks}
    />);
    expect(screen.getByText("Source message: message-1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open source message" }));
    await user.click(screen.getByRole("button", { name: "Archive thread" }));
    await user.click(screen.getByRole("button", { name: "Follow" }));
    await user.click(screen.getByRole("button", { name: "Mute notifications" }));
    await user.click(screen.getByRole("button", { name: "Remove Mina" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Private member to add" }), "bob");
    await user.click(screen.getByRole("button", { name: "Add member" }));
    expect(callbacks.onOpenSource).toHaveBeenCalled();
    expect(callbacks.onArchive).toHaveBeenCalled();
    expect(callbacks.onFollow).toHaveBeenCalled();
    expect(callbacks.onSetNotifications).toHaveBeenCalledWith(false);
    expect(callbacks.onRemoveMember).toHaveBeenCalledWith("mina");
    expect(callbacks.onAddMember).toHaveBeenCalledWith("bob");
  });
});
