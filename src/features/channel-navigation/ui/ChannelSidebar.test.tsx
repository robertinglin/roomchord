import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChannelSidebar } from "./ChannelSidebar";

const notificationPreferences = {
  client: {},
  followed: vi.fn(() => false),
  preference: vi.fn(() => undefined),
  ready: true,
  resolve: vi.fn((scope) => ({ scope, mode: "all", muted: false, mute: null, modeSource: { type: "account" }, inherited: true })),
  setFollowed: vi.fn().mockResolvedValue(undefined),
  setMode: vi.fn().mockResolvedValue(undefined),
  setMute: vi.fn().mockResolvedValue(undefined)
} as never;

const baseProps = {
  activeChannelId: undefined,
  canCreateChannels: true,
  canManageCategories: true,
  memberId: "member-one",
  notificationPreferences,
  roomId: "room-one",
  unreadCounts: {},
  voice: {
    state: { rooms: [], voiceRoomPlacements: [] } as never,
    voiceTokens: [],
    canManageRooms: true,
    currentRoleIds: ["admin"],
    onCreate: vi.fn(),
    onJoin: vi.fn(),
    onReorder: vi.fn(),
  },
  onCreateCategory: vi.fn(),
  onCreateChannel: vi.fn(),
  onSelect: vi.fn(),
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ChannelSidebar", () => {
  it("marks a channel read through the callback without selecting it", () => {
    const onMarkRead = vi.fn();
    const onSelect = vi.fn();
    render(<ChannelSidebar {...baseProps} channels={[{ id: "general", name: "general" } as never]} onMarkRead={onMarkRead} onSelect={onSelect} />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "#general" }), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Mark As Read" }));

    expect(onMarkRead).toHaveBeenCalledWith("general");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("pins text channels first from shared room state", () => {
    const channels = [
      { id: "general", name: "general", categoryId: "general", position: 0 },
      { id: "random", name: "random", categoryId: "general", position: 1 }
    ];
    const categories = [{ id: "general", name: "General", position: 0 }];
    const onTogglePin = vi.fn();
    const first = render(<ChannelSidebar {...baseProps} canManagePins onTogglePin={onTogglePin} categories={categories} channels={channels as never} />);
    fireEvent.contextMenu(screen.getByRole("button", { name: "#random" }), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin Channel to Top" }));
    expect(onTogglePin).toHaveBeenCalledWith("channel", "random", true);
    first.unmount();

    render(<ChannelSidebar {...baseProps} canManagePins onTogglePin={onTogglePin} categories={categories} channels={channels as never} voice={{ ...baseProps.voice, state: { pinnedChannels: [{ id: "channel:random", channelId: "random", channelKind: "channel" }], rooms: [], voiceRoomPlacements: [] } as never }} />);
    expect(screen.getAllByRole("button").filter((button) => button.getAttribute("aria-label")?.startsWith("#")).map((button) => button.getAttribute("aria-label"))).toEqual(["#random", "#general"]);
    expect(screen.getByRole("button", { name: "#random" }).querySelector('[data-pinned="true"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#general" }).querySelector('[data-pinned="true"]')).not.toBeInTheDocument();
  });

  it("opens and saves notification controls from a channel right click", async () => {
    render(<ChannelSidebar {...baseProps} channels={[{ id: "general", name: "general" } as never]} />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "#general" }), { clientX: 40, clientY: 40 });
    expect(screen.getByRole("menu", { name: "Channel actions" })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Notification Settings" }));
    expect(screen.getByRole("menuitemradio", { name: "Use Category Default" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Nothing" }));
    expect(notificationPreferences.setMode).toHaveBeenCalledWith({ type: "channel", roomId: "room-one", channelId: "general" }, "none");
  });

  it("provides the full voice-channel context menu and toggles name visibility", async () => {
    const onOpenSettings = vi.fn();
    const onSelect = vi.fn();
    render(
      <ChannelSidebar
        {...baseProps}
        categories={[{ id: "voice-rooms", name: "Voice Rooms", position: 0 }]}
        channels={[{ id: "voice-chat", name: "voice-chat", kind: "voice-text", mediaRoomId: "voice", categoryId: "voice-rooms", position: 1 } as never]}
        onSelect={onSelect}
        voice={{
          ...baseProps.voice,
          onOpenSettings,
          state: {
            rooms: [{ id: "voice", name: "Voice", allowsVideo: true, locked: false, archivedAt: null, participantCount: 0 }],
            voiceRoomPlacements: [{ id: "voice", roomId: "voice", categoryId: "voice-rooms", position: 0 }],
            pinnedChannels: [{ id: "voice:voice", channelId: "voice", channelKind: "voice" }]
          } as never
        }}
      />
    );

    const voiceChannel = screen.getByRole("button", { name: "Join Voice" });
    expect(voiceChannel.querySelector('[data-pinned="true"]')).toBeInTheDocument();
    fireEvent.contextMenu(voiceChannel, { clientX: 40, clientY: 40 });
    expect(screen.getByRole("menuitem", { name: "Invite to Voice" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Open Chat" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit Channel" })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Notification Settings" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Only @mentions" }));
    expect(notificationPreferences.setMode).toHaveBeenCalledWith({ type: "channel", roomId: "room-one", channelId: "voice-chat" }, "mentions");
    await act(async () => undefined);
    fireEvent.contextMenu(voiceChannel, { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Chat" }));
    expect(onSelect).toHaveBeenCalledWith("voice-chat");

    fireEvent.contextMenu(voiceChannel, { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Hide Names" }));

    fireEvent.contextMenu(voiceChannel, { clientX: 40, clientY: 40 });
    expect(screen.getByRole("menuitemcheckbox", { name: "Hide Names" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Channel" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("marks a bound voice channel read without selecting its text channel", () => {
    const onMarkRead = vi.fn();
    const onSelect = vi.fn();
    render(
      <ChannelSidebar
        {...baseProps}
        categories={[{ id: "voice-rooms", name: "Voice Rooms", position: 0 }]}
        channels={[{ id: "voice-chat", name: "voice-chat", kind: "voice-text", mediaRoomId: "voice", categoryId: "voice-rooms", position: 1 } as never]}
        onMarkRead={onMarkRead}
        onSelect={onSelect}
        voice={{
          ...baseProps.voice,
          state: {
            rooms: [{ id: "voice", name: "Voice", allowsVideo: true, locked: false, archivedAt: null, participantCount: 0 }],
            voiceRoomPlacements: [{ id: "voice", roomId: "voice", categoryId: "voice-rooms", position: 0 }]
          } as never
        }}
      />
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "Join Voice" }), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Mark As Read" }));

    expect(onMarkRead).toHaveBeenCalledWith("voice-chat");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("delegates unbound voice chat creation to the room action", () => {
    const onOpenVoiceChat = vi.fn();
    render(
      <ChannelSidebar
        {...baseProps}
        onOpenVoiceChat={onOpenVoiceChat}
        categories={[{ id: "voice-rooms", name: "Voice Rooms", position: 0 }]}
        channels={[]}
        voice={{
          ...baseProps.voice,
          state: {
            rooms: [{ id: "voice", name: "Voice", allowsVideo: true, locked: false, archivedAt: null, participantCount: 0 }],
            voiceRoomPlacements: [{ id: "voice", roomId: "voice", categoryId: "voice-rooms", position: 0 }]
          } as never
        }}
      />
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "Join Voice" }), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Chat" }));
    expect(onOpenVoiceChat).toHaveBeenCalledWith(expect.objectContaining({ id: "voice", name: "Voice" }), "voice-rooms");
  });

  it("opens category and channel creation in dialogs", () => {
    render(<ChannelSidebar {...baseProps} categories={[
      { id: "general", name: "General", position: 0 },
      { id: "voice-rooms", name: "Voice Rooms", position: 1 }
    ]} channels={[]} />);

    expect(screen.queryByRole("button", { name: "Create channel" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create channel or category" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Create category" }));
    expect(screen.getByRole("dialog", { name: "Create category" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    fireEvent.click(screen.getByRole("button", { name: "Create channel or category" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Create voice channel" }));
    expect(screen.getByRole("dialog", { name: "Create voice channel" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Channel category" })).toHaveValue("voice-rooms");
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    fireEvent.click(screen.getByRole("button", { name: "Create channel or category" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Create channel" }));
    expect(screen.getByRole("dialog", { name: "Create channel" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Channel category" })).toHaveValue("general");
  });

  it("persists category positions after an HTML drag", async () => {
    const onReorderCategory = vi.fn();
    render(
      <ChannelSidebar
        {...baseProps}
        categories={[
          { id: "first", name: "First", position: 0 },
          { id: "second", name: "Second", position: 1 },
        ]}
        channels={[]}
        onReorderCategory={onReorderCategory}
      />
    );
    const second = screen.getByRole("button", { name: "Second" }).parentElement!;
    const firstDropTarget = screen.getByRole("button", { name: "First" }).parentElement!;
    vi.spyOn(firstDropTarget, "getBoundingClientRect").mockReturnValue({ top: 0, height: 20 } as DOMRect);
    const dataTransfer = { effectAllowed: "none", dropEffect: "none", setData: vi.fn() };

    fireEvent.dragStart(second, { dataTransfer });
    fireEvent.dragOver(firstDropTarget, { dataTransfer, clientY: 0 });
    expect(document.querySelector('[data-drop-line="category-before"]')).toBeInstanceOf(HTMLHRElement);
    fireEvent.drop(firstDropTarget, { dataTransfer, clientY: 0 });

    await act(async () => undefined);
    expect(document.querySelector("[data-drop-line]")).not.toBeInTheDocument();
    expect(onReorderCategory).toHaveBeenCalledWith("second", 0);
    expect(onReorderCategory).toHaveBeenCalledWith("first", 1);
  });

  it("moves a dragged channel into another category", async () => {
    const onReorderChannel = vi.fn();
    render(
      <ChannelSidebar
        {...baseProps}
        categories={[
          { id: "first", name: "First", position: 0 },
          { id: "second", name: "Second", position: 1 },
        ]}
        channels={[{ id: "one", name: "one", categoryId: "first", position: 0 } as never]}
        onReorderChannel={onReorderChannel}
      />
    );
    const channel = screen.getByRole("button", { name: "#one" });
    const secondDropTarget = screen.getByRole("button", { name: "Second" }).parentElement!;
    vi.spyOn(secondDropTarget, "getBoundingClientRect").mockReturnValue({ top: 0, height: 20 } as DOMRect);
    const dataTransfer = { effectAllowed: "none", dropEffect: "none", setData: vi.fn() };

    fireEvent.dragStart(channel, { dataTransfer });
    fireEvent.dragOver(secondDropTarget, { dataTransfer, clientY: 15 });
    fireEvent.drop(secondDropTarget, { dataTransfer, clientY: 15 });
    await act(async () => undefined);

    expect(onReorderChannel).toHaveBeenCalledWith("one", "second", 0);
  });

  it("inserts an actual divider between channel list entries while dragging", async () => {
    const onReorderChannel = vi.fn();
    render(
      <ChannelSidebar
        {...baseProps}
        categories={[{ id: "general", name: "General", position: 0 }]}
        channels={[
          { id: "first", name: "first", categoryId: "general", position: 0 },
          { id: "second", name: "second", categoryId: "general", position: 1 },
        ] as never}
        onReorderChannel={onReorderChannel}
      />
    );
    const first = screen.getByRole("button", { name: "#first" });
    const second = screen.getByRole("button", { name: "#second" });
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue({ top: 0, height: 34 } as DOMRect);
    const dataTransfer = { effectAllowed: "none", dropEffect: "none", setData: vi.fn() };

    fireEvent.dragStart(second, { dataTransfer });
    fireEvent.dragOver(first, { dataTransfer, clientY: 0 });

    const divider = document.querySelector('[data-drop-line="item-before"]');
    expect(divider).toBeInstanceOf(HTMLHRElement);
    expect(divider?.nextElementSibling).toContainElement(first);

    fireEvent.drop(first, { dataTransfer, clientY: 0 });
    await act(async () => undefined);
    expect(document.querySelector("[data-drop-line]")).not.toBeInTheDocument();
  });

  it("moves a dragged voice channel into any category", async () => {
    const onReorder = vi.fn();
    render(
      <ChannelSidebar
        {...baseProps}
        categories={[
          { id: "general", name: "General", position: 0 },
          { id: "voice-rooms", name: "Voice Rooms", position: 1 },
        ]}
        channels={[]}
        voice={{
          ...baseProps.voice,
          state: {
            rooms: [{ id: "voice", name: "Voice", allowsVideo: true, locked: false, archivedAt: null, participantCount: 0 }],
            voiceRoomPlacements: [{ id: "voice", roomId: "voice", categoryId: "voice-rooms", position: 0 }]
          } as never,
          onReorder,
        }}
      />
    );
    const room = screen.getByRole("button", { name: "Join Voice" });
    const generalDropTarget = screen.getByRole("button", { name: "General" }).parentElement!;
    vi.spyOn(generalDropTarget, "getBoundingClientRect").mockReturnValue({ top: 0, height: 20 } as DOMRect);
    const dataTransfer = { effectAllowed: "none", dropEffect: "none", setData: vi.fn() };

    fireEvent.dragStart(room, { dataTransfer });
    fireEvent.dragOver(generalDropTarget, { dataTransfer, clientY: 0 });
    fireEvent.drop(generalDropTarget, { dataTransfer, clientY: 0 });
    await act(async () => undefined);

    expect(onReorder).toHaveBeenCalledWith("voice", "general", 0);
  });
});
