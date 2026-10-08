import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageVoiceTab } from "./ManageVoiceTab";

describe("ManageVoiceTab", () => {
  it("opens a requested voice channel directly in its editor", () => {
    render(
      <ManageVoiceTab
        initialRoomId="voice"
        canManageRooms
        categories={[{ id: "voice-rooms", name: "Voice Rooms", position: 0 }]}
        placements={[{ id: "placement", roomId: "voice", categoryId: "voice-rooms", position: 0 }]}
        roles={[]}
        rooms={[{ id: "voice", name: "Voice", allowsVideo: true, locked: false, archivedAt: null, participantCount: 0 } as never]}
        onArchiveRoom={vi.fn()}
        onCreateRoom={vi.fn()}
        onReorderRoom={vi.fn()}
        onUpdateRoom={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Manage voice channel name" })).toHaveValue("Voice");
    expect(screen.getByRole("checkbox", { name: "Manage allow camera" })).toBeChecked();
  });
});
