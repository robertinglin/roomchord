import { describe, expect, it } from "vitest";
import {
  audioOn,
  cameraOn,
  cameraStream,
  isVoiceParticipantMuted,
  mediaLabel,
  participantGridClass,
  roomParticipants,
  screenShareStream,
  screenOn,
  streamHasTrack
} from "./voiceParticipants";
import type { VoiceParticipant } from "./types";

class TestMediaStream {
  private readonly tracks: MediaStreamTrack[];

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === "video");
  }
}

Object.defineProperty(globalThis, "MediaStream", { configurable: true, value: TestMediaStream });

function room(overrides: Record<string, unknown> = {}) {
  return {
    id: "stage-1",
    name: "Town hall",
    group: null,
    allowsVideo: true,
    locked: false,
    archivedAt: null,
    participantCount: 2,
    kind: "stage" as const,
    participants: {
      mina: { memberId: "mina", muted: false },
      robin: { memberId: "robin", deafened: true, suppressed: true }
    },
    stage: { open: true, requests: { mina: { requestedAt: 1 } }, speakers: { robin: true } },
    ...overrides
  } as never;
}

function sfu(overrides: Record<string, unknown> = {}) {
  return { mediaRoomId: "stage-1", status: "connected", remoteStreams: [], peers: [], remoteScreenStreams: [], ...overrides } as never;
}

function participant(overrides: Partial<VoiceParticipant> = {}): VoiceParticipant {
  return { avatar: "M", id: "robin", memberId: "robin", name: "Robin", ...overrides };
}

describe("projected voice participants", () => {
  it("projects authoritative member moderation and stage state", () => {
    const result = roomParticipants({
      actorAvatar: "A",
      actorId: "mina",
      actorName: "Mina",
      joinedRoomId: "stage-1",
      room: room(),
      sfu: sfu(),
      voicePreferences: { muted: false, deafened: false },
      voiceTokens: []
    });
    const local = result.find((item) => item.memberId === "mina");
    expect(local).toMatchObject({ stageRequest: true, stageSpeaker: false, moderationSuppressed: false });
    expect(isVoiceParticipantMuted({ ...participant(), moderationSuppressed: true })).toBe(true);
  });

  it("does not project kicked members from tokens or active streams", () => {
    const result = roomParticipants({
      actorAvatar: undefined,
      actorId: "mina",
      actorName: "Mina",
      joinedRoomId: "stage-1",
      room: room({ blockedMembers: { robin: { at: 3 } } }),
      sfu: sfu({ remoteStreams: [{ clientId: "robin", name: "Robin" }], peers: [{ clientId: "robin", name: "Robin", phase: "streaming" }] }),
      voicePreferences: { muted: false, deafened: false },
      voiceTokens: [{ id: "token", ownerId: "robin", ownerName: "Robin", scope: "stage-1" }] as never
    });
    expect(result.some((item) => item.memberId === "robin" || item.id === "robin")).toBe(false);
  });

  it("projects token moderation when an active room participant is present", () => {
    const result = roomParticipants({
      actorAvatar: "A",
      actorId: "mina",
      actorName: "Mina",
      joinedRoomId: undefined,
      room: room({ kind: "voice", stage: undefined, participants: { robin: { memberId: "robin", muted: true, deafened: true } } }),
      sfu: sfu(),
      voicePreferences: { muted: false, deafened: false },
      voiceTokens: [{ id: "token", ownerId: "robin", ownerName: "Robin", scope: "stage-1", payload: { voiceStatus: { muted: false } } }] as never
    });
    expect(result).toMatchObject([{ memberId: "robin", muted: true, deafened: true }]);
  });

  it("merges token, SFU stream, peer, and screen projections", () => {
    const result = roomParticipants({
      actorAvatar: undefined,
      actorId: "mina",
      actorName: " ",
      joinedRoomId: "stage-1",
      room: room({ kind: "voice", stage: undefined, participants: { mina: { memberId: "mina" }, robin: { memberId: "robin", muted: true } } }),
      sfu: sfu({
        remoteStreams: [
          { clientId: "robin", name: "Robin", avatar: "R", media: { audio: true }, mediaTracks: [] },
          { clientId: "mina-client", name: "Mina", media: { audio: true }, mediaTracks: [] }
        ],
        peers: [
          { clientId: "waiting", name: "", phase: "connecting" },
          { clientId: "failed", name: "", phase: "failed", error: "lost" }
        ],
        remoteScreenStreams: [{ clientId: "robin", name: "Robin", stream: undefined }]
      }),
      voicePreferences: { muted: false, deafened: false },
      voiceTokens: [
        {
          id: "robin-token",
          ownerId: "robin",
          ownerName: "Robin",
          scope: "stage-1",
          payload: {
            avatar: "token-avatar",
            media: { audio: true, video: false },
            mediaTracks: [],
            screenPreview: { kind: "screen-preview", dataUrl: "data:image/png;base64,abc" },
            voiceStatus: { muted: true, deafened: true }
          }
        },
        { id: "mina-token", ownerId: "mina", ownerName: "Mina", clientId: "mina-client", scope: "stage-1", payload: { screenPreview: { kind: "bad", dataUrl: "not-image" } } },
        { id: "empty-token", ownerName: "", scope: "stage-1", payload: { media: "invalid", mediaTracks: "invalid", voiceStatus: "invalid" } }
      ] as never
    });
    expect(result.length).toBeGreaterThan(3);
    expect(result.find((item) => item.memberId === "robin")).toMatchObject({ avatar: "R", deafened: true });
    expect(result.some((item) => item.id === "waiting" && item.connecting)).toBe(true);
    expect(result.some((item) => item.id === "failed" && item.connecting === false)).toBe(true);
  });
});

describe("voice participant display helpers", () => {
  it("distinguishes declared audio/video state and labels", () => {
    const muted = participant({ media: { audio: false, video: true, screen: true } });
    expect(audioOn(muted)).toBe(false);
    expect(screenOn(muted)).toBe(true);
    expect(mediaLabel(muted)).toBe("Muted · Camera on · Sharing");
    expect(streamHasTrack(undefined, "audio")).toBe(false);
    expect(isVoiceParticipantMuted(participant(), { robin: true })).toBe(true);
  });

  it("uses media track declarations for camera and screen streams", () => {
    const liveVideo = { kind: "video", label: "camera", readyState: "live" } as MediaStreamTrack;
    const secondVideo = { kind: "video", label: "screen", readyState: "live" } as MediaStreamTrack;
    const stream = { getTracks: () => [liveVideo, secondVideo], getVideoTracks: () => [liveVideo, secondVideo] } as unknown as MediaStream;
    const screenOnlyStream = { getTracks: () => [secondVideo], getVideoTracks: () => [secondVideo] } as unknown as MediaStream;
    expect(cameraStream(participant({ stream, media: { video: false, screen: false } }))).toBeTruthy();
    expect(cameraStream(participant({ stream, media: { video: true, screen: false } }))).toBeTruthy();
    expect(cameraStream(participant({ stream: screenOnlyStream, media: { video: false, screen: true } }))).toBeUndefined();
    expect(screenShareStream(participant({ stream, media: { video: true, screen: true } }))).toBeTruthy();
    expect(screenShareStream(participant({ stream, media: { video: false, screen: true } }))).toBeTruthy();
    expect(screenShareStream(participant({ stream, media: { video: true, screen: true } , screenStream: stream }))).toBe(stream);
    expect(cameraOn(participant({ stream }))).toBe(true);
    expect(audioOn(participant({ stream }))).toBe(false);
  });

  it("keeps non-live tracks out of generic stream checks", () => {
    const track = { kind: "audio", readyState: "ended" } as MediaStreamTrack;
    const stream = { getTracks: () => [track], getVideoTracks: () => [] } as unknown as MediaStream;
    expect(streamHasTrack(stream, "audio")).toBe(false);
    expect(cameraStream(participant({ stream, media: {} }))).toBeUndefined();
    expect(screenShareStream(participant({ media: { video: true, screen: true } }))).toBeUndefined();
  });

  it("keeps participant grid classes bounded", () => {
    expect(participantGridClass(0)).toBe("participant-count-1");
    expect(participantGridClass(4)).toBe("participant-count-4");
    expect(participantGridClass(9)).toBe("participant-count-many");
  });
});
