import { managementActions } from "./actions/managementActions";
import { mediaActions } from "./actions/mediaActions";
import { messageActions } from "./actions/messageActions";
import { presenceActions } from "./actions/presenceActions";
import type { ChatActionHandlersInput } from "./actions/types";

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
