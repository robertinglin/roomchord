import { describe, expect, it, vi } from "vitest";
import { messageActions } from "@entities/chat/model/actions/messageActions";

function setup() {
  const directMessage = {
    id: "dm-message-1",
    threadId: "dm_alice__bob",
    userIds: ["alice", "bob"],
    topicKey: "topic-1",
    authorId: "bob",
    body: "hello",
    attachmentIds: ["file-1"]
  };
  const live = {
    actor: { memberId: "alice", role: "member" },
    state: {
      directMessages: { [directMessage.id]: directMessage },
      directThreads: {},
      messages: {}
    },
    dispatch: vi.fn().mockResolvedValue({}),
    reserveDirectThread: vi.fn().mockResolvedValue({ threadId: "reserved-carol", userIds: ["alice", "carol"] }),
    reshareForForward: vi.fn().mockResolvedValue({ replacements: [{ sourceFileId: "file-1", targetFileId: "file-2", shareId: "share-1" }], forward: { ok: true } }),
    forwardMessage: vi.fn().mockResolvedValue({ ok: true }),
  } as any;
  const ui = {
    clearDraftDirectThread: vi.fn(),
    closeDirectThread: vi.fn(),
    openDraftDirectThread: vi.fn(),
    setActiveView: vi.fn(),
    bumpComposerFocus: vi.fn(),
    showDirectThread: vi.fn(),
    setActiveThreadId: vi.fn()
  } as any;
  const view = {
    actorChatDisabled: false,
    activeThread: { id: "dm_alice__bob", userIds: ["alice", "bob"], topicKey: "topic-1" },
    currentChannelId: "general",
    currentThreadId: "dm_alice__bob",
    memberNamesById: { alice: "Alice", bob: "Bob" }
  } as any;
  return { actions: messageActions({ live, ui, view } as any), directMessage, live, ui, view };
}

describe("authoritative DM operations", () => {
  it("sends channel and direct messages without custom media plumbing", async () => {
    const { actions, live } = setup();
    live.state.directMessages = {};
    await actions.sendChannelMessage("hello", []);
    expect(live.dispatch).toHaveBeenCalledWith("messageSend", expect.not.objectContaining({ customMediaRefs: expect.anything() }));
    live.state.directMessages = { "dm-message-1": { id: "dm-message-1", threadId: "dm_alice__bob", userIds: ["alice", "bob"], authorId: "bob", body: "hello" } };
    await actions.sendDirectMessage("hello", []);
    expect(live.dispatch).toHaveBeenCalledWith("directMessageSend", expect.not.objectContaining({ customMediaRefs: expect.anything() }));
    await actions.replyToMessage("channel-message", "reply", ["reply-file"]);
    expect(live.dispatch).toHaveBeenCalledWith("messageReply", expect.objectContaining({ attachmentIds: ["reply-file"] }));
    live.state.directMessages = { "dm-message-1": { id: "dm-message-1", threadId: "dm_alice__bob", userIds: ["alice", "bob"], authorId: "bob", body: "hello" } };
    await actions.replyToMessage("dm-message-1", "reply", []);
    expect(live.dispatch).toHaveBeenCalledWith("directMessageReply", expect.not.objectContaining({ customMediaRefs: expect.anything() }));
  });

  it("allows attachment-only sends and rejects truly empty messages", async () => {
    const { actions, live } = setup();
    live.state.directMessages = {};

    await actions.sendChannelMessage("", []);
    await actions.sendChannelMessage("", ["channel-file"]);
    expect(live.dispatch).toHaveBeenCalledWith("messageSend", expect.objectContaining({ body: "", attachmentIds: ["channel-file"] }));

    live.state.directMessages = { "dm-message-1": { id: "dm-message-1", threadId: "dm_alice__bob", userIds: ["alice", "bob"], authorId: "bob", body: "hello" } };
    await actions.sendDirectMessage("", []);
    await actions.sendDirectMessage("", ["direct-file"]);
    expect(live.dispatch).toHaveBeenCalledWith("directMessageSend", expect.objectContaining({ body: "", attachmentIds: ["direct-file"] }));

    await actions.replyToMessage("channel-message", "", []);
    await actions.replyToMessage("channel-message", "", ["reply-file"]);
    expect(live.dispatch).toHaveBeenCalledWith("messageReply", expect.objectContaining({ body: "", attachmentIds: ["reply-file"] }));

    await actions.replyToMessage("dm-message-1", "", []);
    await actions.replyToMessage("dm-message-1", "", ["dm-reply-file"]);
    expect(live.dispatch).toHaveBeenCalledWith("directMessageReply", expect.objectContaining({ body: "", attachmentIds: ["dm-reply-file"] }));
  });

  it("validates and carries forum tag ids through channel sends and replies", async () => {
    const { actions, live } = setup();
    await actions.sendChannelMessage("tagged", [], [" release ", "release", "​"]);
    await actions.replyToMessage("channel-message", "tagged reply", [], ["support"]);
    expect(live.dispatch).toHaveBeenNthCalledWith(1, "messageSend", expect.objectContaining({ tagIds: ["release", "\u200b"] }));
    expect(live.dispatch).toHaveBeenNthCalledWith(2, "messageReply", expect.objectContaining({ tagIds: ["support"] }));
  });

  it("carries attachment refs through DM send and reply", async () => {
    const { actions, live } = setup();

    await actions.sendDirectMessage("hello with file", ["file-2"]);
    await actions.replyToMessage("dm-message-1", "reply with file", ["file-3"]);

    expect(live.dispatch).toHaveBeenNthCalledWith(1, "directMessageSend", {
      userIds: ["alice", "bob"],
      topicKey: "topic-1",
      body: "hello with file",
      attachmentIds: ["file-2"]
    });
    expect(live.dispatch).toHaveBeenNthCalledWith(2, "directMessageReply", {
      userIds: ["alice", "bob"],
      topicKey: "topic-1",
      replyToId: "dm-message-1",
      body: "reply with file",
      attachmentIds: ["file-3"]
    });
  });

  it("clears a committed DM draft after a successful send and adds non-link embeds", async () => {
    const { actions, live, ui, view } = setup();
    live.state.directThreads = { committed: { id: "direct_7f", userIds: ["alice", "bob"] } };
    view.currentThreadId = "direct_7f";
    await actions.sendDirectMessage("hello", []);
    expect(ui.clearDraftDirectThread).toHaveBeenCalledWith("direct_7f");

    live.state.directMessages = {};
    await actions.sendChannelMessage("[video](https://example.test/video.mp4)");
    expect(live.dispatch).toHaveBeenCalledWith("embedAdd", expect.objectContaining({ url: "https://example.test/video.mp4" }));
  });

  it("routes DM edit, delete, reaction, pin, and unpin to core aliases", async () => {
    const { actions, live } = setup();

    await actions.editMessage("dm-message-1", "edited");
    await actions.deleteMessage("dm-message-1");
    await actions.reactToMessage("dm-message-1", "👍");
    await actions.pinMessage("dm-message-1");
    await actions.unpinMessage("dm-message-1");

    expect(live.dispatch.mock.calls.map(([name]) => name)).toEqual([
      "directMessageEdit",
      "directMessageDelete",
      "directMessageReact",
      "directMessagePin",
      "directMessageUnpin"
    ]);
  });

  it.each([
    ["nonparticipant", (message: Record<string, unknown>) => { message.userIds = ["carol"]; }],
    ["malformed", (message: Record<string, unknown>) => { delete message.userIds; }],
    ["stale", (message: Record<string, unknown>) => { message.threadId = "stale-thread"; }]
  ] as const)("propagates public SDK rejection for %s participant controls", async (_scenario, corrupt) => {
    const { actions, live } = setup();
    corrupt(live.state.directMessages["dm-message-1"]);
    const error = "Direct-message controls require an existing message and a participant.";
    for (const [operation, action, payload] of [
      [actions.reactToMessage, "directMessageReact", { messageId: "dm-message-1", emoji: "👍" }],
      [actions.pinMessage, "directMessagePin", { messageId: "dm-message-1" }],
      [actions.unpinMessage, "directMessageUnpin", { messageId: "dm-message-1" }]
    ] as const) {
      live.dispatch.mockRejectedValueOnce(new Error(error));
      const result = operation === actions.reactToMessage
        ? operation("dm-message-1", "👍")
        : operation("dm-message-1");
      await expect(result).rejects.toThrow(error);
      expect(live.dispatch).toHaveBeenLastCalledWith(action, payload);
    }
    expect(live.dispatch).toHaveBeenCalledTimes(3);
  });

  it("uses the authoritative forward operation for channel and DM targets", async () => {
    const { actions, directMessage, live } = setup();

    const target = { type: "dm" as const, id: "other-dm", label: "Carol", threadId: "dm_alice__carol", topicKey: "project:carol", userIds: ["alice", "carol"] };
    await actions.forwardMessage(directMessage, target);
    await actions.forwardMessage({ id: "channel-message", channelId: "general", body: "channel", authorId: "alice" }, target);
    await actions.forwardMessage({ id: "channel-message", channelId: "general", body: "channel", authorId: "alice" }, { type: "channel", id: "other-channel", label: "Other", channelId: "other" });

    expect(live.reshareForForward).toHaveBeenCalledWith({
      source: { kind: "direct.thread", scopeId: "dm_alice__bob", messageId: "dm-message-1" },
      target: { kind: "direct.thread", threadId: "dm_alice__carol", userIds: ["alice", "carol"], topicKey: "project:carol" }
    });
    expect(live.forwardMessage).toHaveBeenNthCalledWith(1, {
      source: { kind: "channel", scopeId: "general", messageId: "channel-message" },
      target: { kind: "direct.thread", threadId: "dm_alice__carol", userIds: ["alice", "carol"], topicKey: "project:carol" }
    });
    expect(live.forwardMessage).toHaveBeenNthCalledWith(2, {
      source: { kind: "channel", scopeId: "general", messageId: "channel-message" },
      target: { kind: "channel", channelId: "other" }
    });
    expect(live.dispatch).not.toHaveBeenCalled();
  });

  it("returns authoritative replacement metadata for a cross-scope re-share", async () => {
    const { actions, directMessage, live } = setup();
    const result = await actions.forwardMessage(directMessage, { type: "dm", id: "other-dm", label: "Carol", threadId: "dm_alice__carol", userIds: ["alice", "carol"] });

    expect(result).toEqual({ replacements: [{ sourceFileId: "file-1", targetFileId: "file-2", shareId: "share-1" }], forward: { ok: true } });
    expect(live.forwardMessage).not.toHaveBeenCalled();
    expect(live.dispatch).not.toHaveBeenCalled();
  });

  it("surfaces resolved authoritative forward rejections instead of reporting success", async () => {
    const { actions, directMessage, live } = setup();
    live.forwardMessage.mockResolvedValueOnce({ ok: false, reason: "Target channel is unavailable." });
    live.forwardMessage.mockResolvedValueOnce({ ok: false });
    live.reshareForForward.mockResolvedValueOnce({ replacements: [], forward: { ok: false, reason: "Replacement publication was rejected." } });

    const channelMessage = { id: "channel-message", channelId: "general", body: "channel", authorId: "alice" };
    await expect(actions.forwardMessage(channelMessage, { type: "channel", id: "other", label: "Other", channelId: "other" })).resolves.toBe("Target channel is unavailable.");
    await expect(actions.forwardMessage(channelMessage, { type: "channel", id: "other", label: "Other", channelId: "other" })).resolves.toBe(false);
    await expect(actions.forwardMessage(directMessage, { type: "dm", id: "other-dm", label: "Carol", threadId: "dm_alice__carol", userIds: ["alice", "carol"] })).resolves.toBe("Replacement publication was rejected.");
  });

  it("lets the authoritative re-share host reserve a new direct-thread target", async () => {
    const { actions, directMessage, live } = setup();

    await actions.forwardMessage(directMessage, { type: "dm", id: "new-dm", label: "Carol", userIds: ["alice", "carol"] });

    expect(live.reshareForForward).toHaveBeenCalledWith({
      source: { kind: "direct.thread", scopeId: "dm_alice__bob", messageId: "dm-message-1" },
      target: { kind: "direct.thread", userIds: ["alice", "carol"] }
    });
    expect(live.forwardMessage).not.toHaveBeenCalled();
  });

  it("keeps same-scope attachments and attachment-free cross-scope forwards on direct forwarding", async () => {
    const { actions, directMessage, live } = setup();
    const sameThread = { type: "dm" as const, id: "same-dm", label: "Bob", threadId: "dm_alice__bob", topicKey: "topic-1", userIds: ["alice", "bob"] };

    await actions.forwardMessage(directMessage, sameThread);
    await actions.forwardMessage({ id: "channel-message", channelId: "general", body: "channel", authorId: "alice", attachmentIds: ["file-3"] }, { type: "channel", id: "general", label: "General", channelId: "general" });
    await actions.forwardMessage({ id: "channel-message-2", channelId: "general", body: "channel", authorId: "alice" }, { type: "channel", id: "other", label: "Other", channelId: "other" });

    expect(live.reshareForForward).not.toHaveBeenCalled();
    expect(live.forwardMessage).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["provider", new Error("Google Drive attachment cannot be re-shared")],
    ["aborted", new DOMException("The operation was aborted", "AbortError")],
    ["cleanup", new AggregateError([new Error("forward"), new Error("cleanup")], "Files v2 forwarding failed and cleanup was incomplete.")]
  ] as const)("fails closed for authoritative %s re-share errors", async (_scenario, error) => {
    const { actions, directMessage, live } = setup();
    live.reshareForForward.mockRejectedValueOnce(error);

    await expect(actions.forwardMessage(directMessage, { type: "dm", id: "other-dm", label: "Carol", threadId: "dm_alice__carol", userIds: ["alice", "carol"] })).resolves.toBe(error.message);
    expect(live.forwardMessage).not.toHaveBeenCalled();
  });

  it("does not dispatch incomplete or disabled forwarding/send requests", async () => {
    const { actions, live, view } = setup();
    view.currentChannelId = undefined;
    await actions.sendChannelMessage("ignored");
    view.currentThreadId = undefined;
    await actions.sendDirectMessage("ignored");
    await expect(actions.forwardMessage({ id: "orphan", body: "orphan" } as any, { type: "channel", id: "other", label: "Other", channelId: "other" })).resolves.toBe(false);
    view.currentChannelId = "general";
    view.actorChatDisabled = true;
    await actions.sendChannelMessage("blocked");
    expect(live.dispatch).not.toHaveBeenCalled();
  });

  it("keeps channel sends and lifecycle actions on their channel aliases", async () => {
    const { actions, live } = setup();
    live.state.directMessages = {};

    await actions.sendChannelMessage("hello [link](https://example.com)", ["file-channel"]);
    await actions.replyToMessage("channel-message", "reply");
    await actions.reactToMessage("channel-message", "👍");
    await actions.pinMessage("channel-message");
    await actions.unpinMessage("channel-message");
    await actions.deleteMessage("channel-message");
    await actions.editMessage("channel-message", "edited");

    expect(live.dispatch.mock.calls.map(([name]) => name)).toEqual([
      "messageSend",
      "messageReply",
      "messageReact",
      "messagePin",
      "messageUnpin",
      "messageDelete",
      "messageEdit"
    ]);
  });

  it("removes exclusively owned files with their deleted message and preserves shared files", async () => {
    const { actions, live } = setup();
    live.state.directMessages = {};
    live.state.messages = {
      "channel-message": { id: "channel-message", channelId: "general", body: "", attachmentIds: ["file-only", "asset-only", "file-shared"] },
      "other-message": { id: "other-message", channelId: "general", body: "shared", attachmentIds: ["file-shared"] }
    };
    live.state.files = {
      "file-only": { fileId: "file-only" },
      "file-shared": { fileId: "file-shared" }
    };
    live.state.attachments = {
      "attachment-only": { id: "attachment-only", assetId: "asset-only" }
    };

    await actions.deleteMessage("channel-message");

    expect(live.dispatch.mock.calls).toEqual([
      ["messageDelete", { messageId: "channel-message" }],
      ["fileRemove", { fileId: "file-only" }],
      ["attachmentRemove", { attachmentId: "attachment-only" }]
    ]);
  });

  it("distinguishes an unconfirmed deletion from incomplete file cleanup", async () => {
    vi.useFakeTimers();
    try {
      const unconfirmed = setup();
      unconfirmed.live.state.directMessages = {};
      unconfirmed.live.dispatch.mockImplementation((operation: string) => operation === "messageDelete" ? new Promise(() => undefined) : Promise.resolve());
      const deletion = unconfirmed.actions.deleteMessage("channel-message");
      await vi.advanceTimersByTimeAsync(15_000);
      await expect(deletion).resolves.toContain("Deletion was not confirmed");
      expect(unconfirmed.live.dispatch).toHaveBeenCalledTimes(1);

      const incomplete = setup();
      incomplete.live.state.directMessages = {};
      incomplete.live.state.messages = { "channel-message": { id: "channel-message", channelId: "general", body: "", attachmentIds: ["file-only"] } };
      incomplete.live.state.files = { "file-only": { fileId: "file-only" } };
      incomplete.live.dispatch.mockImplementation((operation: string) => operation === "fileRemove" ? new Promise(() => undefined) : Promise.resolve());
      const cleanup = incomplete.actions.deleteMessage("channel-message");
      await vi.advanceTimersByTimeAsync(15_000);
      await expect(cleanup).resolves.toContain("Message deletion was confirmed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("handles committed and draft direct-thread navigation with canonical reservation", async () => {
    const { actions, live, ui, view } = setup();
    view.threads = [{ id: "dm_alice__bob", userIds: ["alice", "bob"] }, { id: "dm_alice__carol", userIds: ["alice", "carol"] }];
    live.state.directThreads = {
      committed: { id: "dm_alice__carol", userIds: ["alice", "carol"], topicKey: undefined }
    };

    actions.closeDirectThread("dm_alice__bob");
    await actions.openDirectThreadForMember("carol");

    expect(ui.closeDirectThread).toHaveBeenCalledTimes(1);
    expect(ui.closeDirectThread).toHaveBeenCalledWith(expect.objectContaining({ threadId: "dm_alice__bob", nextThreadId: "dm_alice__carol" }));
    expect(ui.setActiveView).toHaveBeenCalledWith("dm");
    expect(ui.bumpComposerFocus).toHaveBeenCalled();
  });

  it("uses Matterhorn's reserved id for a new draft direct thread", async () => {
    const { actions, live, ui, view } = setup();
    view.threads = [];
    live.state.directThreads = {};
    live.reserveDirectThread.mockResolvedValue({ threadId: "mh-reserved", userIds: ["alice", "carol"] });

    await actions.openDirectThreadForMember("carol");

    expect(live.reserveDirectThread).toHaveBeenCalledWith({ userIds: ["alice", "carol"] });
    expect(ui.openDraftDirectThread).toHaveBeenCalledWith(expect.objectContaining({ id: "mh-reserved", userIds: ["alice", "carol"] }));

    view.currentThreadId = "mh-reserved";
    view.activeThread = { id: "mh-reserved", userIds: ["alice", "carol"] };
    await actions.sendDirectMessage("", ["reserved-file"]);
    expect(live.dispatch).toHaveBeenCalledWith("directMessageSend", {
      userIds: ["alice", "carol"],
      body: "",
      attachmentIds: ["reserved-file"]
    });
  });

  it("does not leak failures or disabled sends into DM operations", async () => {
    const { actions, live, view } = setup();
    view.actorChatDisabled = true;
    await actions.sendDirectMessage("blocked", ["file-1"]);
    expect(live.dispatch).not.toHaveBeenCalled();

    view.actorChatDisabled = false;
    live.dispatch.mockRejectedValueOnce(new Error("rejected"));
    await actions.sendDirectMessage("rejected", ["file-2"]);
    expect(live.dispatch).toHaveBeenCalledWith("directMessageSend", expect.objectContaining({ attachmentIds: ["file-2"] }));
  });
});
