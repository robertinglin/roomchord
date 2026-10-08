import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationControlsMenu } from "./NotificationControlsMenu";

function renderMenu(onCopyLink = vi.fn()) {
  render(
    <NotificationControlsMenu
      label="Channel"
      inheritLabel="Use Category Default"
      preferenceUnavailableMessage="Waiting for Matterhorn global preferences."
      onCopyLink={onCopyLink}
    >
      <button type="button">general</button>
    </NotificationControlsMenu>
  );
  fireEvent.contextMenu(screen.getByRole("button", { name: "general" }), { clientX: 40, clientY: 40 });
  return onCopyLink;
}

describe("NotificationControlsMenu", () => {
  it("opens Discord-style notification and mute submenus", () => {
    renderMenu();

    expect(screen.getByRole("menu", { name: "Channel actions" })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Notification Settings" }));
    expect(screen.getByRole("menuitemradio", { name: "Use Category Default" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Only @mentions" })).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Mute Channel" }));
    expect(screen.getByRole("menuitem", { name: "For 1 Hour" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Until I Turn It Back On" })).toBeInTheDocument();
  });

  it("saves notification modes through the authoritative preference callback", async () => {
    const onNotificationModeChange = vi.fn().mockResolvedValue(undefined);
    render(
      <NotificationControlsMenu
        label="Channel"
        inheritLabel="Use Category Default"
        notificationMode="mentions"
        onNotificationModeChange={onNotificationModeChange}
        preferenceUnavailableMessage="Waiting for Matterhorn global preferences."
      >
        <button type="button">general</button>
      </NotificationControlsMenu>
    );
    fireEvent.contextMenu(screen.getByRole("button", { name: "general" }), { clientX: 40, clientY: 40 });
    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Notification Settings" }));
    expect(screen.getByRole("menuitemradio", { name: "Only @mentions" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Nothing" }));

    expect(onNotificationModeChange).toHaveBeenCalledWith("none");
    await waitFor(() => expect(screen.queryByRole("menu", { name: "Channel actions" })).not.toBeInTheDocument());
  });

  it("saves mute durations and exposes unmute when active", async () => {
    const onMuteChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <NotificationControlsMenu label="Channel" inheritLabel="Use Category Default" onMuteChange={onMuteChange} preferenceUnavailableMessage="Unavailable">
        <button type="button">general</button>
      </NotificationControlsMenu>
    );
    fireEvent.contextMenu(screen.getByRole("button", { name: "general" }), { clientX: 40, clientY: 40 });
    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Mute Channel" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Until I Turn It Back On" }));
    expect(onMuteChange).toHaveBeenCalledWith({ kind: "indefinite" });
    await waitFor(() => expect(screen.queryByRole("menu", { name: "Channel actions" })).not.toBeInTheDocument());

    rerender(
      <NotificationControlsMenu label="Channel" inheritLabel="Use Category Default" muted onMuteChange={onMuteChange} preferenceUnavailableMessage="Unavailable">
        <button type="button">general</button>
      </NotificationControlsMenu>
    );
    fireEvent.contextMenu(screen.getByRole("button", { name: "general" }), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Unmute Channel" }));
    expect(onMuteChange).toHaveBeenLastCalledWith(null);
  });

  it("runs available context actions immediately", () => {
    const onCopyLink = renderMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy Link" }));

    expect(onCopyLink).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu", { name: "Channel actions" })).not.toBeInTheDocument();
  });

  it("closes from the keyboard and positions submenus on narrow screens", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    renderMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Notification Settings" }));
    expect(screen.getByRole("menu", { name: "Channel notification settings" })).toHaveStyle({ left: "8px" });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Channel actions" })).not.toBeInTheDocument();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });

  it("runs real base actions and identifies unsupported settings", () => {
    const onSelect = vi.fn();
    render(
      <NotificationControlsMenu
        label="Channel"
        inheritLabel="Use Category Default"
        preferenceUnavailableMessage="Waiting for global preferences."
        beforeActions={[
          { id: "real", label: "Mark As Read", onSelect },
          { id: "stub", label: "Pin Channel to Top", unavailableMessage: "Pinning is not available yet." },
          { id: "checked", label: "Hide Names", checked: true, onSelect }
        ]}
      >
        <button type="button">general</button>
      </NotificationControlsMenu>
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "general" }), { clientX: 40, clientY: 40 });
    expect(screen.getByRole("menuitemcheckbox", { name: "Hide Names" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Mark As Read" }));
    expect(onSelect).toHaveBeenCalledOnce();

    fireEvent.contextMenu(screen.getByRole("button", { name: "general" }), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin Channel to Top" }));
    expect(screen.getByRole("status")).toHaveTextContent("Pinning is not available yet.");
  });
});
