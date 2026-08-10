import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Message } from "@entities/chat/model/types";
import { MessageRow } from "@features/messages/ui/MessageRow";

function message(): Message {
  return {
    id: "message-1",
    channelId: "general",
    authorId: "mina",
    authorName: "Mina",
    body: "Encrypted message",
    createdAt: 1,
    deletedAt: null,
    pinnedAt: null,
    reactions: {}
  } as Message;
}

describe("MessageRow personal-state actions", () => {
  it("shows a bot badge only from the authoritative member kind", () => {
    const current = message();
    const { rerender } = render(<MessageRow
      forwardTargets={[]}
      instanceKey={current.id}
      memberAvatarsById={{}}
      memberNamesById={{ mina: "Mina" }}
      memberKindsById={{}}
      message={current}
      messagesById={new Map([[current.id, current]])}
      onRememberReaction={vi.fn()}
      pinnedCopy={false}
      recentReactions={[]}
    />);
    expect(screen.queryByText("BOT")).not.toBeInTheDocument();
    rerender(<MessageRow
      forwardTargets={[]}
      instanceKey={current.id}
      memberAvatarsById={{}}
      memberNamesById={{ mina: "Mina" }}
      memberKindsById={{ mina: "bot" }}
      message={current}
      messagesById={new Map([[current.id, current]])}
      onRememberReaction={vi.fn()}
      pinnedCopy={false}
      recentReactions={[]}
    />);
    expect(screen.getByText("BOT")).toBeInTheDocument();
  });

  it("marks authoritative bots in rendered mentions", () => {
    const current = { ...message(), body: "Ask @[helper] about it" };
    render(<MessageRow
      forwardTargets={[]}
      instanceKey={current.id}
      memberAvatarsById={{}}
      memberNamesById={{ mina: "Mina", helper: "Helper" }}
      memberKindsById={{ helper: "bot" }}
      message={current}
      messagesById={new Map([[current.id, current]])}
      onRememberReaction={vi.fn()}
      pinnedCopy={false}
      recentReactions={[]}
    />);
    expect(screen.getByText("@Helper")).toContainElement(screen.getByLabelText("Bot account"));
  });

  it("does not offer forwarding until an optimistic channel message is authoritative", () => {
    const current = { ...message(), id: "message_ui_1786232172582_2" } as Message;
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[{ id: "channel-random", label: "#random", type: "channel", channelId: "random" }]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onForward={vi.fn()}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    expect(screen.queryByRole("button", { name: "Forward message from Mina" })).not.toBeInTheDocument();
  });

  it("reveals hidden actions when keyboard focus reaches an action button", () => {
    const current = message();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onReact={vi.fn()}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={["😀"]}
      />
    );
    const action = screen.getByRole("button", { name: "React with 😀" });
    const actions = container.querySelector(".msg-actions")!;
    expect(actions).toHaveStyle({ opacity: "0" });
    act(() => { fireEvent.focus(action); });
    expect(actions).toHaveStyle({ opacity: "1" });
  });

  it("renders only scope-matched typed custom-media references", () => {
    const current = { ...message(), customMediaRefs: [{ mediaId: "voice-1", scopeType: "channel", scopeId: "general", mediaType: "voice" as const }] };
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        customMediaRecords={[{ id: "voice-1", name: "Voice", mediaType: "voice", render: { mode: "audio", durationMs: 1000 }, playback: { kind: "files-v2", id: "file-voice" } }]}
        customMediaScope={{ scopeType: "channel", scopeId: "general" }}
        fileRecords={[{ fileId: "file-voice", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 1, chunkCount: 1, relays: [] }]}
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onRememberReaction={vi.fn()}
        onDownloadFile={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );
    expect(screen.getByText("Voice message")).toBeInTheDocument();
    expect(container.querySelector("[data-playback-kind='files-v2'][data-playback-id='file-voice']")).toBeInTheDocument();
  });

  it("opens a Drive-backed reference and hides missing backing assets", async () => {
    const current = { ...message(), customMediaRefs: [
      { mediaId: "sticker-1", scopeType: "channel", scopeId: "general", mediaType: "sticker" as const },
      { mediaId: "missing", scopeType: "channel", scopeId: "general", mediaType: "gif" as const }
    ] };
    const onOpenAttachment = vi.fn();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        customMediaRecords={[
          { id: "sticker-1", name: "Sticker", mediaType: "sticker", render: { mode: "image" }, playback: { kind: "drive-asset", id: "asset-1" } },
          { id: "missing", name: "Missing", mediaType: "gif", render: { mode: "video" }, playback: { kind: "drive-asset", id: "asset-missing" } }
        ]}
        customMediaScope={{ scopeType: "channel", scopeId: "general" }}
        attachmentRecords={[{ id: "attachment-1", assetId: "asset-1", scopeType: "channel", scopeId: "general" }]}
        onOpenAttachment={onOpenAttachment}
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Open Sticker" }));
    expect(onOpenAttachment).toHaveBeenCalledWith(expect.objectContaining({ assetId: "asset-1" }));
    expect(container).not.toHaveTextContent("Missing");
  });

  it("keeps Mark Unread disabled until Matterhorn exposes a room personal-state controller", async () => {
    const user = userEvent.setup();
    const current = message();

    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));

    expect(screen.getByRole("menuitem", { name: /Mark Unread/ })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Bookmark Message" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Set Reminder" })).toBeDisabled();
  });

  it("enables bookmark and reminder actions from authoritative personal records", async () => {
    const user = userEvent.setup();
    const current = message();
    const onAddBookmark = vi.fn();
    const onAddReminder = vi.fn();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onAddBookmark={onAddBookmark}
        onAddReminder={onAddReminder}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    await user.click(screen.getByRole("menuitem", { name: "Bookmark Message" }));
    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    await user.click(screen.getByRole("menuitem", { name: "Set Reminder" }));
    expect(onAddBookmark).toHaveBeenCalledWith(current);
    expect(onAddReminder).toHaveBeenCalledWith(current);
  });

  it("removes existing bookmark and reminder records by their authoritative ids", async () => {
    const user = userEvent.setup();
    const current = message();
    const onRemoveBookmark = vi.fn();
    const onRemoveReminder = vi.fn();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        bookmarks={[{ id: "bookmark-1", messageId: current.id } as never]}
        reminders={[{ id: "reminder-1", messageId: current.id } as never]}
        onRemoveBookmark={onRemoveBookmark}
        onRemoveReminder={onRemoveReminder}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove Bookmark" }));
    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove Reminder" }));
    expect(onRemoveBookmark).toHaveBeenCalledWith("bookmark-1");
    expect(onRemoveReminder).toHaveBeenCalledWith("reminder-1");
  });

  it("supports the fixed context menu and thread creation action", async () => {
    const user = userEvent.setup();
    const current = message();
    const onCreateThread = vi.fn().mockReturnValue("thread-1");
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onCreateThread={onCreateThread}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.contextMenu(container.querySelector("article")!, { clientX: 120, clientY: 160 });
    expect(container.querySelector(".message-more-menu.fixed")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: /Create Thread/ }));
    expect(onCreateThread).toHaveBeenCalledWith(current);
  });

  it("opens and submits an authorized edit from the message menu", async () => {
    const user = userEvent.setup();
    const current = message();
    const onEdit = vi.fn();
    const { container } = render(
      <MessageRow
        canEditMessage={() => true}
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onEdit={onEdit}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    const input = screen.getByRole("textbox", { name: "Edit message from Mina" });
    await user.clear(input);
    await user.type(input, "Updated message");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEdit).toHaveBeenCalledWith(current.id, "Updated message");
  });

  it("renders linked encrypted and Drive attachments with their asset actions", async () => {
    const user = userEvent.setup();
    const current = { ...message(), attachmentIds: ["encrypted-1", "drive-1"], threadId: "direct-thread-1" } as Message;
    const onDownloadFile = vi.fn();
    const onOpenAttachment = vi.fn();
    const file = {
      fileId: "encrypted-1",
      scopeType: "channel",
      scopeId: "general",
      encryptedManifest: {},
      ciphertextBytes: 12,
      chunkCount: 1,
      relays: []
    };
    const attachment = { id: "drive-1", title: "Roadmap.pdf", provider: "googleDrive" };

    render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onDownloadFile={onDownloadFile}
        onOpenAttachment={onOpenAttachment}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
        fileRecords={[file]}
        attachmentRecords={[attachment]}
      />
    );

    expect(screen.getByRole("complementary", { name: "Shared files" })).toBeInTheDocument();
    expect(screen.getByText("Roadmap.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Download" }));
    await user.click(screen.getByRole("button", { name: /Roadmap.pdf/ }));
    expect(onDownloadFile).toHaveBeenCalledWith(file);
    expect(onOpenAttachment).toHaveBeenCalledWith(attachment);
  });

  it("does not reload an unchanged attachment preview during reaction and room-state renders", async () => {
    const current = { ...message(), attachmentIds: ["encrypted-1"] } as Message;
    const file = { fileId: "encrypted-1", revision: 1, title: "photo.webp", mimeType: "image/webp", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 12, chunkCount: 1, relays: [] };
    const onPreviewFile = vi.fn(async () => new Blob(["image"], { type: "image/webp" }));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:reaction-preview");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const props = {
      currentUserId: "alice",
      forwardTargets: [],
      instanceKey: current.id,
      memberAvatarsById: {},
      memberNamesById: { mina: "Mina" },
      messagesById: new Map([[current.id, current]]),
      onPreviewFile,
      onReact: vi.fn(),
      onRememberReaction: vi.fn(),
      pinnedCopy: false,
      recentReactions: ["🔥"]
    };
    const { container, rerender } = render(<MessageRow {...props} message={current} fileRecords={[file]} />);
    expect(await screen.findByRole("img", { name: "Preview of photo.webp" })).toHaveAttribute("src", "blob:reaction-preview");

    fireEvent.mouseEnter(container.querySelector("article")!);
    fireEvent.click(screen.getByRole("button", { name: "React with 🔥" }));
    fireEvent.click(screen.getByRole("button", { name: "🔥 1" }));
    fireEvent.click(screen.getByRole("button", { name: "React with 🔥" }));
    const unrelatedUpdate = { ...current, body: "Unrelated room-state projection" } as Message;
    rerender(<MessageRow {...props} message={unrelatedUpdate} messagesById={new Map([[current.id, unrelatedUpdate]])} fileRecords={[{ ...file }]} />);

    expect(onPreviewFile).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).not.toHaveBeenCalled();
  });

  it("keeps an optimistic reaction visible until authoritative state contains it", async () => {
    const current = message();
    const onReact = vi.fn();
    const props = {
      currentUserId: "alice",
      forwardTargets: [],
      instanceKey: current.id,
      memberAvatarsById: {},
      memberNamesById: { mina: "Mina" },
      onReact,
      onRememberReaction: vi.fn(),
      pinnedCopy: false,
      recentReactions: ["🔥"]
    };
    const { container, rerender } = render(<MessageRow {...props} message={current} messagesById={new Map([[current.id, current]])} />);
    fireEvent.mouseEnter(container.querySelector("article")!);
    fireEvent.click(screen.getByRole("button", { name: "React with 🔥" }));
    expect(screen.getByRole("button", { name: "🔥 1" })).toBeInTheDocument();

    const unrelatedUpdate = { ...current, body: "Unrelated room-state projection", reactions: {} } as Message;
    rerender(<MessageRow {...props} message={unrelatedUpdate} messagesById={new Map([[current.id, unrelatedUpdate]])} />);
    expect(screen.getByRole("button", { name: "🔥 1" })).toBeInTheDocument();

    const authoritative = { ...unrelatedUpdate, reactions: { "🔥": ["alice"] } } as Message;
    rerender(<MessageRow {...props} message={authoritative} messagesById={new Map([[current.id, authoritative]])} />);
    expect(screen.getByRole("button", { name: "🔥 1" })).toBeInTheDocument();
    expect(onReact).toHaveBeenCalledTimes(1);
  });

  it("offers channel and DM targets and preserves the authoritative callback", async () => {
    const user = userEvent.setup();
    const current = { ...message(), threadId: "direct-thread-1" } as Message;
    const onForward = vi.fn();
    const dmTarget = { id: "dm-bob", label: "Bob", type: "dm" as const };
    const channelTarget = { id: "channel-random", label: "#random", type: "channel" as const };

    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[dmTarget, channelTarget]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onForward={onForward}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "Forward message from Mina" }));
    expect(screen.getByRole("button", { name: "Forward to Bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forward to #random" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Forward to #random" }));
    expect(onForward).toHaveBeenCalledWith(current, channelTarget);
    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "Forward message from Mina" }));
    await user.click(screen.getByRole("button", { name: "Forward to Bob" }));
    expect(onForward).toHaveBeenCalledWith(current, dmTarget);
  });

  it("renders immutable forwarding provenance", () => {
    const current = { ...message(), forwardedFrom: { kind: "channel" as const, scopeId: "source", messageId: "source-message" } };
    render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );
    const provenance = screen.getByText("Forwarded from # source");
    expect(provenance).toBeInTheDocument();
    expect(provenance).toHaveAttribute("data-forwarded-kind", "channel");
    expect(provenance).toHaveAttribute("data-forwarded-scope-id", "source");
    expect(provenance).toHaveAttribute("data-forwarded-message-id", "source-message");
  });

  it("renders direct provenance and clears an active unread marker", async () => {
    const user = userEvent.setup();
    const current = { ...message(), authorId: undefined, forwardedFrom: { kind: "direct.thread" as const, scopeId: "direct_7f", messageId: "source-message" } } as Message;
    const onClearUnread = vi.fn();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{}}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onClearUnread={onClearUnread}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
        unreadMarkerMessageId={current.id}
      />
    );
    expect(screen.getByText("Forwarded from a direct message")).toBeInTheDocument();
    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: /More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: /Clear Unread/ }));
    expect(onClearUnread).toHaveBeenCalled();
  });

  it("offers authoritative channel forwarding for channel messages", async () => {
    const user = userEvent.setup();
    const current = message();
    const onForward = vi.fn();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[{ id: "dm-bob", label: "Bob", type: "dm" }, { id: "channel-random", label: "#random", type: "channel" }]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onForward={onForward}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "Forward message from Mina" }));
    expect(screen.getByRole("button", { name: "Forward to #random" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Forward to #random" }));
    expect(onForward).toHaveBeenCalledWith(current, expect.objectContaining({ type: "channel" }));
  });

  it("enforces author and participant lifecycle predicates in the message menu", async () => {
    const user = userEvent.setup();
    const current = { ...message(), threadId: "direct-thread-1", userIds: ["alice", "bob"] } as Message;
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onPin = vi.fn();
    const onReply = vi.fn();
    const onReact = vi.fn();
    const { container } = render(
      <MessageRow
        canDeleteMessage={(item) => item.userIds?.includes("alice") === true}
        canEditMessage={(item) => item.authorId === "mina"}
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onDelete={onDelete}
        onEdit={onEdit}
        onPin={onPin}
        onReact={onReact}
        onRememberReaction={vi.fn()}
        onReply={onReply}
        pinnedCopy={false}
        recentReactions={["😀"]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "React with 😀" }));
    expect(onReact).toHaveBeenCalledWith(current.id, "😀");
    fireEvent.click(screen.getByRole("button", { name: "Reply to message from Mina" }));
    expect(onReply).toHaveBeenCalledWith(current);

    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Delete Message" })).toBeEnabled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    const editor = screen.getByRole("textbox", { name: "Edit message from Mina" });
    await user.clear(editor);
    await user.type(editor, "updated");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEdit).toHaveBeenCalledWith(current.id, "updated");

    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin Message" }));
    expect(onPin).toHaveBeenCalledWith(current.id);
    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Message" }));
    expect(onDelete).toHaveBeenCalledWith(current.id);
  });

  it("shows missing and deleted reply previews without crashing", () => {
    const missing = { ...message(), id: "missing-reply", replyToId: "not-loaded" } as Message;
    const deletedReply = { ...message(), id: "deleted-reply", deletedAt: 2 } as Message;
    render(
      <>
        <MessageRow currentUserId="alice" forwardTargets={[]} instanceKey={missing.id} memberAvatarsById={{}} memberNamesById={{ mina: "Mina" }} message={missing} messagesById={new Map([[missing.id, missing]])} onRememberReaction={vi.fn()} pinnedCopy={false} recentReactions={[]} />
        <MessageRow currentUserId="alice" forwardTargets={[]} instanceKey={deletedReply.id} memberAvatarsById={{}} memberNamesById={{ mina: "Mina" }} message={deletedReply} messagesById={new Map([[deletedReply.id, deletedReply]])} onRememberReaction={vi.fn()} pinnedCopy={false} recentReactions={[]} />
      </>
    );
    expect(screen.getByText("Original message unavailable")).toBeInTheDocument();
    expect(screen.getByText("Message deleted")).toBeInTheDocument();
  });

  it("follows a loaded reply and exposes the unpin action", async () => {
    const user = userEvent.setup();
    const original = { ...message(), id: "original", body: "Earlier message" };
    const current = { ...message(), replyToId: "original", pinnedAt: 2 } as Message;
    const onUnpin = vi.fn();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current], [original.id, original]])}
        onRememberReaction={vi.fn()}
        onUnpin={onUnpin}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    await user.click(screen.getByRole("link", { name: /Replying to Mina/ }));
    expect(window.location.hash).toContain("original");
    fireEvent.mouseEnter(container.querySelector("article")!);
    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Unpin Message" }));
    expect(onUnpin).toHaveBeenCalledWith(current.id);
  });

  it("opens the reaction picker and records a selected reaction", async () => {
    const user = userEvent.setup();
    const current = message();
    const onReact = vi.fn();
    const onRememberReaction = vi.fn();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onReact={onReact}
        onRememberReaction={onRememberReaction}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );

    fireEvent.mouseEnter(container.querySelector("article")!);
    await user.click(screen.getByRole("button", { name: "Choose reaction for message from Mina" }));
    await user.click(screen.getByRole("button", { name: "grinning face" }));
    expect(onRememberReaction).toHaveBeenCalledWith("😀");
    expect(onReact).toHaveBeenCalledWith(current.id, "😀");
  });

  it("supports context-menu positioning and closes through the shroud", () => {
    const current = message();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );
    fireEvent.contextMenu(container.querySelector("article")!, { clientX: 100, clientY: 100 });
    expect(screen.getByRole("menu")).toHaveClass("fixed");
    fireEvent.mouseDown(screen.getByRole("presentation"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("copies message text and its permalink through the menu actions", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const current = message();
    const { container } = render(
      <MessageRow
        currentUserId="alice"
        forwardTargets={[]}
        instanceKey={current.id}
        memberAvatarsById={{}}
        memberNamesById={{ mina: "Mina" }}
        message={current}
        messagesById={new Map([[current.id, current]])}
        onRememberReaction={vi.fn()}
        pinnedCopy={false}
        recentReactions={[]}
      />
    );
    fireEvent.mouseEnter(container.querySelector("article")!);
    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Copy Text/ }));
    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Copy Message Link/ }));
    expect(writeText).toHaveBeenCalledTimes(2);
  });
});
