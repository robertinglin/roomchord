import { describe, expect, it, vi } from "vitest";
import { voiceModerationActions } from "./voiceModerationActions";

function room(overrides: Record<string, unknown> = {}) {
  return {
    id: "stage-1",
    name: "Town hall",
    group: null,
    allowsVideo: true,
    locked: false,
    archivedAt: null,
    participantCount: 2,
    kind: "stage",
    participants: {
      mina: { memberId: "mina" },
      robin: { memberId: "robin" }
    },
    stage: { open: true, requests: {}, speakers: {} },
    ...overrides
  };
}

function setup(overrides: Record<string, unknown> = {}) {
  const dispatch = vi.fn().mockResolvedValue(undefined);
  const moderation = {
    mute: vi.fn().mockResolvedValue({ operationType: "media.room.member.mute" }),
    deafen: vi.fn().mockResolvedValue({ operationType: "media.room.member.deafen" }),
    kick: vi.fn().mockResolvedValue({ operationType: "media.room.member.kick" }),
    suppress: vi.fn().mockResolvedValue({ operationType: "media.room.member.suppress" }),
    openStage: vi.fn().mockResolvedValue({ operationType: "media.stage.open" }),
    closeStage: vi.fn().mockResolvedValue({ operationType: "media.stage.close" }),
    requestToSpeak: vi.fn().mockResolvedValue({ operationType: "media.stage.speaker.request" }),
    approveSpeaker: vi.fn().mockResolvedValue({ operationType: "media.stage.speaker.approve" }),
    removeSpeaker: vi.fn().mockResolvedValue({ operationType: "media.stage.speaker.remove" }),
    policy: vi.fn(() => ({ revision: 1, admit: true })),
    subscribe: vi.fn(() => () => undefined),
  };
  const voiceModerationState = {
    relayStatus: "connected" as const,
    pending: false,
    error: undefined as string | undefined,
    begin: vi.fn(),
    end: vi.fn(),
    reportError: vi.fn(),
    clearError: vi.fn()
  };
  const live = {
    actor: { memberId: "mina" },
    can: vi.fn(() => true),
    dispatch,
    media: { available: true, getRelayStatus: vi.fn(() => "connected" as const), moderation },
    ...overrides
  };
  const input = {
    live,
    view: {
      visibleRooms: [room()],
      selectedMediaRoom: room(),
      joinedRoomId: "stage-1"
    }
  };
  return { dispatch, live, moderation, voiceModerationState, handlers: voiceModerationActions({ ...input, voiceModerationState } as never) };
}

describe("authoritative voice moderation actions", () => {
  it("gates member operations to a current projected participant and capability", async () => {
    const { dispatch, handlers, live, moderation } = setup();
    expect(handlers.canMemberAction("stage-1", "robin", "mute")).toBe(true);
    expect(await handlers.memberAction("stage-1", "robin", "mute", true)).toBe(true);
    expect(await handlers.memberAction("stage-1", "robin", "deafen", false)).toBe(true);
    expect(await handlers.memberAction("stage-1", "robin", "suppress", true)).toBe(true);
    expect(await handlers.memberAction("stage-1", "robin", "kick")).toBe(true);
    expect(moderation.mute).toHaveBeenCalledWith({ mediaRoomId: "stage-1", memberId: "robin", enabled: true });
    expect(moderation.deafen).toHaveBeenCalledWith({ mediaRoomId: "stage-1", memberId: "robin", enabled: false });
    expect(moderation.suppress).toHaveBeenCalledWith({ mediaRoomId: "stage-1", memberId: "robin", enabled: true });
    expect(moderation.kick).toHaveBeenCalledWith({ mediaRoomId: "stage-1", memberId: "robin", enabled: true });
    expect(moderation.policy).toHaveBeenCalledWith("stage-1", "robin");
    expect(live.can).toHaveBeenCalledWith("media.room.member.mute");
  });

  it("fails closed for self, missing participants, stale rooms, and denied capabilities", async () => {
    const { dispatch, handlers } = setup({ can: vi.fn(() => false) });
    expect(handlers.canMemberAction("stage-1", "robin", "mute")).toBe(false);
    expect(await handlers.memberAction("stage-1", "robin", "mute")).toBe(false);
    expect(handlers.canMemberAction("stage-1", "mina", "mute")).toBe(false);
    expect(handlers.canMemberAction("stage-1", "missing", "mute")).toBe(false);
    expect(handlers.canMemberAction("other", "robin", "mute")).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches stage lifecycle and speaker operations with target payloads", async () => {
    const { dispatch, handlers, moderation } = setup();
    expect(handlers.canStageAction("stage-1", "open")).toBe(true);
    await handlers.stageAction("stage-1", "open");
    await handlers.stageAction("stage-1", "close");
    await handlers.stageAction("stage-1", "requestSpeaker", "mina");
    await handlers.stageAction("stage-1", "approveSpeaker", "robin");
    await handlers.stageAction("stage-1", "removeSpeaker", "robin");
    expect(moderation.openStage).toHaveBeenCalledWith({ mediaRoomId: "stage-1" });
    expect(moderation.closeStage).toHaveBeenCalledWith({ mediaRoomId: "stage-1" });
    expect(moderation.requestToSpeak).toHaveBeenCalledWith({ mediaRoomId: "stage-1" });
    expect(moderation.approveSpeaker).toHaveBeenCalledWith({ mediaRoomId: "stage-1", memberId: "robin" });
    expect(moderation.removeSpeaker).toHaveBeenCalledWith({ mediaRoomId: "stage-1", memberId: "robin" });
  });

  it("requires an open stage for requests and a projected target for approvals", () => {
    const { handlers } = setup({});
    expect(handlers.canStageAction("stage-1", "requestSpeaker", "robin")).toBe(false);
    expect(handlers.canStageAction("stage-1", "approveSpeaker", "missing")).toBe(false);
    const closed = setup();
    closed.live.can.mockReturnValue(true);
    closed.handlers = voiceModerationActions({
      live: closed.live,
      view: { visibleRooms: [room({ stage: { open: false } })], selectedMediaRoom: room({ stage: { open: false } }), joinedRoomId: "stage-1" }
    } as never);
    expect(closed.handlers.canStageAction("stage-1", "requestSpeaker", "mina")).toBe(false);
    const voiceRoom = setup();
    voiceRoom.handlers = voiceModerationActions({
      live: voiceRoom.live,
      view: { visibleRooms: [room({ kind: "voice" })], selectedMediaRoom: room({ kind: "voice" }), joinedRoomId: "stage-1" }
    } as never);
    expect(voiceRoom.handlers.canStageAction("stage-1", "open")).toBe(false);
  });

  it("fails closed while the relay is reconnecting and reports controller errors", async () => {
    const setupValue = setup();
    const state = {
      relayStatus: "reconnecting" as const,
      pending: false,
      begin: vi.fn(),
      end: vi.fn(),
      reportError: vi.fn(),
      clearError: vi.fn()
    };
    const handlers = voiceModerationActions({
      live: setupValue.live,
      view: { visibleRooms: [room()], selectedMediaRoom: room(), joinedRoomId: "stage-1" },
      voiceModerationState: state
    } as never);
    expect(handlers.canMemberAction("stage-1", "robin", "mute")).toBe(false);
    setupValue.moderation.mute.mockRejectedValueOnce(new Error("relay denied"));
    state.relayStatus = "connected";
    expect(await handlers.memberAction("stage-1", "robin", "mute")).toBe(false);
    expect(state.begin).toHaveBeenCalledTimes(1);
    expect(state.reportError).toHaveBeenCalledWith(expect.objectContaining({ message: "relay denied" }));
    expect(state.end).toHaveBeenCalledTimes(1);
  });

  it("fails closed when relay readiness or media availability is missing", () => {
    const unavailableMedia = setup({ media: { available: false, moderation: setup().moderation } });
    expect(unavailableMedia.handlers.available).toBe(false);
    expect(unavailableMedia.handlers.unavailableReason).toContain("media relay");

    const disconnected = setup();
    disconnected.voiceModerationState.relayStatus = "reconnecting";
    disconnected.handlers = voiceModerationActions({
      live: disconnected.live,
      view: { visibleRooms: [room()], selectedMediaRoom: room(), joinedRoomId: "stage-1" },
      voiceModerationState: disconnected.voiceModerationState
    } as never);
    expect(disconnected.handlers.available).toBe(false);
    expect(disconnected.handlers.canMemberAction("stage-1", "robin", "mute")).toBe(false);

    const errored = setup();
    errored.voiceModerationState.error = "policy refresh failed";
    errored.handlers = voiceModerationActions({
      live: errored.live,
      view: { visibleRooms: [room()], selectedMediaRoom: room(), joinedRoomId: "stage-1" },
      voiceModerationState: errored.voiceModerationState
    } as never);
    expect(errored.handlers.available).toBe(false);
    expect(errored.handlers.unavailableReason).toContain("policy error");

    const pending = setup();
    pending.voiceModerationState.pending = true;
    pending.handlers = voiceModerationActions({
      live: pending.live,
      view: { visibleRooms: [room()], selectedMediaRoom: room(), joinedRoomId: "stage-1" },
      voiceModerationState: pending.voiceModerationState
    } as never);
    expect(pending.handlers.available).toBe(false);
    expect(pending.handlers.unavailableReason).toContain("earlier policy");
  });

  it("fails closed when the projected policy cannot be read", () => {
    const value = setup();
    value.moderation.policy.mockImplementation(() => { throw new Error("policy unavailable"); });
    expect(value.handlers.canMemberAction("stage-1", "robin", "mute")).toBe(false);
  });
});
