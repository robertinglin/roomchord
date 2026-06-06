import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export function presenceActions(input: ChatActionHandlersInput) {
  const { dispatch } = input.live;

  async function updatePresence(status: string, activity: string) {
    if (await input.live.core.sendPresence({ status, activity, at: Date.now() })) return;
    await dispatch("presenceUpdate", { status, activity });
  }

  async function stopScreenShare(shareId: string) {
    await dispatch("screenshareStop", { shareId });
  }

  return {
    stopScreenShare,
    updatePresence
  };
}
