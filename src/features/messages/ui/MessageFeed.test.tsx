import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageFeed } from "@features/messages/ui/MessageFeed";
import type { Message } from "@entities/chat/model/types";
import { ChatUiStoreProvider } from "@entities/chat/model/chatUiStore";
import type { AttachmentRecord, AttachmentTransferState, EncryptedFileRecord } from "@shared/model/attachments";

const originalClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "clientHeight");
const originalScrollHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "scrollHeight");

function message(id: string, body = id): Message {
  return {
    id,
    channelId: "general",
    authorId: "mina",
    authorName: "Mina",
    body,
    createdAt: 1,
    deletedAt: null,
    pinnedAt: null,
    reactions: {}
  } as Message;
}

function renderFeed(messages: Message[], options: { feedKey?: string; mode?: "channel" | "dm"; channelKind?: string; title?: string; onSend?: (body: string) => void; canSendWithoutText?: boolean; attachmentTransfer?: AttachmentTransferState; forwardStatus?: { kind: "success" | "error"; message: string } } = {}) {
  return render(
    <ChatUiStoreProvider storageKeys={storageKeys()}>
      <MessageFeed
        title={options.title ?? "# general"}
        messages={messages}
        memberNamesById={{ mina: "Mina" }}
        mode={options.mode ?? "channel"}
        channelKind={options.channelKind}
        feedKey={options.feedKey ?? `${options.mode ?? "channel"}:general`}
        canSendWithoutText={options.canSendWithoutText}
        attachmentTransfer={options.attachmentTransfer}
        forwardStatus={options.forwardStatus}
        onSend={options.onSend ?? vi.fn()}
      />
    </ChatUiStoreProvider>
  );
}

function messageList() {
  return screen.getByRole("log", { name: "# general messages" });
}

function storageKeys() {
  const key = `message-feed-test:${crypto.randomUUID()}`;
  return {
    closedDirectThreads: `${key}:closedDirectThreads`,
    memberPreferences: `${key}:memberPreferences`,
    readAtByThread: `${key}:readAtByThread`,
    voicePreferences: `${key}:voicePreferences`,
    voiceReconnect: `${key}:voiceReconnect`
  };
}

function feedElement(messages: Message[]) {
  return (
    <ChatUiStoreProvider storageKeys={storageKeys()}>
      <MessageFeed
        title="# general"
        messages={messages}
        memberNamesById={{ mina: "Mina" }}
        mode="channel"
        feedKey="channel:general"
        onSend={vi.fn()}
      />
    </ChatUiStoreProvider>
  );
}

describe("MessageFeed scrolling", () => {
  it("keeps defensive history controls inert without a controller", () => {
    renderFeed([]);
    expect(screen.getByRole("group", { name: "Message history controls" })).not.toContainElement(screen.queryByRole("status"));
    expect(screen.getByRole("button", { name: "Load older messages" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "History options" })).toBeDisabled();
  });

  it("shows authoritative forwarding success and failure status", () => {
    const { rerender } = renderFeed([message("forwarded")], { forwardStatus: { kind: "error", message: "Forwarding was rejected by the authorized host." } });
    expect(screen.getByRole("alert")).toHaveTextContent("Forwarding was rejected by the authorized host.");
    rerender(
      <ChatUiStoreProvider storageKeys={storageKeys()}>
        <MessageFeed title="# general" messages={[message("forwarded")]} memberNamesById={{ mina: "Mina" }} mode="channel" forwardStatus={{ kind: "success", message: "Message forwarded with encrypted file provenance." }} onSend={vi.fn()} />
      </ChatUiStoreProvider>
    );
    expect(screen.getByText("Message forwarded with encrypted file provenance.")).toBeInTheDocument();
  });

  it("renders encrypted history states and jumps to a supplied cursor", async () => {
    const user = userEvent.setup();
    const history = {
      loading: true,
      error: "History unavailable",
      records: [{ id: "archived-1", body: "archived" }],
      loadOlder: vi.fn(),
      jumpToCursor: vi.fn()
    } as any;
    const { rerender } = render(
      <ChatUiStoreProvider storageKeys={storageKeys()}>
        <MessageFeed title="# general" messages={[]} memberNamesById={{}} mode="channel" history={history} onSend={vi.fn()} />
      </ChatUiStoreProvider>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("History unavailable");
    expect(screen.getByText("Loading encrypted history…")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Archived message records" })).toHaveTextContent("archived");
    await user.click(screen.getByRole("button", { name: "Load older messages" }));
    expect(history.loadOlder).not.toHaveBeenCalled();

    const readyHistory = { ...history, loading: false };
    rerender(
      <ChatUiStoreProvider storageKeys={storageKeys()}>
        <MessageFeed title="# general" messages={[]} memberNamesById={{}} mode="channel" history={readyHistory} onSend={vi.fn()} />
      </ChatUiStoreProvider>
    );
    await user.click(screen.getByRole("button", { name: "Load older messages" }));
    expect(history.loadOlder).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "History options" }));
    await user.click(screen.getByRole("button", { name: "Open position" }));
    expect(history.jumpToCursor).toHaveBeenCalledTimes(0);
    await user.type(screen.getByRole("textbox", { name: "History cursor" }), "cursor-1");
    await user.click(screen.getByRole("button", { name: "Open position" }));
    expect(history.jumpToCursor).toHaveBeenCalledWith("cursor-1");
  });

  beforeEach(() => {
    Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return this.classList.contains("msgs") ? 200 : 0;
      }
    });
    Object.defineProperty(window.HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.classList.contains("msgs") ? 1000 : 0;
      }
    });
  });

  afterEach(() => {
    if (originalClientHeight) {
      Object.defineProperty(window.HTMLElement.prototype, "clientHeight", originalClientHeight);
    } else {
      delete (window.HTMLElement.prototype as Partial<HTMLElement>).clientHeight;
    }
    if (originalScrollHeight) {
      Object.defineProperty(window.HTMLElement.prototype, "scrollHeight", originalScrollHeight);
    } else {
      delete (window.HTMLElement.prototype as Partial<HTMLElement>).scrollHeight;
    }
  });

  it("loads a feed at the bottom", () => {
    renderFeed([message("m1"), message("m2")]);

    expect(messageList().scrollTop).toBe(1000);
    expect(screen.queryByRole("button", { name: "New messages" })).not.toBeInTheDocument();
  });

  it("stays at the bottom when new messages arrive while already at the bottom", () => {
    const { rerender } = renderFeed([message("m1")]);
    const list = messageList();
    list.scrollTop = 1000;
    fireEvent.scroll(list);

    rerender(
      feedElement([message("m1"), message("m2")])
    );

    expect(list.scrollTop).toBe(1000);
    expect(screen.queryByRole("button", { name: "New messages" })).not.toBeInTheDocument();
  });

  it("shows a new messages button when new messages arrive away from the bottom", async () => {
    const user = userEvent.setup();
    const { rerender } = renderFeed([message("m1")]);
    const list = messageList();
    list.scrollTop = 100;
    fireEvent.scroll(list);

    rerender(
      feedElement([message("m1"), message("m2")])
    );

    await user.click(screen.getByRole("button", { name: "New messages" }));

    expect(list.scrollTop).toBe(1000);
    expect(screen.queryByRole("button", { name: "New messages" })).not.toBeInTheDocument();
  });

  it("scrolls to the bottom when submitting a message", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderFeed([message("m1")], { onSend });
    const list = messageList();
    list.scrollTop = 100;
    fireEvent.scroll(list);

    await user.type(screen.getByRole("textbox", { name: "Message # general" }), "hello");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSend).toHaveBeenCalledWith("hello");
    expect(list.scrollTop).toBe(1000);
  });

  it("allows a channel attachment-only send when a completed attachment is pending", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderFeed([], { onSend, canSendWithoutText: true });

    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeEnabled();
    await user.click(send);

    expect(onSend).toHaveBeenCalledWith("");
  });

  it("treats an attachment-only record as a message instead of showing the welcome state", () => {
    const attachmentMessage = { ...message("file-message", ""), attachmentIds: ["file-1"] } as Message;
    render(
      <ChatUiStoreProvider storageKeys={storageKeys()}>
        <MessageFeed
          title="# general"
          messages={[attachmentMessage]}
          memberNamesById={{ mina: "Mina" }}
          mode="channel"
          onSend={vi.fn()}
          fileRecords={[{ fileId: "file-1", title: "notes.txt", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 1, chunkCount: 1, relays: [] }]}
        />
      </ChatUiStoreProvider>
    );

    expect(screen.getByText("notes.txt")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to # general")).not.toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("keeps an empty channel send disabled without a completed attachment", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderFeed([], { onSend });

    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeDisabled();
    await user.click(send);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("allows an attachment-only DM send after the thread is committed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderFeed([], { mode: "dm", title: "Direct message", onSend, canSendWithoutText: true });

    const send = screen.getByRole("button", { name: "Send DM" });
    expect(send).toBeEnabled();
    await user.click(send);

    expect(onSend).toHaveBeenCalledWith("");
  });

  it("allows an attachment-only reply when a completed attachment is pending", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(
      <ChatUiStoreProvider storageKeys={storageKeys()}>
        <MessageFeed
          title="# general"
          messages={[message("m1", "source")]}
          memberNamesById={{ mina: "Mina" }}
          mode="channel"
          canSendWithoutText
          onSend={vi.fn()}
          onReply={onReply}
        />
      </ChatUiStoreProvider>
    );

    const row = screen.getByText("source").closest("article")!;
    fireEvent.mouseEnter(row);
    await user.click(screen.getByRole("button", { name: "Reply to message from Mina" }));
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onReply).toHaveBeenCalledWith("m1", "");
  });

  it("keeps an empty send disabled while an attachment transfer is in progress", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderFeed([], {
      onSend,
      canSendWithoutText: true,
      attachmentTransfer: { phase: "uploading", name: "pending.txt", progress: 0.4 }
    });

    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeDisabled();
    await user.click(send);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("renders message-linked attachments, handles replies, and opens a comment thread", async () => {
    const user = userEvent.setup();
    const onOpenAttachment = vi.fn();
    const onReply = vi.fn();
    const onCreateThread = vi.fn(() => "thread-1");
    const onAddThreadComment = vi.fn();
    const onResolveThread = vi.fn();
    const linked = { ...message("m1", "source"), attachmentIds: ["linked-1"] } as Message;
    const driveAttachment = { id: "linked-1", title: "Linked.pdf", provider: "googleDrive" } as AttachmentRecord;
    const unlinkedAttachment = { id: "unlinked-1", title: "Unlinked.pdf", provider: "googleDrive" } as AttachmentRecord;
    const file = { fileId: "unlinked-file", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 1, chunkCount: 1, relays: [] } as EncryptedFileRecord;

    const view = render(
      <ChatUiStoreProvider storageKeys={storageKeys()}>
        <MessageFeed
          title="# general"
          messages={[linked]}
          memberNamesById={{ mina: "Mina" }}
          mode="channel"
          feedKey="channel:attachments"
          onSend={vi.fn()}
          onReply={onReply}
          onCreateThread={onCreateThread}
          commentThreads={[{ id: "thread-1", title: "Follow-up", resolved: false } as never]}
          comments={[]}
          onAddThreadComment={onAddThreadComment}
          onResolveThread={onResolveThread}
          attachmentRecords={[driveAttachment, unlinkedAttachment]}
          fileRecords={[file]}
          onOpenAttachment={onOpenAttachment}
        />
      </ChatUiStoreProvider>
    );

    expect(screen.queryByText("Unlinked.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("Linked.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Linked.pdf/ }));
    expect(onOpenAttachment).not.toHaveBeenCalledWith(unlinkedAttachment);
    expect(onOpenAttachment).toHaveBeenCalledWith(driveAttachment);

    const row = screen.getByText("source").closest("article")!;
    fireEvent.mouseEnter(row);
    fireEvent.click(screen.getByRole("button", { name: "Reply to message from Mina" }));
    expect(screen.getByText("Replying to Mina")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Message # general" }), "thread reply");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onReply).toHaveBeenCalledWith("m1", "thread reply");

    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Create Thread/ }));
    expect(screen.getByRole("complementary", { name: "Follow-up discussion" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Thread reply" }), "comment");
    await user.click(screen.getByRole("button", { name: "Send", exact: true }));
    expect(onAddThreadComment).toHaveBeenCalledWith("thread-1", "comment");
    await user.click(screen.getByRole("button", { name: "Resolve" }));
    expect(onResolveThread).toHaveBeenCalledWith("thread-1", true);
    await user.click(screen.getByRole("button", { name: "Close thread" }));
    expect(screen.queryByRole("complementary", { name: "Follow-up discussion" })).not.toBeInTheDocument();
    view.unmount();
  });

  it("lists projected channel threads and opens the selected thread", async () => {
    const user = userEvent.setup();
    render(
      <ChatUiStoreProvider storageKeys={storageKeys()}>
        <MessageFeed
          title="# general"
          messages={[message("m1", "source")]}
          memberNamesById={{ mina: "Mina" }}
          mode="channel"
          commentThreads={[
            { id: "thread-1", title: "Follow-up", resolved: false } as never,
            { id: "thread-2", title: "Resolved item", resolved: true } as never
          ]}
          comments={[{ id: "comment-1", threadId: "thread-1", body: "reply", deletedAt: null } as never]}
          onSend={vi.fn()}
        />
      </ChatUiStoreProvider>
    );

    expect(screen.getByRole("region", { name: "Channel threads" })).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Open thread Follow-up" })).toHaveTextContent("1 reply");
    await user.click(screen.getByRole("button", { name: "Open thread Follow-up" }));
    expect(screen.getByRole("complementary", { name: "Follow-up discussion" })).toBeInTheDocument();
  });

  it("filters forum posts from authoritative channel messages", async () => {
    const user = userEvent.setup();
    renderFeed([message("release", "Release notes"), message("question", "Question about launch")], { channelKind: "forum" });

    expect(screen.getByRole("region", { name: "Forum posts" })).toHaveTextContent("2 posts");
    await user.type(screen.getByRole("textbox", { name: "Filter forum posts" }), "release");
    expect(screen.getByText("Release notes")).toBeInTheDocument();
    expect(screen.queryByText("Question about launch")).not.toBeInTheDocument();
  });

  it("opens a thread after the public create operation resolves asynchronously", async () => {
    const user = userEvent.setup();
    const onCreateThread = vi.fn().mockResolvedValue("thread-async");
    render(
      <ChatUiStoreProvider storageKeys={storageKeys()}>
        <MessageFeed
          title="# general"
          messages={[message("m1", "source")]}
          memberNamesById={{ mina: "Mina" }}
          mode="channel"
          feedKey="channel:async-thread"
          onSend={vi.fn()}
          onCreateThread={onCreateThread}
          commentThreads={[{ id: "thread-async", title: "Async thread", resolved: false } as never]}
          comments={[]}
        />
      </ChatUiStoreProvider>
    );
    fireEvent.mouseEnter(screen.getByText("source").closest("article")!);
    fireEvent.click(screen.getByRole("button", { name: "More actions for message from Mina" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Create Thread/ }));
    expect(await screen.findByRole("complementary", { name: "Async thread discussion" })).toBeInTheDocument();
    expect(onCreateThread).toHaveBeenCalledWith(expect.objectContaining({ id: "m1" }));
    await user.click(screen.getByRole("button", { name: "Close thread" }));
  });
});
