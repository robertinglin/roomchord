import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultVoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { VoiceParticipant } from "@features/voice-room/model/types";
import { VoiceParticipantGrid } from "./VoiceParticipantGrid";

const remote: VoiceParticipant = {
  avatar: "R",
  id: "robin-client",
  memberId: "robin",
  name: "Robin"
};

describe("VoiceParticipantGrid authoritative moderation menu", () => {
  it("does not expose operations while browser SFU enforcement is unavailable", () => {
    const voiceModeration = {
      available: false as const,
      unavailableReason: "Voice moderation is unavailable until Matterhorn exposes browser SFU policy refresh.",
      relayStatus: "connected" as const,
      pending: false,
      clearError: vi.fn(),
      canMemberAction: vi.fn(() => true),
      canStageAction: vi.fn(() => true),
      memberAction: vi.fn(),
      stageAction: vi.fn()
    };
    const onToggle = vi.fn();
    render(
      <VoiceParticipantGrid
        actorId="mina"
        onToggleVoiceParticipantMute={onToggle}
        participants={[remote]}
        roomId="stage-1"
        roomName="Town hall"
        voiceModeration={voiceModeration}
        voicePreferences={defaultVoicePreferences()}
      />
    );
    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    expect(screen.getByRole("menuitem", { name: "Mute" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Kick from voice" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Mute" }));
    expect(onToggle).toHaveBeenCalledWith("robin-client");
  });

  it("does not offer a local mute fallback when authority denies every operation", () => {
    render(
      <VoiceParticipantGrid
        actorId="mina"
        onToggleVoiceParticipantMute={vi.fn()}
        participants={[remote]}
        roomId="stage-1"
        roomName="Town hall"
        voiceModeration={{ available: true, relayStatus: "connected", pending: false, clearError: vi.fn(), canMemberAction: vi.fn(() => false), canStageAction: vi.fn(() => false), memberAction: vi.fn(), stageAction: vi.fn() }}
        voicePreferences={defaultVoicePreferences()}
      />
    );
    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    expect(screen.queryByRole("menuitem", { name: "Mute" })).not.toBeInTheDocument();
  });

  it("renders and dispatches the complete authoritative member and stage menu", () => {
    const memberAction = vi.fn();
    const stageAction = vi.fn();
    const voiceModeration = {
      available: true,
      relayStatus: "connected" as const,
      pending: false,
      clearError: vi.fn(),
      canMemberAction: vi.fn(() => true),
      canStageAction: vi.fn(() => true),
      memberAction,
      stageAction
    };
    render(
      <VoiceParticipantGrid
        actorId="mina"
        participants={[remote]}
        roomId="stage-1"
        roomName="Town hall"
        voiceModeration={voiceModeration}
        voicePreferences={defaultVoicePreferences()}
      />
    );
    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    expect(screen.getByRole("menuitem", { name: "Mute" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Deafen" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Suppress speaker" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Kick from voice" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Approve speaker" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Remove speaker" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Mute" }));
    expect(memberAction).toHaveBeenCalledWith("stage-1", "robin", "mute", true);
  });

  it("renders local and remote screen-share tiles with watch and preview paths", () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    const onWatch = vi.fn();
    render(
      <VoiceParticipantGrid
        actorId="mina"
        participants={[{ ...remote, isLocal: false }, { id: "mina-client", name: "Mina", avatar: "M", isLocal: true }]}
        roomId="voice-1"
        roomName="Lounge"
        voicePreferences={defaultVoicePreferences()}
        inlinedShares={[
          { participant: remote, preview: { kind: "screen-preview", dataUrl: "data:image/png;base64,abc", capturedAt: 1 }, stream },
          { participant: { id: "mina-client", name: "Mina", avatar: "M", isLocal: true }, preview: undefined, stream }
        ]}
        onWatchScreenShare={onWatch}
      />
    );
    expect(screen.getByLabelText("Robin screen share preview")).toBeInTheDocument();
    expect(screen.getByText("Your screen")).toBeInTheDocument();
  });

  it("renders empty and participant state badges, then uses the supported local mute fallback", () => {
    const onToggle = vi.fn();
    const onDirectMessage = vi.fn();
    const audioTrack = { kind: "audio", readyState: "live" } as MediaStreamTrack;
    const stream = {
      getTracks: () => [audioTrack],
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => []
    } as unknown as MediaStream;
    const { rerender } = render(
      <VoiceParticipantGrid
        actorId="mina"
        participants={[]}
        roomId="voice-1"
        roomName="Lounge"
        voicePreferences={defaultVoicePreferences()}
      />
    );
    expect(screen.getByText("No one is in this room")).toBeInTheDocument();

    rerender(
      <VoiceParticipantGrid
        actorId="mina"
        onDirectMessage={onDirectMessage}
        onToggleVoiceParticipantMute={onToggle}
        mutedVoiceParticipantIds={{ robin: true }}
        participants={[{ ...remote, connecting: true, deafened: true, stream }]}
        roomId="voice-1"
        roomName="Lounge"
        voicePreferences={defaultVoicePreferences()}
      />
    );
    expect(screen.getByLabelText("Connecting")).toBeInTheDocument();
    expect(screen.getByLabelText("Muted")).toBeInTheDocument();
    expect(screen.getByLabelText("Deafened")).toBeInTheDocument();

    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Send DM" }));
    expect(onDirectMessage).toHaveBeenCalledWith("robin");

    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Unmute" }));
    expect(onToggle).toHaveBeenCalledWith("robin-client");
  });

  it("uses authoritative inverse actions for already-muted, deafened, and suppressed members", () => {
    const memberAction = vi.fn();
    const stageAction = vi.fn();
    const voiceModeration = {
      available: true as const,
      relayStatus: "connected" as const,
      pending: false,
      clearError: vi.fn(),
      canMemberAction: vi.fn(() => true),
      canStageAction: vi.fn((room: string, action: string) => action === "approveSpeaker"),
      memberAction,
      stageAction
    };
    render(
      <VoiceParticipantGrid
        actorId="mina"
        participants={[{ ...remote, muted: true, deafened: true, moderationSuppressed: true }]}
        roomId="stage-1"
        roomName="Stage"
        voiceModeration={voiceModeration}
        voicePreferences={defaultVoicePreferences()}
      />
    );
    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Clear mute" }));
    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Clear deafen" }));
    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Allow speaker" }));
    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kick from voice" }));
    fireEvent.contextMenu(screen.getByLabelText("Robin participant").firstElementChild!, { clientX: 20, clientY: 20 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Approve speaker" }));

    expect(memberAction).toHaveBeenNthCalledWith(1, "stage-1", "robin", "mute", false);
    expect(memberAction).toHaveBeenNthCalledWith(2, "stage-1", "robin", "deafen", false);
    expect(memberAction).toHaveBeenNthCalledWith(3, "stage-1", "robin", "suppress", false);
    expect(memberAction).toHaveBeenNthCalledWith(4, "stage-1", "robin", "kick", true);
    expect(stageAction).toHaveBeenCalledWith("stage-1", "approveSpeaker", "robin");
  });

  it("renders missing remote previews and local placeholder shares, and watches a remote share", () => {
    const onWatch = vi.fn();
    render(
      <VoiceParticipantGrid
        actorId="mina"
        participants={[remote, { id: "mina-client", name: "Mina", avatar: "M", isLocal: true }]}
        roomId="voice-1"
        roomName="Lounge"
        voicePreferences={defaultVoicePreferences()}
        inlinedShares={[
          { participant: remote, preview: undefined },
          { participant: { id: "mina-client", name: "Mina", avatar: "M", isLocal: true }, preview: undefined }
        ]}
        onWatchScreenShare={onWatch}
      />
    );
    expect(screen.getByLabelText("Robin screen share preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Your screen share preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Watch Robin screen share" }));
    expect(onWatch).toHaveBeenCalledWith("robin-client");
  });
});
