import type {
  MatterhornDirectThreadCreateInput,
  MatterhornDirectThreadMembersInput,
  MatterhornDirectThreadRenameInput,
  MatterhornDirectThreadReservation
} from "matterhorn-sdk/client";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export function directThreadActions({ live }: ChatActionHandlersInput) {
  async function reserveDirectThread(userIds: string[], topicKey?: string) {
    return live.reserveDirectThread({ userIds, topicKey });
  }

  async function createDirectThread(input: MatterhornDirectThreadCreateInput): Promise<MatterhornDirectThreadReservation> {
    const reservation = await live.createDirectThread(input);
    await live.refresh();
    return reservation;
  }

  async function addDirectThreadMembers(input: MatterhornDirectThreadMembersInput) {
    await live.addDirectThreadMembers(input);
    await live.refresh();
  }

  async function removeDirectThreadMembers(input: MatterhornDirectThreadMembersInput) {
    await live.removeDirectThreadMembers(input);
    await live.refresh();
  }

  async function leaveDirectThread(threadId: string) {
    await live.leaveDirectThread(threadId);
    await live.refresh();
  }

  async function renameDirectThread(input: MatterhornDirectThreadRenameInput) {
    await live.renameDirectThread(input);
    await live.refresh();
  }

  return {
    addDirectThreadMembers,
    createDirectThread,
    leaveDirectThread,
    removeDirectThreadMembers,
    renameDirectThread,
    reserveDirectThread
  };
}
