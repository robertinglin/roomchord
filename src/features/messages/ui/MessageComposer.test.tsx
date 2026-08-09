import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageComposer } from "@features/messages/ui/MessageComposer";

// jsdom has no native editing selection. Keep the browser command contract
// exercised here so tests cover composer behavior rather than an environment
// limitation.
Object.defineProperty(document, "execCommand", {
  configurable: true,
  value(command: string, _showUi?: boolean, value?: string) {
    const editor = (document.activeElement?.getAttribute("contenteditable") === "true"
      ? document.activeElement
      : document.querySelector('[contenteditable="true"]')) as HTMLElement | null;
    if (!editor) return false;
    const selection = window.getSelection();
    const range = document.createRange();
    if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      range.setStart(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset);
      range.setEnd(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
    } else {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    range.deleteContents();
    if (command === "insertText") {
      const node = document.createTextNode(value || "");
      range.insertNode(node);
      range.setStartAfter(node);
    } else if (command === "insertHTML") {
      const template = document.createElement("template");
      template.innerHTML = value || "";
      for (const node of Array.from(template.content.childNodes)) {
        range.insertNode(node);
        range.setStartAfter(node);
      }
    } else if (command === "insertLineBreak") {
      const node = document.createElement("br");
      range.insertNode(node);
      range.setStartAfter(node);
    } else {
      return false;
    }
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    return true;
  }
});

function renderComposer(mode: "channel" | "dm", canSendWithoutText: boolean, onSend = vi.fn()) {
  render(
    <MessageComposer
      canSendWithoutText={canSendWithoutText}
      memberNamesById={{}}
      mode={mode}
      onCancelReply={vi.fn()}
      onSend={onSend}
      title={mode === "dm" ? "Direct message" : "# general"}
    />
  );
  return onSend;
}

describe("MessageComposer attachment-only send gates", () => {
  it("allows a channel-only send when a completed attachment is pending", async () => {
    const user = userEvent.setup();
    const onSend = renderComposer("channel", true);

    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeEnabled();
    await user.click(send);
    expect(onSend).toHaveBeenCalledWith("");
  });

  it("allows attachment-only DMs once Matterhorn has committed the thread", async () => {
    const user = userEvent.setup();
    const onSend = renderComposer("dm", true);

    const send = screen.getByRole("button", { name: "Send DM" });
    expect(send).toBeEnabled();
    await user.click(send);
    expect(onSend).toHaveBeenCalledWith("");
  });

  it("sends typed custom-media references without a text token", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(
      <MessageComposer
        memberNamesById={{}}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={onSend}
        customMediaRefs={[{ mediaId: "media-1", scopeType: "channel", scopeId: "general", mediaType: "emoji" }]}
        title="# general"
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("1 custom media item attached");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith("", [{ mediaId: "media-1", scopeType: "channel", scopeId: "general", mediaType: "emoji" }]);
  });

  it("uses plural custom-media status and suppresses the unavailable note when supplied", () => {
    render(
      <MessageComposer
        memberNamesById={{}}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={vi.fn()}
        customMedia={<span>custom media controls</span>}
        customMediaRefs={[
          { mediaId: "media-1", scopeType: "channel", scopeId: "general", mediaType: "emoji" },
          { mediaId: "media-2", scopeType: "channel", scopeId: "general", mediaType: "sticker" }
        ]}
        title="# general"
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("2 custom media items attached");
    expect(screen.getByText("custom media controls")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("shows an explicit custom-media boundary without emulating message linkage", () => {
    renderComposer("channel", false);
    expect(screen.getByRole("note")).toHaveTextContent("Custom media is unavailable");
  });

  it("serializes typed text and submits with Enter", async () => {
    const user = userEvent.setup();
    const onSend = renderComposer("channel", false);
    const editor = screen.getByRole("textbox", { name: "Message # general" });

    await user.type(editor, "hello Matterhorn");
    expect(screen.getByText("16 / 2000")).toBeInTheDocument();
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("hello Matterhorn");
    expect(editor).toHaveTextContent("");
  });

  it("does not submit an empty editor when empty sends are not authorized", () => {
    const onSend = vi.fn();
    renderComposer("channel", false, onSend);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Message # general" }), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("preserves pasted text and supports a reply cancellation", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const reply = { id: "reply-1", authorId: "mina", authorName: "Mina", body: "Original", createdAt: 1, deletedAt: null, pinnedAt: null, reactions: {} } as never;
    render(
      <MessageComposer
        memberNamesById={{ mina: "Mina" }}
        mode="channel"
        onCancelReply={onSend}
        onSend={onSend}
        replyTo={reply}
        title="# general"
      />
    );
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    await user.click(editor);
    fireEvent.paste(editor, { clipboardData: { getData: () => "pasted text" } });
    expect(editor).toHaveTextContent("pasted text");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSend).not.toHaveBeenCalledWith("pasted text");
  });

  it("inserts pending composer text and encodes a selected mention", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const { rerender } = render(
      <MessageComposer memberNamesById={{ bob: "Bob" }} mode="channel" onCancelReply={vi.fn()} onSend={onSend} pendingText={{ id: "draft-1", text: "draft" }} title="# general" />
    );
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    expect(editor).toHaveTextContent("draft");
    await user.click(editor);
    await user.type(editor, " @Bo");
    expect(screen.getByRole("listbox", { name: "Mention suggestions" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Bob" }));
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith("draft @[bob]");

    rerender(<MessageComposer memberNamesById={{ bob: "Bob" }} mode="channel" onCancelReply={vi.fn()} onSend={onSend} title="# general" />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("handles disabled controls and the link insertion action", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const { rerender } = render(
      <MessageComposer disabled memberNamesById={{}} mode="channel" onCancelReply={vi.fn()} onSend={onSend} title="# general" />
    );
    expect(screen.getByRole("textbox", { name: "Message # general" })).toHaveAttribute("contenteditable", "false");
    expect(screen.getByRole("button", { name: "Insert link" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add emoji" })).toBeDisabled();

    rerender(<MessageComposer memberNamesById={{}} mode="channel" onCancelReply={vi.fn()} onSend={onSend} title="# general" />);
    await user.click(screen.getByRole("textbox", { name: "Message # general" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert link" }));
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith("[link](https://)");
  });

  it("inserts a link when the browser has no active selection", async () => {
    const user = userEvent.setup();
    const onSend = renderComposer("channel", false);
    const getSelection = vi.spyOn(window, "getSelection").mockReturnValue(null);

    await user.click(screen.getByRole("button", { name: "Insert link" }));
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSend).toHaveBeenCalledWith("[link](https://)");
    getSelection.mockRestore();
  });

  it("ignores keyboard submission while disabled", () => {
    const onSend = vi.fn();
    render(
      <MessageComposer
        disabled
        canSendWithoutText
        memberNamesById={{}}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={onSend}
        title="# general"
      />
    );

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Message # general" }), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("preserves selected link text and moves the caret through the native selection", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderComposer("channel", false, onSend);
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    await user.type(editor, "docs");
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const selectionWithModify = selection as (Selection & { modify?: () => void }) | null;
    if (selectionWithModify) {
      selectionWithModify.toString = () => "docs";
      selectionWithModify.modify = vi.fn();
    }
    const execCommand = vi.spyOn(document, "execCommand").mockImplementation(() => true);
    fireEvent.click(screen.getByRole("button", { name: "Insert link" }));
    expect(execCommand).toHaveBeenCalledWith("insertText", false, "[docs](https://)");
    expect(selectionWithModify?.modify).toHaveBeenCalled();
    execCommand.mockRestore();
  });

  it("supports mention keyboard navigation and dismissal", async () => {
    const user = userEvent.setup();
    render(
      <MessageComposer
        memberNamesById={{ bob: "Bob", bella: "Bella" }}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={vi.fn()}
        title="# general"
      />
    );
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    await user.click(editor);
    await user.type(editor, "@B");
    expect(screen.getByRole("listbox", { name: "Mention suggestions" })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Bella" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: "Bob" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "Mention suggestions" })).not.toBeInTheDocument();
  });

  it("keeps mention suggestions closed for invalid caret selections", () => {
    render(
      <MessageComposer
        memberNamesById={{ bob: "Bob" }}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={vi.fn()}
        title="# general"
      />
    );
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    editor.focus();
    const outsideText = document.createTextNode("@Bo");
    document.body.appendChild(outsideText);
    const editorText = document.createTextNode("plain text");
    editor.appendChild(editorText);
    let selection = { rangeCount: 0, isCollapsed: true } as Selection;
    const getSelection = vi.spyOn(window, "getSelection").mockImplementation(() => selection);
    const notifySelection = () => fireEvent(document, new Event("selectionchange"));

    notifySelection();
    selection = { rangeCount: 1, isCollapsed: false } as Selection;
    notifySelection();
    selection = {
      rangeCount: 1,
      isCollapsed: true,
      getRangeAt: () => ({ startContainer: outsideText, startOffset: 3 })
    } as unknown as Selection;
    notifySelection();
    selection = {
      rangeCount: 1,
      isCollapsed: true,
      getRangeAt: () => ({ startContainer: editor, startOffset: 0 })
    } as unknown as Selection;
    notifySelection();
    selection = {
      rangeCount: 1,
      isCollapsed: true,
      getRangeAt: () => ({ startContainer: editorText, startOffset: editorText.length })
    } as unknown as Selection;
    notifySelection();

    expect(screen.queryByRole("listbox", { name: "Mention suggestions" })).not.toBeInTheDocument();
    getSelection.mockRestore();
    outsideText.remove();
  });

  it("handles mention arrows and Escape through the editor keydown path", async () => {
    const user = userEvent.setup();
    render(
      <MessageComposer
        memberNamesById={{ bob: "Bob", bella: "Bella" }}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={vi.fn()}
        title="# general"
      />
    );
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    await user.click(editor);
    await user.type(editor, "@B");
    fireEvent.keyDown(editor, { key: "ArrowUp" });
    fireEvent.keyDown(editor, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Bob" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(editor, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Mention suggestions" })).not.toBeInTheDocument();
  });

  it("inserts a selected emoji and closes the picker", async () => {
    const user = userEvent.setup();
    renderComposer("channel", false);
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    await user.click(screen.getByRole("button", { name: "Add emoji" }));
    expect(screen.getByRole("region", { name: "Message emoji picker" })).toBeInTheDocument();
    const pickerButton = screen.getByRole("button", { name: "grinning face" });
    await user.click(pickerButton);
    expect(editor).toHaveTextContent("😀");
    expect(screen.queryByRole("region", { name: "Message emoji picker" })).not.toBeInTheDocument();
  });

  it("handles line breaks and closes the emoji picker with Escape", async () => {
    const user = userEvent.setup();
    const onSend = renderComposer("channel", false);
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    await user.click(editor);
    await user.type(editor, "one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(editor, "two");
    await user.click(screen.getByRole("button", { name: "Add emoji" }));
    await user.click(editor);
    fireEvent.keyDown(editor, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Message emoji picker" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith("one\ntwo");
  });

  it("renders the attachment transfer boundary when upload is configured", async () => {
    const user = userEvent.setup();
    render(
      <MessageComposer
        memberNamesById={{}}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={vi.fn()}
        onUploadFile={vi.fn()}
        onShareDrive={vi.fn()}
        transfer={{ phase: "uploading", name: "notes.txt", progress: 0.5 }}
        title="# general"
      />
    );
    await user.click(screen.getByRole("button", { name: "Add file" }));
    expect(screen.getByRole("menuitem", { name: /Upload file/ })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: /Upload through Google Drive/ })).toBeEnabled();
    expect(screen.getByText("Uploading notes.txt 50%")).toBeInTheDocument();
  });

  it("shows and removes a draft attachment without sending it", async () => {
    const user = userEvent.setup();
    const onRemovePendingAttachment = vi.fn();
    const onSend = vi.fn();
    render(
      <MessageComposer
        memberNamesById={{}}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={onSend}
        transfer={{ phase: "idle" }}
        title="# general"
        pendingAttachments={[{ id: "draft-1", name: "notes.txt", mimeType: "text/plain", destination: "relay" }]}
        onRemovePendingAttachment={onRemovePendingAttachment}
        canSendWithoutText
      />
    );

    expect(screen.getByRole("group", { name: "Attached files" })).toHaveTextContent("notes.txt");
    expect(onSend).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Remove notes.txt" }));
    expect(onRemovePendingAttachment).toHaveBeenCalledWith("draft-1");
  });

  it("serializes mention pills, block content, line breaks, and caret anchors", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(
      <MessageComposer
        focusKey={1}
        memberNamesById={{}}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={onSend}
        title="# general"
      />
    );
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    editor.innerHTML = [
      '<span class="composer-mention" contenteditable="false">@Fallback</span>',
      '<span class="composer-mention" data-mention-id="bob" contenteditable="false">@Bob</span>',
      "<br>",
      "<p>tail&nbsp;text</p>"
    ].join("");
    editor.appendChild(document.createComment("ignored"));
    fireEvent.input(editor);

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSend).toHaveBeenCalledWith("@Fallback@[bob]\n\ntail text");
  });

  it("renders the explicit attachment-unavailable transfer state", () => {
    render(
      <MessageComposer
        attachmentUnavailableReason="Encrypted Files are unavailable."
        memberNamesById={{}}
        mode="channel"
        onCancelReply={vi.fn()}
        onSend={vi.fn()}
        transfer={{ phase: "idle" }}
        title="# general"
      />
    );

    expect(screen.getByText("Encrypted Files are unavailable.")).toBeInTheDocument();
  });

  it("selects the first mention with Tab", async () => {
    const user = userEvent.setup();
    const onSend = renderComposer("channel", false);
    const editor = screen.getByRole("textbox", { name: "Message # general" });
    await user.click(editor);
    await user.type(editor, " @Bo");
    fireEvent.keyDown(editor, { key: "Tab" });
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith("@Bo");
  });
});
