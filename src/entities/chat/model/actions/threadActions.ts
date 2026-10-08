import type { CommentId, CommentThread, ThreadId } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export type CommentThreadSource = {
  kind: "channel" | "direct.thread" | (string & {});
  scopeId: string;
  messageId: string;
};

export type CommentThreadCreateOptions = {
  source?: CommentThreadSource;
  visibility?: "members" | "moderators" | "private" | (string & {});
  privateMemberIds?: string[];
};

export function threadActions(input: ChatActionHandlersInput) {
  const { live } = input;

  async function createCommentThread(scopeType: string, scopeId: string, title?: string, options: CommentThreadCreateOptions = {}): Promise<string | undefined> {
    const before = new Set(Object.keys(live.state.commentThreads || {}));
    const privateMemberIds = [...new Set((options.privateMemberIds || []).map((memberId) => memberId.trim()).filter(Boolean))];
    const payload = {
      scopeType,
      scopeId,
      title,
      visibility: options.visibility || (privateMemberIds.length ? "private" : "members"),
      ...(options.source ? { source: options.source, sourceMessage: options.source.messageId } : {}),
      ...(privateMemberIds.length ? { privateMemberIds } : {})
    };
    const result = await live.dispatch("commentsThreadCreate", payload as never);
    const resultState = (result as { state?: typeof live.state } | undefined)?.state;
    const threads = resultState?.commentThreads || live.state.commentThreads || {};
    return Object.values(threads).find((thread) => !before.has(String(thread.id)))?.id;
  }

  async function addThreadComment(threadId: string, body: string, parentId?: string) {
    if (!body.trim()) return;
    const thread = live.state.commentThreads?.[threadId as ThreadId];
    await live.dispatch("commentsAdd", {
      threadId: threadId as ThreadId,
      body: body.trim(),
      ...(thread?.scopeType ? { scopeType: thread.scopeType, scopeId: thread.scopeId } : {}),
      ...(parentId ? { parentId: parentId as CommentId } : {})
    });
  }

  async function editThreadComment(commentId: string, body: string) {
    if (!body.trim()) return;
    await live.dispatch("commentsEdit", { commentId: commentId as CommentId, body: body.trim() });
  }

  async function deleteThreadComment(commentId: string) {
    await live.dispatch("commentsDelete", { commentId: commentId as CommentId });
  }

  async function reactToThreadComment(commentId: string, emoji: string) {
    await live.dispatch("commentsReact", { commentId: commentId as CommentId, emoji });
  }

  async function resolveCommentThread(threadId: string, resolved = true) {
    await live.dispatch("commentsResolve", { threadId: threadId as ThreadId, resolved });
  }

  async function archiveCommentThread(threadId: string) {
    await live.dispatch("commentsThreadArchive", { threadId: threadId as ThreadId });
  }

  async function reopenCommentThread(threadId: string) {
    await live.dispatch("commentsThreadReopen", { threadId: threadId as ThreadId });
  }

  async function lockCommentThread(threadId: string) {
    await live.dispatch("commentsThreadLock", { threadId: threadId as ThreadId });
  }

  async function unlockCommentThread(threadId: string) {
    await live.dispatch("commentsThreadUnlock", { threadId: threadId as ThreadId });
  }

  async function addCommentThreadMember(threadId: string, memberId: string) {
    if (!memberId.trim()) return;
    await live.dispatch("commentsThreadMemberAdd", { threadId: threadId as ThreadId, memberId: memberId.trim() });
  }

  async function removeCommentThreadMember(threadId: string, memberId: string) {
    if (!memberId.trim()) return;
    await live.dispatch("commentsThreadMemberRemove", { threadId: threadId as ThreadId, memberId: memberId.trim() });
  }

  function commentThreadsForScope(scopeType: string, scopeId: string): CommentThread[] {
    return Object.values(live.state.commentThreads || {})
      .filter((thread) => thread.scopeType === scopeType && thread.scopeId === scopeId && !thread.archivedAt && thread.lifecycle !== "archived")
      .sort((left, right) => Number(right.lastCommentAt || right.createdAt || 0) - Number(left.lastCommentAt || left.createdAt || 0));
  }

  return {
    addThreadComment,
    addCommentThreadMember,
    archiveCommentThread,
    commentThreadsForScope,
    createCommentThread,
    deleteThreadComment,
    editThreadComment,
    lockCommentThread,
    reactToThreadComment,
    removeCommentThreadMember,
    reopenCommentThread,
    resolveCommentThread,
    unlockCommentThread
  };
}
