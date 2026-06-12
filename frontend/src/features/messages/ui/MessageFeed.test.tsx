import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageFeed } from "@features/messages/ui/MessageFeed";
import type { Message } from "@entities/chat/model/types";
import { ChatUiStoreProvider } from "@entities/chat/model/chatUiStore";

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

function renderFeed(messages: Message[], options: { feedKey?: string; onSend?: (body: string) => void } = {}) {
  return render(
    <ChatUiStoreProvider storageKeys={storageKeys()}>
      <MessageFeed
        title="# general"
        messages={messages}
        memberNamesById={{ mina: "Mina" }}
        mode="channel"
        feedKey={options.feedKey ?? "channel:general"}
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
  beforeEach(() => {
    Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return this.classList.contains("message-list") ? 200 : 0;
      }
    });
    Object.defineProperty(window.HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.classList.contains("message-list") ? 1000 : 0;
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
});
