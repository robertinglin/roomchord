import { managementActions } from "@entities/chat/model/actions/managementActions";
import { mediaActions } from "@entities/chat/model/actions/mediaActions";
import { communityActions } from "@entities/chat/model/actions/communityActions";
import { directThreadActions } from "@entities/chat/model/actions/directThreadActions";
import { messageActions } from "@entities/chat/model/actions/messageActions";
import { presenceActions } from "@entities/chat/model/actions/presenceActions";
import { threadActions } from "@entities/chat/model/actions/threadActions";
import { safetyActions } from "@entities/chat/model/actions/safetyActions";
import { voiceModerationActions } from "@entities/chat/model/actions/voiceModerationActions";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export type { ChatActionHandlersInput };

export function chatActionHandlers(input: ChatActionHandlersInput) {
  return {
    ...messageActions(input),
    ...communityActions(input),
    ...directThreadActions(input),
    ...managementActions(input),
    ...mediaActions(input),
    ...presenceActions(input),
    ...threadActions(input),
    ...safetyActions(input),
    voiceModeration: voiceModerationActions(input)
  };
}

export type ChatActionHandlers = ReturnType<typeof chatActionHandlers>;
