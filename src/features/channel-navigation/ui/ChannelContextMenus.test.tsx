import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextChannelContextMenu, VoiceChannelContextMenu } from "./ChannelContextMenus";

function controller(options: { mode?: "all" | "mentions" | "none"; mute?: null | { kind: "indefinite" } | { kind: "until"; expiresAt: number } } = {}) {
  const mute = options.mute ?? null;
  return {
    client: {},
    followed: vi.fn(() => false),
    preference: vi.fn(() => options.mode || mute ? { mode: options.mode || "inherit", mute } : undefined),
    ready: true,
    resolve: vi.fn((scope) => ({ scope, mode: options.mode || "all", muted: Boolean(mute), mute, modeSource: scope, muteSource: mute ? scope : undefined, inherited: false })),
    setFollowed: vi.fn().mockResolvedValue(undefined),
    setMode: vi.fn().mockResolvedValue(undefined),
    setMute: vi.fn().mockResolvedValue(undefined)
  } as never;
}

describe("channel context notification controls", () => {
  it("writes text-channel mute and mode preferences to the channel scope", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const preferences = controller({ mode: "mentions" });
    render(
      <TextChannelContextMenu
        canManage={false}
        channel={{ id: "general", name: "general", categoryId: "work" } as never}
        notificationPreferences={preferences}
        roomId="room-1"
        onCreate={vi.fn()}
        onDuplicate={vi.fn()}
        onMarkRead={vi.fn()}
      >
        <button type="button">general</button>
      </TextChannelContextMenu>
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "general" }), { clientX: 40, clientY: 40 });
    expect(screen.getByText("Only @mentions")).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Mute Channel" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "For 1 Hour" }));
    expect(preferences.setMute).toHaveBeenCalledWith(
      { type: "channel", roomId: "room-1", channelId: "general" },
      { kind: "until", expiresAt: 3_601_000 }
    );
    await act(async () => undefined);

    fireEvent.contextMenu(screen.getByRole("button", { name: "general" }), { clientX: 40, clientY: 40 });
    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Notification Settings" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Nothing" }));
    expect(preferences.setMode).toHaveBeenCalledWith({ type: "channel", roomId: "room-1", channelId: "general" }, "none");
    vi.restoreAllMocks();
  });

  it("unmutes a direct override and runs channel management actions", async () => {
    const preferences = controller({ mode: "none", mute: { kind: "indefinite" } });
    const onDuplicate = vi.fn();
    render(
      <TextChannelContextMenu
        canManage
        channel={{ id: "private", name: "private" } as never}
        notificationPreferences={preferences}
        roomId="room-1"
        onCreate={vi.fn()}
        onDuplicate={onDuplicate}
        onMarkRead={vi.fn()}
      >
        <button type="button">private</button>
      </TextChannelContextMenu>
    );
    fireEvent.contextMenu(screen.getByRole("button", { name: "private" }), { clientX: 40, clientY: 40 });
    expect(screen.getByText("Muted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Unmute Channel" }));
    expect(preferences.setMute).toHaveBeenCalledWith({ type: "channel", roomId: "room-1", channelId: "private" }, null);
    await act(async () => undefined);

    fireEvent.contextMenu(screen.getByRole("button", { name: "private" }), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate Channel" }));
    expect(onDuplicate).toHaveBeenCalledOnce();
  });

  it("keeps an unbound voice room in an isolated scope", async () => {
    const preferences = controller({ mute: { kind: "until", expiresAt: 1 } });
    render(
      <VoiceChannelContextMenu
        canManage={false}
        hideNames={false}
        notificationPreferences={preferences}
        room={{ id: "voice-1", name: "Voice" } as never}
        roomId="room-1"
        onCreate={vi.fn()}
        onToggleHideNames={vi.fn()}
      >
        <button type="button">voice</button>
      </VoiceChannelContextMenu>
    );
    fireEvent.contextMenu(screen.getByRole("button", { name: "voice" }), { clientX: 40, clientY: 40 });
    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Notification Settings" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "All Messages" }));
    expect(preferences.setMode).toHaveBeenCalledWith({ type: "channel", roomId: "room-1", channelId: "voice-1" }, "all");
    await act(async () => undefined);
  });
});
