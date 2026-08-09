import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultVoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { VoiceRoomView } from "./VoiceRoomView";

function props() {
  const stageAction = vi.fn().mockResolvedValue(true);
  const room = {
    id: "stage-1",
    name: "Town hall",
    group: null,
    allowsVideo: true,
    locked: false,
    archivedAt: null,
    participantCount: 1,
    kind: "stage" as const,
    participants: { mina: { memberId: "mina" } },
    stage: { open: true, requests: {}, speakers: {} }
  };
  return {
    stageAction,
    view: {
      actorId: "mina",
      actorName: "Mina",
      joinedRoomId: "stage-1",
      room,
      sfu: { status: "connected" as const, mediaRoomId: "stage-1", remoteStreams: [] },
      voicePreferences: defaultVoicePreferences(),
      voiceTokens: [],
      voiceModeration: {
        available: false as const,
        unavailableReason: "Voice moderation is unavailable until Matterhorn exposes browser SFU policy refresh.",
        relayStatus: "connected" as const,
        pending: false,
        clearError: vi.fn(),
        canMemberAction: vi.fn(() => false),
        canStageAction: vi.fn((roomId: string, action: string) => roomId === "stage-1" && (action === "close" || action === "requestSpeaker")),
        memberAction: vi.fn().mockResolvedValue(true),
        stageAction
      }
    }
  };
}

describe("VoiceRoomView authoritative stage controls", () => {
  it("renders an explicit unavailable status instead of implying browser SFU enforcement", () => {
    const { view } = props();
    render(<VoiceRoomView {...view} />);
    expect(screen.getByRole("status")).toHaveTextContent("browser SFU policy refresh");
    expect(screen.queryByRole("button", { name: "Close stage" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request to speak" })).not.toBeInTheDocument();
  });

  it("does not render stage controls without the authoritative handler", () => {
    const { view } = props();
    render(<VoiceRoomView {...view} voiceModeration={undefined} />);
    expect(screen.queryByRole("button", { name: "Close stage" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Town hall participants")).toBeInTheDocument();
  });

  it("keeps closed stages unavailable when nobody is joined", () => {
    const { view } = props();
    const closedRoom = { ...view.room, stage: { open: false, requests: {}, speakers: {} } };
    const canStageAction = vi.fn((roomId: string, action: string) => roomId === "stage-1" && action === "open");
    render(<VoiceRoomView {...view} room={closedRoom} joinedRoomId={undefined} voiceModeration={{ ...view.voiceModeration, canStageAction }} />);
    expect(screen.queryByRole("button", { name: "Open stage" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request to speak" })).not.toBeInTheDocument();
  });

  it("keeps ordinary voice rooms free of stage lifecycle controls", () => {
    const { view } = props();
    render(<VoiceRoomView {...view} room={{ ...view.room, kind: "voice" }} showSidebarMenu={false} />);
    expect(screen.queryByRole("button", { name: "Close stage" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request to speak" })).not.toBeInTheDocument();
  });

  it("surfaces relay reconnect and the last authoritative acknowledgement", () => {
    const { view } = props();
    render(<VoiceRoomView {...view} voiceModeration={{
      ...view.voiceModeration,
      available: true,
      relayStatus: "reconnecting",
      lastResult: { operationType: "media.stage.close" },
      clearError: vi.fn()
    }} />);
    expect(screen.getByRole("status")).toHaveTextContent("reconnecting");
    expect(screen.getByRole("status")).not.toHaveTextContent("Stage closed");
  });

  it("invokes stage lifecycle controls and provides a generic acknowledgement label", () => {
    const { view, stageAction } = props();
    const moderation = {
      ...view.voiceModeration,
      available: true,
      relayStatus: "connected" as const,
      lastResult: { operationType: "media.unknown" },
      clearError: vi.fn()
    };
    render(<VoiceRoomView {...view} voiceModeration={moderation} />);
    fireEvent.click(screen.getByRole("button", { name: "Close stage" }));
    fireEvent.click(screen.getByRole("button", { name: "Request to speak" }));
    expect(stageAction).toHaveBeenNthCalledWith(1, "stage-1", "close");
    expect(stageAction).toHaveBeenNthCalledWith(2, "stage-1", "requestSpeaker", "mina");
    expect(screen.getByRole("status")).toHaveTextContent("Voice moderation applied");
  });

  it("surfaces and dismisses an authoritative relay error", () => {
    const { view } = props();
    const clearError = vi.fn();
    render(<VoiceRoomView {...view} voiceModeration={{
      ...view.voiceModeration,
      available: true,
      error: "relay denied",
      clearError
    }} />);
    expect(screen.getByRole("status")).toHaveTextContent("relay denied");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss voice moderation error" }));
    expect(clearError).toHaveBeenCalledTimes(1);
  });

  it("opens the authoritative bound voice-text channel", () => {
    const { view } = props();
    const onOpenVoiceText = vi.fn();
    render(<VoiceRoomView {...view} voiceTextChannel={{ id: "stage-chat", name: "Stage chat" }} onOpenVoiceText={onOpenVoiceText} />);
    fireEvent.click(screen.getByRole("button", { name: "Open text chat for Stage chat" }));
    expect(onOpenVoiceText).toHaveBeenCalledWith("stage-chat");
  });

  it("does not clutter the voice header when no text channel is bound", () => {
    const { view } = props();
    render(<VoiceRoomView {...view} voiceModeration={undefined} voiceTextChannel={null} />);
    expect(screen.queryByText(/No text channel is bound/i)).not.toBeInTheDocument();
  });
});
