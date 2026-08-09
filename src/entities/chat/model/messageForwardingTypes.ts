export type MessageForwardTarget =
  | { id: string; type: "channel"; label: string; channelId: string }
  | { id: string; type: "dm"; label: string; threadId?: string; topicKey?: string; userIds: string[] };
