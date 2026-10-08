import { describe, expect, it, vi } from "vitest";
import { threadActions } from "@entities/chat/model/actions/threadActions";

function liveState() {
  return {
    commentThreads: {
      old: { id: "old", scopeType: "channel", scopeId: "general", title: "Old", resolved: false, createdAt: 1, lastCommentAt: 2, archivedAt: null },
      newer: { id: "newer", scopeType: "channel", scopeId: "general", title: "Newer", resolved: false, createdAt: 30 },
      archived: { id: "archived", scopeType: "channel", scopeId: "general", title: "Archived", resolved: false, createdAt: 8, archivedAt: 9 },
      other: { id: "other", scopeType: "dm", scopeId: "dm-1", title: "Other", resolved: false, createdAt: 20, archivedAt: null }
    }
  } as any;
}

function setup() {
  const state = liveState();
  const live = { state, dispatch: vi.fn() } as any;
  return { live, actions: threadActions({ live } as any) };
}

describe("Matterhorn comments action composition", () => {
  it("creates a thread and returns the newly projected Matterhorn id", async () => {
    const { live, actions } = setup();
    live.dispatch.mockResolvedValue({ state: { commentThreads: { ...live.state.commentThreads, next: { id: "next", scopeType: "channel", scopeId: "general", createdAt: 30, archivedAt: null } } } });
    await expect(actions.createCommentThread("channel", "general", "Launch", {
      source: { kind: "channel", scopeId: "general", messageId: "message-1" },
      privateMemberIds: [" member-1 ", "member-1"]
    })).resolves.toBe("next");
    expect(live.dispatch).toHaveBeenCalledWith("commentsThreadCreate", {
      scopeType: "channel",
      scopeId: "general",
      title: "Launch",
      visibility: "private",
      source: { kind: "channel", scopeId: "general", messageId: "message-1" },
      sourceMessage: "message-1",
      privateMemberIds: ["member-1"]
    });
  });

  it("returns no id when the host accepts without a new projected thread", async () => {
    const { actions } = setup();
    await expect(actions.createCommentThread("channel", "general")).resolves.toBeUndefined();
  });

  it("handles an empty host projection without inventing a thread id", async () => {
    const live = { state: {}, dispatch: vi.fn() } as any;
    const actions = threadActions({ live } as any);
    await expect(actions.createCommentThread("channel", "general")).resolves.toBeUndefined();
  });

  it("filters archived scopes and sorts newest activity first", () => {
    const { actions } = setup();
    expect(actions.commentThreadsForScope("channel", "general").map((thread) => thread.id)).toEqual(["newer", "old"]);
    expect(actions.commentThreadsForScope("dm", "dm-1")).toHaveLength(1);
  });

  it("does not dispatch empty comments and composes parent ids", async () => {
    const { live, actions } = setup();
    await actions.addThreadComment("old", "   ");
    await actions.editThreadComment("comment", " ");
    expect(live.dispatch).not.toHaveBeenCalled();
    await actions.addThreadComment("old", " Reply ", "parent");
    await actions.addThreadComment("old", " Without parent ");
    await actions.editThreadComment("comment", " Edited ");
    expect(live.dispatch).toHaveBeenNthCalledWith(1, "commentsAdd", { threadId: "old", body: "Reply", scopeType: "channel", scopeId: "general", parentId: "parent" });
    expect(live.dispatch).toHaveBeenNthCalledWith(2, "commentsAdd", { threadId: "old", body: "Without parent", scopeType: "channel", scopeId: "general" });
    expect(live.dispatch).toHaveBeenNthCalledWith(3, "commentsEdit", { commentId: "comment", body: "Edited" });
  });

  it("wraps delete, react, resolve, and reopen operations", async () => {
    const { live, actions } = setup();
    await actions.deleteThreadComment("comment");
    await actions.reactToThreadComment("comment", "👍");
    await actions.resolveCommentThread("old");
    await actions.resolveCommentThread("old", false);
    expect(live.dispatch).toHaveBeenNthCalledWith(1, "commentsDelete", { commentId: "comment" });
    expect(live.dispatch).toHaveBeenNthCalledWith(2, "commentsReact", { commentId: "comment", emoji: "👍" });
    expect(live.dispatch).toHaveBeenNthCalledWith(3, "commentsResolve", { threadId: "old", resolved: true });
    expect(live.dispatch).toHaveBeenNthCalledWith(4, "commentsResolve", { threadId: "old", resolved: false });
  });

  it("wraps authoritative lifecycle and private-member operations", async () => {
    const { live, actions } = setup();
    await actions.archiveCommentThread("old");
    await actions.reopenCommentThread("old");
    await actions.lockCommentThread("old");
    await actions.unlockCommentThread("old");
    await actions.addCommentThreadMember("old", " member-1 ");
    await actions.removeCommentThreadMember("old", "member-1");
    expect(live.dispatch).toHaveBeenNthCalledWith(1, "commentsThreadArchive", { threadId: "old" });
    expect(live.dispatch).toHaveBeenNthCalledWith(2, "commentsThreadReopen", { threadId: "old" });
    expect(live.dispatch).toHaveBeenNthCalledWith(3, "commentsThreadLock", { threadId: "old" });
    expect(live.dispatch).toHaveBeenNthCalledWith(4, "commentsThreadUnlock", { threadId: "old" });
    expect(live.dispatch).toHaveBeenNthCalledWith(5, "commentsThreadMemberAdd", { threadId: "old", memberId: "member-1" });
    expect(live.dispatch).toHaveBeenNthCalledWith(6, "commentsThreadMemberRemove", { threadId: "old", memberId: "member-1" });
  });
});
