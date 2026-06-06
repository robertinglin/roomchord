import { managementActions } from "@entities/chat/model/actions/managementActions";
import { mediaActions } from "@entities/chat/model/actions/mediaActions";
import { messageActions } from "@entities/chat/model/actions/messageActions";
import { presenceActions } from "@entities/chat/model/actions/presenceActions";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export type { ChatActionHandlersInput };

export function chatActionHandlers(input: ChatActionHandlersInput) {
  return {
    ...messageActions(input),
    ...managementActions(input),
    ...mediaActions(input),
    ...presenceActions(input)
  };
}

export type ChatActionHandlers = ReturnType<typeof chatActionHandlers>;
