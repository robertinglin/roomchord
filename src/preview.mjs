export function createChatPreviewState() {
  return {
    channels: [
      { id: "ch_general", name: "general", topic: "Daily coordination", createdAt: 1716800000000, archivedAt: null },
      { id: "ch_ops", name: "ops", topic: "Launch checklist", createdAt: 1716800060000, archivedAt: null },
      { id: "ch_archive", name: "old-rsvp", topic: "Archived test channel", createdAt: 1716700000000, archivedAt: 1716900000000 }
    ],
    messages: {
      msg_1: { id: "msg_1", channelId: "ch_general", authorId: "mina", authorName: "Mina", body: "Venue walkthrough is confirmed for 4pm.", createdAt: 1716800300000, editedAt: null, deletedAt: null, reactions: { "✅": ["lee", "sam"], "🙌": ["jo"] } },
      msg_2: { id: "msg_2", channelId: "ch_ops", authorId: "lee", authorName: "Lee", body: "I pushed the sponsor arrival checklist into the room wiki.", createdAt: 1716800900000, editedAt: null, deletedAt: null, reactions: { "👀": ["mina"] } },
      msg_3: { id: "msg_3", channelId: "ch_general", authorId: "sam", authorName: "Sam", body: "Do we want the food truck on the south entrance?", createdAt: 1716801200000, editedAt: 1716801300000, deletedAt: null, reactions: { "🤔": ["mina", "lee"] } },
      msg_deleted: { id: "msg_deleted", channelId: "ch_general", authorId: "bot", authorName: "Bot", body: "", createdAt: 1716801400000, editedAt: null, deletedAt: 1716801500000, reactions: {} }
    },
    activity: [
      { id: "act_1", message: "Created #general", createdAt: 1716800000000 },
      { id: "act_2", message: "Archived #old-rsvp", createdAt: 1716900000000 }
    ]
  };
}

export function summarizeChatPreview(state = createChatPreviewState()) {
  const activeChannels = state.channels.filter((channel) => !channel.archivedAt);
  const visibleMessages = Object.values(state.messages).filter((message) => !message.deletedAt);
  const byChannel = new Map(activeChannels.map((channel) => [channel.id, { ...channel, messages: 0, reactions: 0 }]));
  const reactions = new Map();
  for (const message of visibleMessages) {
    const channel = byChannel.get(message.channelId);
    if (channel) channel.messages += 1;
    for (const [emoji, members] of Object.entries(message.reactions || {})) {
      const count = members.length;
      reactions.set(emoji, (reactions.get(emoji) || 0) + count);
      if (channel) channel.reactions += count;
    }
  }
  const channels = [...byChannel.values()].sort((a, b) => b.messages - a.messages || a.name.localeCompare(b.name));
  const channelNames = Object.fromEntries(state.channels.map((channel) => [channel.id, channel.name]));
  return {
    activeChannels: activeChannels.length,
    visibleMessages: visibleMessages.length,
    channels,
    topChannel: channels[0] || null,
    reactionLeaders: [...reactions.entries()].map(([emoji, count]) => ({ emoji, count })).sort((a, b) => b.count - a.count),
    recentMessages: visibleMessages.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 4).map((message) => ({ ...message, channelName: channelNames[message.channelId] || "unknown" }))
  };
}
