import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeshRoomCallController } from "roomkit-sdk/browser/meshRoomCalls";
import { SfuCallController } from "roomkit-sdk/browser/sfuCalls";
import { markMediaTrackRole } from "roomkit-sdk/browser/mediaCapture";
import { getDirectMessageThreads } from "roomkit-sdk/browser/directMessages";
import { ChatApp } from "@pages/chat/ui/ChatPage";
import { MarkdownMessage } from "@features/messages/ui/MarkdownMessage";
import { UserControls } from "@features/user-controls/ui/UserControls";
import { VoiceRoomView } from "@features/voice-room/ui/VoiceRoomView";
import { mountRoomKitChat } from "@app/roomkitChat";
import { defaultVoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { channelMessages } from "@entities/chat/model/state";
import type { ChatState } from "@entities/chat/model/types";

const state: ChatState = {
  channels: [{ id: "general", name: "general", topic: "Room coordination" }],
  messages: { m1: { id: "m1", channelId: "general", authorName: "Mina", authorId: "mina", body: "Welcome to the live chat app", reactions: {}, pinnedAt: null, deletedAt: null, createdAt: 1 } },
  directThreads: { dm_alice__lee: { id: "dm_alice__lee", protocol: "nostr.nip17", userIds: ["alice", "lee"] } },
  directMessages: { dm_msg_1: { id: "dm_msg_1", protocol: "nostr.nip17", threadId: "dm_alice__lee", body: "Private hello", authorName: "Lee", authorId: "lee", reactions: {}, createdAt: 2 } },
  rooms: [{ id: "media1", name: "Launch Room", allowsVideo: true, participants: {} }],
  screenShares: {},
  members: {
    alice: { id: "alice", memberId: "alice", displayName: "Alice", role: "admin" },
    lee: { id: "lee", memberId: "lee", displayName: "Lee", role: "member" }
  },
  presence: {
    alice: { memberId: "alice", name: "Alice", status: "online", activity: "testing", updatedAt: 1 },
    lee: { memberId: "lee", name: "Lee", status: "online", activity: "available", updatedAt: 1 }
  },
  activity: [],
  commentThreads: {},
  comments: {},
  embeds: {},
  reactions: {}
};

class FakeMediaStreamTrack {
  enabled = true;
  readyState = "live";
  contentHint = "";
  label: string;
  constructor(public kind: "audio" | "video", public id = `${kind}-${Math.random()}`) {
    this.label = id;
  }
  stop() {
    this.readyState = "ended";
  }
}

class FakeMediaStream {
  private tracks: FakeMediaStreamTrack[];
  constructor(tracks: FakeMediaStreamTrack[] = []) {
    this.tracks = [...tracks];
  }
  addTrack(track: FakeMediaStreamTrack) {
    this.tracks.push(track);
  }
  removeTrack(track: FakeMediaStreamTrack) {
    this.tracks = this.tracks.filter((item) => item !== track);
  }
  getTracks() {
    return [...this.tracks];
  }
  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio");
  }
  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === "video");
  }
}

const sdkDefaultAudioConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  channelCount: 1,
  sampleRate: 48000
};

const sdkRawVoiceTestAudioConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
  sampleRate: 48000
};

const testAppMetadata = {
  composition: {
    actions: [
      { name: "channelCreate", type: "channel.create", authorize: { roles: ["admin"] } },
      { name: "mediaRoomCreate", type: "media.room.create", authorize: { roles: ["moderator"] } },
      { name: "messagePin", type: "message.pin", authorize: { roles: ["moderator"] } },
      { name: "roleCreate", type: "role.create", authorize: { roles: ["admin"] } }
    ]
  }
};

const fakeMediaRecorders: FakeMediaRecorder[] = [];

class FakeMediaRecorder {
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onerror: (() => void) | null = null;
  onstop: (() => void) | null = null;
  state: RecordingState = "inactive";
  mimeType = "audio/webm";

  constructor(public stream: MediaStream) {
    fakeMediaRecorders.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice-test"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

class FakeAudioNode {
  connect(_node: unknown) {
    return _node;
  }
  disconnect() {
    return undefined;
  }
}

class FakeAudioBufferSourceNode extends FakeAudioNode {
  buffer: unknown;
  loop = false;
  started = false;
  stopped = false;
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeMediaStreamAudioDestinationNode extends FakeAudioNode {
  stream = new FakeMediaStream([new FakeMediaStreamTrack("audio", "processed-playback")]);
}

class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = "running";
  decodeAudioData(data: ArrayBuffer, success?: DecodeSuccessCallback) {
    const buffer = { duration: Math.max(0.01, data.byteLength / 48000) } as AudioBuffer;
    if (success) {
      success(buffer);
      return undefined as unknown as Promise<AudioBuffer>;
    }
    return Promise.resolve(buffer);
  }
  createBufferSource() {
    return new FakeAudioBufferSourceNode();
  }
  createMediaStreamDestination() {
    return new FakeMediaStreamAudioDestinationNode();
  }
  createMediaStreamSource(stream: MediaStream) {
    const node = new FakeAudioNode() as FakeAudioNode & { stream: MediaStream };
    node.stream = stream;
    return node;
  }
  createGain() {
    const gain = {
      value: 1,
      cancelScheduledValues: vi.fn(),
      setTargetAtTime: vi.fn((value: number) => {
        gain.value = value;
        return value;
      })
    };
    return Object.assign(new FakeAudioNode(), { gain });
  }
  createAnalyser() {
    return Object.assign(new FakeAudioNode(), {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: 32,
      getByteTimeDomainData: (samples: Uint8Array) => samples.fill(128)
    });
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

function installMediaCapture() {
  vi.stubGlobal("MediaStream", FakeMediaStream);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("webkitAudioContext", FakeAudioContext);
  fakeMediaRecorders.length = 0;
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  Object.defineProperty(window.URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:voice-test") });
  Object.defineProperty(window.URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => new FakeMediaStream(
    constraints.video ? [new FakeMediaStreamTrack("video")] : [new FakeMediaStreamTrack("audio")]
  ));
  const getDisplayMedia = vi.fn(async () => new FakeMediaStream([new FakeMediaStreamTrack("video", "screen")]));
  Object.defineProperty(window.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, getDisplayMedia }
  });
  return getUserMedia;
}

function renderChat(
  sendOperation?: ReturnType<typeof vi.fn>,
  initialState: ChatState = state,
  actor = { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" },
  hostOverrides: Record<string, unknown> = {}
) {
  const sender = sendOperation || vi.fn(async (operation) => ({ ok: true, state: initialState, operation }));
  window.ROOMKIT_CHORD_HOST = { appMetadata: testAppMetadata, getAppMetadata: () => testAppMetadata, getState: vi.fn(async () => initialState), sendOperation: sender, ...hostOverrides } as any;
  return { ...render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor }} />), sendOperation: sender };
}

async function memberRailAvatar(name: string, label: string) {
  const memberRow = await screen.findByRole("button", { name: label });
  return within(memberRow).getByLabelText(`${name} avatar`);
}

function stateWithMessage(body: string): ChatState {
  return {
    ...state,
    messages: {
      ...state.messages,
      m1: { ...state.messages.m1, body }
    }
  };
}

describe("ChatApp", () => {
  it("filters direct messages by the default lane or a topic regex", () => {
    const dmState: ChatState = {
      ...state,
      directThreads: {
        ...state.directThreads,
        dm_groups_launch: { id: "dm_groups_launch", protocol: "nostr.nip17", userIds: ["alice", "lee"], topicKey: "groups.launch" }
      },
      directMessages: {
        ...state.directMessages,
        dm_msg_group: { id: "dm_msg_group", protocol: "nostr.nip17", threadId: "dm_groups_launch", body: "Group note", authorId: "lee", reactions: {}, createdAt: 3 }
      }
    };

    expect(getDirectMessageThreads(dmState).map((group) => group.thread.id)).toEqual(["dm_alice__lee"]);
    expect(getDirectMessageThreads(dmState, /^groups\./).map((group) => group.thread.id)).toEqual(["dm_groups_launch"]);
  });

  it("renders a real backend-connected team chat surface", async () => {
    renderChat();
    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Chord/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Channels" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Text Channels" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Voice Channels" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#general" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Launch Room" })).toBeInTheDocument();
    expect(screen.queryByText(/joined ·/)).not.toBeInTheDocument();
    expect(screen.queryByText("No one joined")).not.toBeInTheDocument();
    const dmSection = screen.getByRole("region", { name: "DMs" });
    expect(within(dmSection).getByRole("button", { name: "Lee, 1 unread DM" })).toBeInTheDocument();
    expect(within(dmSection).getByLabelText("Lee avatar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Online - 2" })).toBeInTheDocument();
  });

  it("uses the generic injected RoomKit bridge when the Chord alias is missing", async () => {
    const sender = vi.fn(async (operation) => ({ ok: true, state, operation }));
    window.ROOMKIT_HOST = { getState: vi.fn(async () => state), sendOperation: sender } as any;

    render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }} />);

    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(window.ROOMKIT_CHORD_HOST).toBe(window.ROOMKIT_HOST);
  });

  it("renders connected voice members without channel metadata", async () => {
    const user = userEvent.setup();
    const voiceTokens = [{
      id: "voice_tiret",
      kind: "media-room.join",
      scope: "media1",
      ownerId: "tiret",
      ownerName: "tiret_bas",
      clientId: "client_tiret",
      payload: { avatar: "T" },
      updatedAt: 1,
      expiresAt: Date.now() + 1000
    }];
    renderChat(undefined, state, { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" }, {
      getMediaPeer: vi.fn(() => undefined),
      sendPeerSignal: vi.fn(() => true),
      subscribeRelayMessage: vi.fn(() => () => undefined),
      getEphemeralTokens: vi.fn(() => voiceTokens),
      subscribeEphemeralTokens: vi.fn((listener: (tokens: typeof voiceTokens) => void) => {
        listener(voiceTokens);
        return () => undefined;
      })
    });

    expect(await screen.findByRole("button", { name: "Join Launch Room" })).toBeInTheDocument();
    expect(screen.queryByText(/camera allowed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/can join/)).not.toBeInTheDocument();
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    const memberList = screen.getByRole("list", { name: "Connected users in Launch Room" });
    const voiceAvatar = within(memberList).getByLabelText("tiret_bas avatar");
    expect(voiceAvatar).toBeInTheDocument();
    expect(within(memberList).getByText("tiret_bas")).toBeInTheDocument();

    fireEvent.contextMenu(voiceAvatar, { clientX: 80, clientY: 90 });
    expect(await screen.findByRole("menuitem", { name: "Send DM" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Mute" }));

    fireEvent.contextMenu(voiceAvatar, { clientX: 80, clientY: 90 });
    expect(await screen.findByRole("menuitem", { name: "Unmute" })).toBeInTheDocument();
  });

  it("adds text and voice channels from their sidebar group plus buttons", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));

    await user.click(await screen.findByRole("button", { name: "Add text channel to General" }));
    await user.type(screen.getByLabelText("New text channel name in General"), "launch");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Add voice channel to General" }));
    await user.type(screen.getByLabelText("New voice channel name in General"), "Standup");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[0]).toMatchObject({ type: "channelCreate", schemaAction: "channelCreate", payload: { name: "launch", group: "General" } });
    expect(sent[1]).toMatchObject({ type: "mediaRoomCreate", schemaAction: "mediaRoomCreate", payload: { name: "Standup", group: "General", allowsVideo: true } });
  });

  it("collapses text and voice channel groups", async () => {
    const user = userEvent.setup();
    const groupedState: ChatState = {
      ...state,
      channels: [{ id: "general", name: "general", topic: "Room coordination", group: "Ops" }],
      rooms: [{ id: "media1", name: "Launch Room", group: "Launch", allowsVideo: true, participants: {} }]
    };
    renderChat(undefined, groupedState);

    expect(await screen.findByRole("button", { name: "#general" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Launch Room" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ops" }));
    expect(screen.queryByRole("button", { name: "#general" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Launch" }));
    expect(screen.queryByRole("button", { name: "Join Launch Room" })).not.toBeInTheDocument();
  });

  it("renders provider embed URLs as inline players", () => {
    const { container } = render(
      <MarkdownMessage body={"Watch https://youtu.be/dQw4w9WgXcQ\n\nListen https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"} />
    );

    const frames = container.querySelectorAll("iframe.embed-frame");
    expect(frames).toHaveLength(2);
    expect(frames[0]).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(frames[1]).toHaveAttribute("src", "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
    expect(container.querySelector(".embed-thumb")).not.toBeInTheDocument();
    expect(container.querySelector(".embed-caption")).not.toBeInTheDocument();
    expect(container.querySelector(".embed-provider-tab")).not.toBeInTheDocument();
    expect(Array.from(container.querySelectorAll(".embed-link-provider")).map((tab) => tab.textContent)).toEqual(["YouTube", "Spotify"]);
    expect(frames[1].closest(".message-embed")).toHaveClass("message-embed-spotify");
    expect(screen.getByRole("button", { name: "View YouTube video fullscreen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Spotify .* fullscreen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open YouTube video/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://youtu.be/dQw4w9WgXcQ" })).toHaveAttribute("href", "https://youtu.be/dQw4w9WgXcQ");
  });

  it("opens eligible embeds in a shrouded fullscreen dialog", async () => {
    const user = userEvent.setup();
    render(
      <MarkdownMessage
        body={[
          "Watch https://youtu.be/dQw4w9WgXcQ",
          "Spec https://drive.google.com/file/d/abc123/view",
          "Listen https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"
        ].join("\n\n")}
      />
    );

    const youtubeButton = screen.getByRole("button", { name: "View YouTube video fullscreen" });
    const driveButton = screen.getByRole("button", { name: "View Google Drive file fullscreen" });
    expect(screen.queryByRole("button", { name: /Spotify .* fullscreen/i })).not.toBeInTheDocument();

    await user.click(youtubeButton);
    const youtubeDialog = screen.getByRole("dialog", { name: "Fullscreen YouTube video" });
    expect(within(youtubeDialog).getByTitle("YouTube video")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(within(youtubeDialog).queryByRole("link", { name: "Open YouTube video" })).not.toBeInTheDocument();
    await user.click(within(youtubeDialog).getByRole("button", { name: "Close YouTube video fullscreen" }));
    expect(screen.queryByRole("dialog", { name: "Fullscreen YouTube video" })).not.toBeInTheDocument();

    await user.click(driveButton);
    const driveDialog = screen.getByRole("dialog", { name: "Fullscreen Google Drive file" });
    expect(within(driveDialog).getByTitle("Google Drive file")).toHaveAttribute("src", "https://drive.google.com/file/d/abc123/preview");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Fullscreen Google Drive file" })).not.toBeInTheDocument();
  });

  it("renders direct media URLs with native inline controls", () => {
    const { container } = render(
      <MarkdownMessage body={"Image https://cdn.example.test/photo.webp\n\nMovie https://cdn.example.test/movie.mp4\n\nAudio https://cdn.example.test/audio.mp3"} />
    );

    expect(container.querySelectorAll(".message-embed-inline")).toHaveLength(3);
    expect(container.querySelector("img.embed-media")).toHaveAttribute("src", "https://cdn.example.test/photo.webp");
    expect(container.querySelector("video.embed-media")).toHaveAttribute("src", "https://cdn.example.test/movie.mp4");
    expect(container.querySelector("audio.embed-audio")).toHaveAttribute("src", "https://cdn.example.test/audio.mp3");
  });

  it("renders a single emoji-only message with large emoji styling", () => {
    const { rerender } = render(<MarkdownMessage body=" 😀 " />);

    expect(screen.getByText("😀")).toHaveClass("message-body-emoji");

    rerender(<MarkdownMessage body="😀 launch" />);
    expect(screen.getByText("😀 launch")).not.toHaveClass("message-body-emoji");
  });

  it("groups offline members outside the online count", async () => {
    renderChat(undefined, {
      ...state,
      presence: {
        ...state.presence,
        lee: { memberId: "lee", name: "Lee", status: "online", activity: "available", updatedAt: 1, visible: false }
      }
    });

    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Online - 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Offline - 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lee, offline" })).toBeInTheDocument();
  });

  it("renders the current actor when runtime state omits room members", async () => {
    renderChat(undefined, {
      ...state,
      members: undefined as unknown as ChatState["members"],
      presence: {}
    }, {
      memberId: "guest_7418786f86302cc5630b166c",
      deviceId: "dev_guest",
      role: "guest",
      displayName: "Guest"
    });

    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Online - 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guest (you)" })).toBeInTheDocument();
  });

  it("does not restart state loading when default launch metadata is used", async () => {
    const getState = vi.fn(async () => state);
    window.ROOMKIT_CHORD_HOST = {
      getState,
      sendOperation: vi.fn(async (operation) => ({ ok: true, state, operation }))
    } as any;

    render(<ChatApp />);

    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getState).toHaveBeenCalledTimes(1);
  });

  it("keeps the subscription snapshot when initial getState resolves later", async () => {
    const subscribedState = stateWithMessage("Subscription snapshot");
    const staleState = stateWithMessage("Stale getState snapshot");
    let resolveGetState: ((value: ChatState) => void) | undefined;
    const getState = vi.fn(() => new Promise<ChatState>((resolve) => {
      resolveGetState = resolve;
    }));
    window.ROOMKIT_CHORD_HOST = {
      getState,
      sendOperation: vi.fn(async (operation) => ({ ok: true, state: subscribedState, operation })),
      subscribe(listener: (next: ChatState) => void) {
        listener(subscribedState);
        return vi.fn();
      }
    } as any;

    render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }} />);

    expect(await screen.findByText("Subscription snapshot")).toBeInTheDocument();
    await waitFor(() => expect(getState).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveGetState?.(staleState);
      await Promise.resolve();
    });

    expect(screen.getByText("Subscription snapshot")).toBeInTheDocument();
    expect(screen.queryByText("Stale getState snapshot")).not.toBeInTheDocument();
  });

  it("marks launcher-provided initial state as connected immediately", () => {
    render(<ChatApp
      envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }}
      initialState={state}
    />);

    expect(screen.getByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.getByText("connected")).toBeInTheDocument();
  });

  it("injects styles through the launcher mount path", async () => {
    window.ROOMKIT_CHORD_HOST = { getState: vi.fn(async () => state), sendOperation: vi.fn(async (operation) => ({ ok: true, state, operation })) } as any;
    const target = document.createElement("div");
    document.body.appendChild(target);
    let unmount = () => {};
    await act(async () => {
      unmount = mountRoomKitChat(target, { envelope: { room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } } });
    });

    try {
      expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Chord/ })).toBeInTheDocument();
      expect(document.getElementById("roomkit-chord-styles")?.textContent).toContain(".chat-shell");
    } finally {
      await act(async () => unmount());
      target.remove();
    }
  });

  it("commits channel, message, and status operations without storing voice join in app state", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    const { sendOperation } = renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));

    await user.click(await screen.findByRole("button", { name: "Manage" }));
    const manageDialog = await screen.findByRole("dialog", { name: "Manage" });
    await user.click(within(manageDialog).getByRole("button", { name: "Channels" }));
    await user.type(within(manageDialog).getByLabelText("Channel name"), "launch");
    await user.click(within(manageDialog).getByRole("button", { name: "Create channel" }));
    await user.click(within(manageDialog).getByRole("button", { name: "Close management" }));
    await user.type(screen.getByLabelText("Message # general"), "Ship it");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(screen.getByRole("button", { name: "Join Launch Room" }));
    expect(screen.getByLabelText("Voice controls")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn camera on" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open status menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Set busy" }));

    await waitFor(() => expect(sendOperation).toHaveBeenCalledTimes(3));
    expect(sent.map((op) => op.schemaAction)).toEqual(["channelCreate", "messageSend", "presenceUpdate"]);
  });

  it("submits channel messages with Enter and keeps Shift+Enter as a newline", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    const originalScrollHeight = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "scrollHeight");
    Object.defineProperty(window.HTMLTextAreaElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return (this as HTMLTextAreaElement).value.includes("\n") ? 72 : 40;
      }
    });

    try {
      renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));

      const composer = await screen.findByLabelText("Message # general");
      const sendButton = screen.getByRole("button", { name: "Send message" });
      expect(sendButton).toHaveClass("composer-send-button");
      expect(sendButton.textContent).toBe("");
      expect(screen.getByRole("button", { name: "Add emoji" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Insert link" }));
      await waitFor(() => expect(composer).toHaveValue("[link](https://)"));
      await user.clear(composer);

      await user.click(composer);
      await user.keyboard("Line one{Shift>}{Enter}{/Shift}Line two");

      expect(composer).toHaveValue("Line one\nLine two");
      await waitFor(() => expect(composer).toHaveStyle({ height: "72px" }));
      expect(sent).toHaveLength(0);

      await user.keyboard("{Enter}");

      await waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0]).toMatchObject({ type: "messageSend", schemaAction: "messageSend", payload: { channelId: "general", body: "Line one\nLine two" } });
      expect(composer).toHaveValue("");
    } finally {
      if (originalScrollHeight) {
        Object.defineProperty(window.HTMLTextAreaElement.prototype, "scrollHeight", originalScrollHeight);
      } else {
        delete (window.HTMLTextAreaElement.prototype as any).scrollHeight;
      }
    }
  });

  it("claims an SDK ephemeral token for voice join when the injected bridge supports it", async () => {
    const user = userEvent.setup();
    const getUserMedia = installMediaCapture();
    const mediaPeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn() };
    const sendOperation = vi.fn(async (operation) => ({ ok: true, state, operation }));
    const claimEphemeralToken = vi.fn(() => ({
      id: "voice-token",
      update: vi.fn(),
      release: vi.fn(),
      token: vi.fn()
    }));
    window.ROOMKIT_CHORD_HOST = {
      getState: vi.fn(async () => state),
      sendOperation,
      getMediaPeer: vi.fn(() => mediaPeer),
      getMediaPeerAddress: vi.fn(() => "peerjs:peer-alice"),
      getRelaySfuInfo: vi.fn(() => ({ enabled: false })),
      sendPeerSignal: vi.fn(() => true),
      subscribeRelayMessage: vi.fn(() => vi.fn()),
      claimEphemeralToken,
      getEphemeralTokens: vi.fn(() => []),
      subscribeEphemeralTokens: vi.fn(() => vi.fn())
    } as any;

    render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }} />);
    await user.click(await screen.findByRole("button", { name: "Join Launch Room" }));

    await waitFor(() => expect(claimEphemeralToken).toHaveBeenCalled());
    expect(getUserMedia).toHaveBeenCalledWith({ audio: sdkDefaultAudioConstraints, video: false });
    expect(screen.getByText("Voice connected")).toBeInTheDocument();
    expect(screen.queryByText("Group calling is not available on this relay.")).not.toBeInTheDocument();
    expect(claimEphemeralToken).toHaveBeenCalledWith(expect.objectContaining({
      kind: "media-room.join",
      scope: "media1",
      payload: expect.objectContaining({
        roomId: "media1",
        media: expect.objectContaining({ audio: true, video: false }),
        transport: "mesh",
        clientId: "alice",
        peerId: "peer-alice",
        peerAddress: "peerjs:peer-alice",
        callPubkey: expect.any(String)
      })
    }));
    expect(sendOperation).not.toHaveBeenCalledWith(expect.objectContaining({ schemaAction: "mediaRoomJoin" }));
  });

  it("opens the voice room participant view without restarting the active stream", async () => {
    const user = userEvent.setup();
    const getUserMedia = installMediaCapture();
    const mediaPeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn() };
    window.ROOMKIT_CHORD_HOST = {
      getState: vi.fn(async () => state),
      sendOperation: vi.fn(async (operation) => ({ ok: true, state, operation })),
      getMediaPeer: vi.fn(() => mediaPeer),
      getMediaPeerAddress: vi.fn(() => "peerjs:peer-alice"),
      getRelaySfuInfo: vi.fn(() => ({ enabled: false })),
      sendPeerSignal: vi.fn(() => true),
      subscribeRelayMessage: vi.fn(() => vi.fn()),
      claimEphemeralToken: vi.fn(() => ({ id: "voice-token", update: vi.fn(), release: vi.fn(), token: vi.fn() })),
      getEphemeralTokens: vi.fn(() => []),
      subscribeEphemeralTokens: vi.fn(() => vi.fn())
    } as any;

    render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }} />);
    await user.click(await screen.findByRole("button", { name: "Join Launch Room" }));

    expect(await screen.findByRole("heading", { name: "Launch Room" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Voice connected")).toBeInTheDocument());
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Join Launch Room" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: "Launch Room" })).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("renders camera video in the selected voice room grid", async () => {
    const user = userEvent.setup();
    installMediaCapture();
    const mediaPeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn() };
    window.ROOMKIT_CHORD_HOST = {
      getState: vi.fn(async () => state),
      sendOperation: vi.fn(async (operation) => ({ ok: true, state, operation })),
      getMediaPeer: vi.fn(() => mediaPeer),
      getMediaPeerAddress: vi.fn(() => "peerjs:peer-alice"),
      getRelaySfuInfo: vi.fn(() => ({ enabled: false })),
      sendPeerSignal: vi.fn(() => true),
      subscribeRelayMessage: vi.fn(() => vi.fn()),
      claimEphemeralToken: vi.fn(() => ({ id: "voice-token", update: vi.fn(), release: vi.fn(), token: vi.fn() })),
      getEphemeralTokens: vi.fn(() => []),
      subscribeEphemeralTokens: vi.fn(() => vi.fn())
    } as any;

    render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }} />);
    await user.click(await screen.findByRole("button", { name: "Join Launch Room" }));
    await user.click(await screen.findByRole("button", { name: "Turn camera on" }));

    expect(await screen.findByLabelText("Your room video")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Voice controls")).queryByLabelText("Your room video")).not.toBeInTheDocument();
  });

  it("keeps the local video stream when the local voice token is in the participant list", () => {
    installMediaCapture();
    const localStream = new FakeMediaStream([new FakeMediaStreamTrack("audio"), new FakeMediaStreamTrack("video")]) as unknown as MediaStream;

    render(
      <VoiceRoomView
        actorId="alice"
        actorName="Alice"
        joinedRoomId="media1"
        localMedia={{ audio: true, video: true }}
        room={state.rooms[0]}
        sfu={{ status: "connected", mediaRoomId: "media1", media: { audio: true, video: true }, localStream, remoteStreams: [] }}
        voicePreferences={defaultVoicePreferences()}
        voiceTokens={[{
          id: "voice-token",
          kind: "media-room.join",
          scope: "media1",
          ownerId: "alice",
          ownerName: "Alice",
          clientId: "alice",
          payload: { roomId: "media1", media: { audio: true, video: true } },
          updatedAt: 1,
          expiresAt: 2
        }]}
      />
    );

    expect(screen.getByLabelText("Your room video")).toBeInTheDocument();
  });

  it("shows a local screen share beside the local participant tile", () => {
    installMediaCapture();
    const cameraTrack = new FakeMediaStreamTrack("video", "camera");
    const screenTrack = new FakeMediaStreamTrack("video", "screen");
    markMediaTrackRole(cameraTrack as unknown as MediaStreamTrack, "camera");
    markMediaTrackRole(screenTrack as unknown as MediaStreamTrack, "screen");
    const localStream = new FakeMediaStream([
      new FakeMediaStreamTrack("audio"),
      screenTrack,
      cameraTrack
    ]) as unknown as MediaStream;

    render(
      <VoiceRoomView
        actorId="alice"
        actorName="Alice"
        joinedRoomId="media1"
        localMedia={{ audio: true, video: true, screen: true }}
        room={state.rooms[0]}
        sfu={{ status: "connected", mediaRoomId: "media1", media: { audio: true, video: true, screen: true }, localStream, remoteStreams: [] }}
        voicePreferences={defaultVoicePreferences()}
        voiceTokens={[]}
      />
    );

    expect(screen.getByLabelText("Alice participant")).toBeInTheDocument();
    expect(screen.getByLabelText("Your room video")).toBeInTheDocument();
    expect(screen.getByLabelText("Your screen share")).toBeInTheDocument();
    expect(screen.getByLabelText("Mic on · Camera on · Sharing")).toBeInTheDocument();
    expect(((screen.getByLabelText("Your room video") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks().map((track) => track.id)).toEqual(["camera"]);
    expect(((screen.getByLabelText("Your screen share") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks().map((track) => track.id)).toEqual(["screen"]);
  });

  it("shows remote screen shares as blurred previews until the user watches them", async () => {
    installMediaCapture();
    const user = userEvent.setup();
    const watchScreenShare = vi.fn();
    const stopWatchingScreenShare = vi.fn();
    const cameraTrack = new FakeMediaStreamTrack("video", "camera");
    const screenTrack = new FakeMediaStreamTrack("video", "screen");
    const remoteStream = new FakeMediaStream([
      new FakeMediaStreamTrack("audio"),
      cameraTrack
    ]) as unknown as MediaStream;
    const remoteScreenStream = new FakeMediaStream([
      screenTrack
    ]) as unknown as MediaStream;
    const previewDataUrl = "data:image/jpeg;base64,cHJldmlldw==";

    render(
      <VoiceRoomView
        actorId="alice"
        actorName="Alice"
        room={state.rooms[0]}
        sfu={{
          status: "connected",
          mediaRoomId: "media1",
          media: { audio: true, video: false },
          remoteStreams: [{
            clientId: "bob",
            name: "Bob",
            avatar: "B",
            media: { audio: true, video: true, screen: true },
            mediaTracks: [{ id: "camera", index: 0, kind: "video", role: "camera" }],
            stream: remoteStream
          }],
          remoteScreenStreams: [{
            clientId: "bob",
            name: "Bob",
            avatar: "B",
            media: { audio: false, video: false, screen: true },
            stream: remoteScreenStream
          }]
        }}
        voicePreferences={defaultVoicePreferences()}
        voiceTokens={[{
          id: "voice-token-bob",
          kind: "media-room.join",
          scope: "media1",
          ownerId: "bob",
          ownerName: "Bob",
          clientId: "bob",
          payload: {
            roomId: "media1",
            media: { audio: true, video: true, screen: true },
            screenPreview: { kind: "screen-preview", dataUrl: previewDataUrl, mimeType: "image/jpeg", width: 160, height: 90, capturedAt: 1 }
          },
          updatedAt: 1,
          expiresAt: 2
        }]}
        onStopWatchingScreenShare={stopWatchingScreenShare}
        onWatchScreenShare={watchScreenShare}
      />
    );

    expect(screen.getByLabelText("Bob participant")).toBeInTheDocument();
    expect(screen.getByLabelText("Bob room audio")).toBeInTheDocument();
    expect(screen.getByLabelText("Bob room video")).toBeInTheDocument();
    expect(screen.getByLabelText("Bob screen share preview")).toHaveAttribute("src", previewDataUrl);
    expect(screen.queryByLabelText("Bob screen share")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Watch Bob screen share" }));

    expect(watchScreenShare).toHaveBeenCalledWith("bob");
    expect(screen.getByLabelText("Bob participant")).toBeInTheDocument();
    expect(screen.getByLabelText("Bob screen share")).toBeInTheDocument();
    expect(screen.queryByLabelText("Bob screen share preview")).not.toBeInTheDocument();
    expect(((screen.getByLabelText("Bob room video") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks().map((track) => track.id)).toEqual(["camera"]);
    expect(((screen.getByLabelText("Bob screen share") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks().map((track) => track.id)).toEqual(["screen"]);

    await user.click(screen.getByRole("button", { name: "Stop watching Bob screen share" }));

    expect(stopWatchingScreenShare).toHaveBeenCalledWith("bob");
    expect(screen.getByLabelText("Bob participant")).toBeInTheDocument();
    expect(screen.getByLabelText("Bob screen share preview")).toBeInTheDocument();
  });

  it("uses remote media state to clear stale video tracks from participant tiles", () => {
    installMediaCapture();
    const remoteStream = new FakeMediaStream([new FakeMediaStreamTrack("audio"), new FakeMediaStreamTrack("video")]) as unknown as MediaStream;

    render(
      <VoiceRoomView
        actorId="alice"
        actorName="Alice"
        room={state.rooms[0]}
        sfu={{
          status: "connected",
          mediaRoomId: "media1",
          media: { audio: true, video: false },
          remoteStreams: [{
            clientId: "bob",
            name: "Bob",
            avatar: "B",
            media: { audio: true, video: false },
            stream: remoteStream
          }]
        }}
        voicePreferences={defaultVoicePreferences()}
        voiceTokens={[{
          id: "voice-token-bob",
          kind: "media-room.join",
          scope: "media1",
          ownerId: "bob",
          ownerName: "Bob",
          clientId: "bob",
          payload: { roomId: "media1", media: { audio: true, video: true } },
          updatedAt: 1,
          expiresAt: 2
        }]}
      />
    );

    expect(screen.queryByLabelText("Bob room video")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Bob room audio")).toBeInTheDocument();
    expect(screen.getByLabelText("Mic on · Camera off")).toBeInTheDocument();
  });

  it("keeps voice connected when selecting a text channel", async () => {
    const user = userEvent.setup();
    const getUserMedia = installMediaCapture();
    const mediaPeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn() };
    window.ROOMKIT_CHORD_HOST = {
      getState: vi.fn(async () => state),
      sendOperation: vi.fn(async (operation) => ({ ok: true, state, operation })),
      getMediaPeer: vi.fn(() => mediaPeer),
      getMediaPeerAddress: vi.fn(() => "peerjs:peer-alice"),
      getRelaySfuInfo: vi.fn(() => ({ enabled: false })),
      sendPeerSignal: vi.fn(() => true),
      subscribeRelayMessage: vi.fn(() => vi.fn()),
      claimEphemeralToken: vi.fn(() => ({ id: "voice-token", update: vi.fn(), release: vi.fn(), token: vi.fn() })),
      getEphemeralTokens: vi.fn(() => []),
      subscribeEphemeralTokens: vi.fn(() => vi.fn())
    } as any;

    render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }} />);
    await user.click(await screen.findByRole("button", { name: "Join Launch Room" }));
    await waitFor(() => expect(screen.getByText("Voice connected")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "#general" }));

    expect(screen.getByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.getByLabelText("Voice controls")).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("moves the active call when selecting a different voice room", async () => {
    const user = userEvent.setup();
    const getUserMedia = installMediaCapture();
    const mediaPeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn() };
    const releases: Array<ReturnType<typeof vi.fn>> = [];
    const twoRoomState = {
      ...state,
      rooms: [
        state.rooms[0],
        { id: "media2", name: "Standup", allowsVideo: false, participants: {} }
      ]
    };
    window.ROOMKIT_CHORD_HOST = {
      getState: vi.fn(async () => twoRoomState),
      sendOperation: vi.fn(async (operation) => ({ ok: true, state: twoRoomState, operation })),
      getMediaPeer: vi.fn(() => mediaPeer),
      getMediaPeerAddress: vi.fn(() => "peerjs:peer-alice"),
      getRelaySfuInfo: vi.fn(() => ({ enabled: false })),
      sendPeerSignal: vi.fn(() => true),
      subscribeRelayMessage: vi.fn(() => vi.fn()),
      claimEphemeralToken: vi.fn(() => {
        const release = vi.fn();
        releases.push(release);
        return { id: `voice-token-${releases.length}`, update: vi.fn(), release, token: vi.fn() };
      }),
      getEphemeralTokens: vi.fn(() => []),
      subscribeEphemeralTokens: vi.fn(() => vi.fn())
    } as any;

    render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }} />);
    await user.click(await screen.findByRole("button", { name: "Join Launch Room" }));
    await waitFor(() => expect(releases).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: "Join Standup" }));

    expect(await screen.findByRole("heading", { name: "Standup" })).toBeInTheDocument();
    await waitFor(() => expect(releases).toHaveLength(2));
    expect(releases[0]).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Voice controls")).toHaveTextContent("Standup");
  });

  // it("keeps SFU room audio sender alive while settings suspend audio", async () => {
  //   installMediaCapture();
  //   const states: any[] = [];
  //   const mediaPeer = {
  //     id: "peer-alice",
  //     open: true,
  //     on: vi.fn(),
  //     call: vi.fn((_peerId: string, _stream: MediaStream) => ({
  //       peer: "relay-sfu",
  //       peerConnection: { getSenders: vi.fn(() => []) },
  //       on: vi.fn(),
  //       close: vi.fn()
  //     }))
  //   };
  //   const controller = new SfuCallController({
  //     roomName: "chat",
  //     profile: { id: "alice", name: "Alice", avatar: "A" },
  //     getPeer: () => mediaPeer as any,
  //     sendSignal(targetClientId, targetPeerId, signal, auth) {
  //       return true;
  //     },
  //     onState(state) {
  //       states.push(state);
  //     },
  //     onError: vi.fn()
  //   });

  //   controller.setRelaySfu({ enabled: true, peerId: "relay-sfu" });
  //   controller.start({ audio: true, video: false }, "media1");
  //   await waitFor(() => expect(mediaPeer.call).toHaveBeenCalledTimes(1));
  //   const stream = mediaPeer.call.mock.calls[0][1] as MediaStream;
  //   const track = stream.getAudioTracks()[0];
  //   expect(track.enabled).toBe(true);

  //   controller.updateMedia({ audio: false, video: false });
  //   await waitFor(() => expect(states[states.length - 1]?.media?.audio).toBe(false));
  //   expect(track.enabled).toBe(false);

  //   controller.updateMedia({ audio: true, video: false });
  //   await waitFor(() => expect(states[states.length - 1]?.media?.audio).toBe(true));

  //   expect(mediaPeer.call).toHaveBeenCalledTimes(1);
  //   expect(track.enabled).toBe(true);
  //   controller.destroy();
  // });

  it("accepts a mesh room media request before the sender token is locally visible", async () => {
    installMediaCapture();
    const alicePeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn() };
    const bobPeer = { id: "peer-bob", open: true, on: vi.fn(), call: vi.fn() };
    const sentToBob: unknown[] = [];
    const sentFromBob: unknown[] = [];
    const alice = new MeshRoomCallController({
      roomName: "chat",
      profile: { id: "alice", name: "Alice", avatar: "A" },
      getPeer: () => alicePeer as any,
      getPeerAddress: () => "peerjs:peer-alice",
      sendSignal(targetClientId, targetPeerId, signal, auth) {
        sentToBob.push({ type: "client/peer-signal", roomName: "chat", targetClientId, targetPeerId, sourceClientId: "alice", sourcePeerId: "peer-alice", signal, auth });
        return true;
      },
      onError: vi.fn()
    });
    const bobStates: string[] = [];
    const bob = new MeshRoomCallController({
      roomName: "chat",
      profile: { id: "bob", name: "Bob", avatar: "B" },
      getPeer: () => bobPeer as any,
      getPeerAddress: () => "peerjs:peer-bob",
      sendSignal(targetClientId, targetPeerId, signal, auth) {
        sentFromBob.push({ type: "client/peer-signal", roomName: "chat", targetClientId, targetPeerId, sourceClientId: "bob", sourcePeerId: "peer-bob", signal, auth });
        return true;
      },
      onState(state) {
        bobStates.push(state.status);
      },
      onError: vi.fn()
    });

    bob.start({ audio: true, video: false }, "media1");
    await waitFor(() => expect(bobStates).toContain("connected"));
    alice.setParticipants([{
      clientId: "bob",
      roomId: "media1",
      name: "Bob",
      avatar: "B",
      peerId: "peer-bob",
      peerAddress: "peerjs:peer-bob",
      callPubkey: bob.callPubkey(),
      media: { audio: true, video: false }
    }]);
    alice.start({ audio: true, video: false }, "media1");

    await waitFor(() => expect(sentToBob.some((message: any) => message.signal?.type === "call.request")).toBe(true));
    const request = sentToBob.find((message: any) => message.signal?.type === "call.request");
    bob.handlePeerSignal(request);

    await waitFor(() => expect(sentFromBob.some((message: any) => message.signal?.type === "call.accept")).toBe(true));
    alice.destroy();
    bob.destroy();
  });

  // it("keeps mesh room audio sender alive while settings suspend audio", async () => {
  //   installMediaCapture();
  //   const aliceMediaCall = { peerConnection: { getSenders: vi.fn(() => []) }, on: vi.fn(), close: vi.fn() };
  //   const alicePeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn((_peerId: string, _stream: MediaStream) => aliceMediaCall) };
  //   const bobPeer = { id: "peer-bob", open: true, on: vi.fn(), call: vi.fn() };
  //   const sentToBob: any[] = [];
  //   const sentFromBob: any[] = [];
  //   const bobStates: string[] = [];
  //   const alice = new MeshRoomCallController({
  //     roomName: "chat",
  //     profile: { id: "alice", name: "Alice", avatar: "A" },
  //     getPeer: () => alicePeer as any,
  //     getPeerAddress: () => "peerjs:peer-alice",
  //     sendSignal(targetClientId, targetPeerId, signal, auth) {
  //       sentToBob.push({ type: "client/peer-signal", roomName: "chat", targetClientId, targetPeerId, sourceClientId: "alice", sourcePeerId: "peer-alice", signal, auth });
  //       return true;
  //     },
  //     onError: vi.fn()
  //   });
  //   const bob = new MeshRoomCallController({
  //     roomName: "chat",
  //     profile: { id: "bob", name: "Bob", avatar: "B" },
  //     getPeer: () => bobPeer as any,
  //     getPeerAddress: () => "peerjs:peer-bob",
  //     sendSignal(targetClientId, targetPeerId, signal, auth) {
  //       sentFromBob.push({ type: "client/peer-signal", roomName: "chat", targetClientId, targetPeerId, sourceClientId: "bob", sourcePeerId: "peer-bob", signal, auth });
  //       return true;
  //     },
  //     onState(state) {
  //       bobStates.push(state.status);
  //     },
  //     onError: vi.fn()
  //   });

  //   bob.start({ audio: true, video: false }, "media1");
  //   await waitFor(() => expect(bobStates).toContain("connected"));
  //   alice.setParticipants([{
  //     clientId: "bob",
  //     roomId: "media1",
  //     name: "Bob",
  //     avatar: "B",
  //     peerId: "peer-bob",
  //     peerAddress: "peerjs:peer-bob",
  //     callPubkey: bob.callPubkey(),
  //     media: { audio: true, video: false }
  //   }]);
  //   alice.start({ audio: true, video: false }, "media1");

  //   await waitFor(() => expect(sentToBob.some((message) => message.signal?.type === "call.request")).toBe(true));
  //   bob.handlePeerSignal(sentToBob.find((message) => message.signal?.type === "call.request"));
  //   await waitFor(() => expect(sentFromBob.some((message) => message.signal?.type === "call.accept")).toBe(true));
  //   alice.handlePeerSignal(sentFromBob.find((message) => message.signal?.type === "call.accept"));
  //   await waitFor(() => expect(alicePeer.call).toHaveBeenCalledTimes(1));
  //   const stream = alicePeer.call.mock.calls[0][1] as MediaStream;
  //   const track = stream.getAudioTracks()[0];
  //   expect(track.enabled).toBe(true);

  //   alice.updateMedia({ audio: false, video: false });
  //   await waitFor(() => expect(sentToBob.some((message) => message.signal?.type === "call.media" && message.signal.media.audio === false)).toBe(true));
  //   expect(track.enabled).toBe(false);

  //   const requestCount = sentToBob.filter((message) => message.signal?.type === "call.request").length;
  //   alice.updateMedia({ audio: true, video: false });
  //   await waitFor(() => expect(sentToBob.some((message) => message.signal?.type === "call.media" && message.signal.media.audio === true)).toBe(true));

  //   expect(sentToBob.filter((message) => message.signal?.type === "call.request")).toHaveLength(requestCount);
  //   expect(sentToBob.some((message) => message.signal?.type === "call.end")).toBe(false);
  //   expect(alicePeer.call).toHaveBeenCalledTimes(1);
  //   expect(track.enabled).toBe(true);
  //   alice.destroy();
  //   bob.destroy();
  // });

  it("keeps mesh screen sharing out of the participant media stream", async () => {
    installMediaCapture();
    const aliceMediaCall = { peerConnection: { getSenders: vi.fn(() => []) }, on: vi.fn(), close: vi.fn() };
    const alicePeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn((_peerId: string, _stream: MediaStream) => aliceMediaCall) };
    const bobPeer = { id: "peer-bob", open: true, on: vi.fn(), call: vi.fn() };
    const sentToBob: unknown[] = [];
    const sentFromBob: unknown[] = [];
    const bobStates: string[] = [];
    const alice = new MeshRoomCallController({
      roomName: "chat",
      profile: { id: "alice", name: "Alice", avatar: "A" },
      getPeer: () => alicePeer as any,
      getPeerAddress: () => "peerjs:peer-alice",
      sendSignal(targetClientId, targetPeerId, signal, auth) {
        sentToBob.push({ type: "client/peer-signal", roomName: "chat", targetClientId, targetPeerId, sourceClientId: "alice", sourcePeerId: "peer-alice", signal, auth });
        return true;
      },
      onError: vi.fn()
    });
    const bob = new MeshRoomCallController({
      roomName: "chat",
      profile: { id: "bob", name: "Bob", avatar: "B" },
      getPeer: () => bobPeer as any,
      getPeerAddress: () => "peerjs:peer-bob",
      sendSignal(targetClientId, targetPeerId, signal, auth) {
        sentFromBob.push({ type: "client/peer-signal", roomName: "chat", targetClientId, targetPeerId, sourceClientId: "bob", sourcePeerId: "peer-bob", signal, auth });
        return true;
      },
      onState(state) {
        bobStates.push(state.status);
      },
      onError: vi.fn()
    });

    bob.start({ audio: true, video: false }, "media1");
    await waitFor(() => expect(bobStates).toContain("connected"));
    alice.setParticipants([{
      clientId: "bob",
      roomId: "media1",
      name: "Bob",
      avatar: "B",
      peerId: "peer-bob",
      peerAddress: "peerjs:peer-bob",
      callPubkey: bob.callPubkey(),
      media: { audio: true, video: false }
    }]);
    alice.start({ audio: true, video: true, screen: true }, "media1");

    await waitFor(() => expect(sentToBob.some((message: any) => message.signal?.type === "call.request")).toBe(true));
    bob.handlePeerSignal(sentToBob.find((message: any) => message.signal?.type === "call.request"));
    await waitFor(() => expect(sentFromBob.some((message: any) => message.signal?.type === "call.accept")).toBe(true));
    alice.handlePeerSignal(sentFromBob.find((message: any) => message.signal?.type === "call.accept"));
    await waitFor(() => expect(alicePeer.call).toHaveBeenCalled());

    const stream = alicePeer.call.mock.calls[0][1];
    expect(stream.getVideoTracks().map((track) => track.id)).not.toContain("screen");
    expect(stream.getVideoTracks()).toHaveLength(1);
    alice.destroy();
    bob.destroy();
  });

  it("starts mesh screen watching from the latest participant token metadata", async () => {
    installMediaCapture();
    const aliceMediaCall = { peerConnection: { getSenders: vi.fn(() => []) }, on: vi.fn(), close: vi.fn() };
    const alicePeer = { id: "peer-alice", open: true, on: vi.fn(), call: vi.fn(() => aliceMediaCall) };
    const bobPeer = { id: "peer-bob", open: true, on: vi.fn(), call: vi.fn() };
    const sentToBob: unknown[] = [];
    const sentFromBob: unknown[] = [];
    const alice = new MeshRoomCallController({
      roomName: "chat",
      profile: { id: "alice", name: "Alice", avatar: "A" },
      getPeer: () => alicePeer as any,
      getPeerAddress: () => "peerjs:peer-alice",
      sendSignal(targetClientId, targetPeerId, signal, auth) {
        sentToBob.push({ type: "client/peer-signal", roomName: "chat", targetClientId, targetPeerId, sourceClientId: "alice", sourcePeerId: "peer-alice", signal, auth });
        return true;
      },
      onError: vi.fn()
    });
    const bob = new MeshRoomCallController({
      roomName: "chat",
      profile: { id: "bob", name: "Bob", avatar: "B" },
      getPeer: () => bobPeer as any,
      getPeerAddress: () => "peerjs:peer-bob",
      sendSignal(targetClientId, targetPeerId, signal, auth) {
        sentFromBob.push({ type: "client/peer-signal", roomName: "chat", targetClientId, targetPeerId, sourceClientId: "bob", sourcePeerId: "peer-bob", signal, auth });
        return true;
      },
      onError: vi.fn()
    });

    bob.start({ audio: true, video: false }, "media1");
    alice.setParticipants([{
      clientId: "bob",
      roomId: "media1",
      name: "Bob",
      avatar: "B",
      peerId: "peer-bob",
      peerAddress: "peerjs:peer-bob",
      callPubkey: bob.callPubkey(),
      media: { audio: true, video: false }
    }]);
    alice.start({ audio: true, video: false }, "media1");

    await waitFor(() => expect(sentToBob.some((message: any) => message.signal?.type === "call.request")).toBe(true));
    bob.handlePeerSignal(sentToBob.find((message: any) => message.signal?.type === "call.request"));
    await waitFor(() => expect(sentFromBob.some((message: any) => message.signal?.type === "call.accept")).toBe(true));
    alice.handlePeerSignal(sentFromBob.find((message: any) => message.signal?.type === "call.accept"));
    await waitFor(() => expect(alicePeer.call).toHaveBeenCalledTimes(1));

    alice.setParticipants([{
      clientId: "bob",
      roomId: "media1",
      name: "Bob",
      avatar: "B",
      peerId: "peer-bob",
      peerAddress: "peerjs:peer-bob",
      callPubkey: bob.callPubkey(),
      media: { audio: true, video: false, screen: true }
    }]);
    alice.watchScreen("bob");

    await waitFor(() => expect(alicePeer.call).toHaveBeenCalledTimes(2));
    const screenCall = alicePeer.call.mock.calls[1] as unknown as [string, MediaStream, { metadata: { RoomKitMeshScreen: unknown } }];
    expect(screenCall[2].metadata.RoomKitMeshScreen).toMatchObject({
      roomName: "chat",
      mediaRoomId: "media1",
      sourceClientId: "alice",
      targetClientId: "bob"
    });
    alice.destroy();
    bob.destroy();
  });

  it("uses member display names for message authors without stored author names", async () => {
    renderChat(undefined, {
      ...state,
      messages: {
        m1: { ...state.messages.m1, authorName: undefined, authorId: "lee" }
      }
    });

    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.getByLabelText("Actions for Lee")).toBeInTheDocument();
    expect(screen.queryByText("lee")).not.toBeInTheDocument();
  });

  it("uses emoji avatars when members do not have profile images", async () => {
    renderChat(undefined, {
      ...state,
      messages: {
        m1: { ...state.messages.m1, authorName: undefined, authorId: "lee" }
      },
      members: {
        ...state.members,
        lee: { ...state.members.lee, avatar: "🚀" }
      }
    });

    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Lee avatar").some((avatar) => avatar.textContent === "🚀")).toBe(true);
  });

  it("keeps middle deleted channel messages as tombstones and hides trailing deletes", () => {
    const projected = channelMessages({
      ...state,
      messages: {
        old_deleted: { ...state.messages.m1, id: "old_deleted", body: "", deletedAt: 4, createdAt: 1 },
        current: { ...state.messages.m1, id: "current", body: "Still visible", deletedAt: null, createdAt: 2 },
        trailing_deleted: { ...state.messages.m1, id: "trailing_deleted", body: "", deletedAt: 5, createdAt: 3 }
      }
    }, "general");

    expect(projected.map((message) => message.id)).toEqual(["old_deleted", "current"]);
    expect(projected[0].deletedAt).toBe(4);
  });

  it("renders channel tombstones without exposing deleted message content", async () => {
    renderChat(undefined, {
      ...state,
      messages: {
        old_deleted: { ...state.messages.m1, id: "old_deleted", body: "", deletedAt: 4, createdAt: 1 },
        current: { ...state.messages.m1, id: "current", body: "Still visible", deletedAt: null, createdAt: 2 }
      }
    });

    expect(await screen.findByText("Message deleted")).toBeInTheDocument();
    expect(screen.getByText("Still visible")).toBeInTheDocument();
  });

  it("shows message edit only to the author and delete to authors or admins", async () => {
    const user = userEvent.setup();
    renderChat();

    await user.click(await screen.findByRole("button", { name: "More actions for message from Mina" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("lets member authors edit and delete their own messages in the menu", async () => {
    const user = userEvent.setup();
    renderChat(undefined, {
      ...state,
      messages: {
        m1: { ...state.messages.m1, authorName: "Alice", authorId: "alice" }
      }
    }, { memberId: "alice", deviceId: "dev", role: "member", displayName: "Alice" });

    await user.click(await screen.findByRole("button", { name: "More actions for message from Alice" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Pin" })).not.toBeInTheDocument();
  });

  it("duplicates pinned messages and lets moderators unpin them", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    const pinnedState: ChatState = {
      ...state,
      messages: {
        m1: { ...state.messages.m1, body: "Pinned update", pinnedAt: 10, pinnedBy: "alice", createdAt: 1 },
        m2: { id: "m2", channelId: "general", authorName: "Lee", authorId: "lee", body: "Later update", reactions: {}, pinnedAt: null, deletedAt: null, createdAt: 2 }
      }
    };
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state: pinnedState, operation }; }), pinnedState);

    expect(await screen.findAllByText("Pinned update")).toHaveLength(2);
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".message-list .message-row"));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Pinned update");
    expect(rows[0]).toHaveClass("pinned");
    expect(rows[0]).not.toHaveAttribute("id");
    expect(rows[1]).toHaveTextContent("Pinned update");
    expect(rows[1]).toHaveClass("pinned");
    expect(rows[1]).toHaveAttribute("id", "message-m1");
    expect(rows[2]).toHaveTextContent("Later update");

    await user.click(within(rows[0]).getByRole("button", { name: "More actions for message from Mina" }));
    await user.click(within(rows[0]).getByRole("menuitem", { name: "Unpin" }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ type: "messageUnpin", schemaAction: "messageUnpin", payload: { messageId: "m1" } });
  });

  it("previews the target message while composing a reply", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));

    await user.click(await screen.findByRole("button", { name: "Reply to message from Mina" }));
    const replyBar = screen.getByText("Replying to Mina").closest(".replying-bar");
    expect(replyBar).toBeTruthy();
    expect(within(replyBar as HTMLElement).getByText("Welcome to the live chat app")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Message # general"), "Agreed");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ type: "messageReply", schemaAction: "messageReply", payload: { channelId: "general", replyToId: "m1", body: "Agreed" } });
  });

  it("renders reply previews as hard links to the source message", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/room/roomkit-chord-6?secret=invite-secret";
    try {
      renderChat(undefined, {
        ...state,
        messages: {
          ...state.messages,
          m2: {
            id: "m2",
            channelId: "general",
            authorName: "Alice",
            authorId: "alice",
            body: "Agreed",
            replyToId: "m1",
            reactions: {},
            pinnedAt: null,
            deletedAt: null,
            createdAt: 2
          }
        }
      });

      const preview = await screen.findByRole("link", { name: "Replying to Mina: Welcome to the live chat app" });
      expect(preview).toHaveAttribute("href", "#/room/roomkit-chord-6?messageId=m1");
      expect(screen.getByRole("link", { name: "Link to message from Mina" })).toHaveAttribute("href", "#/room/roomkit-chord-6?messageId=m1");

      await user.click(preview);
      expect(window.location.hash).toBe("#/room/roomkit-chord-6?messageId=m1");
      expect(document.getElementById("message-m1")).toBeInTheDocument();
    } finally {
      window.location.hash = "";
    }
  });

  it("opens a channel message from its hard link hash", async () => {
    window.location.hash = "#/room/roomkit-chord-6?messageId=r1";
    try {
      renderChat(undefined, {
        ...state,
        channels: [
          ...state.channels,
          { id: "random", name: "random", topic: "Overflow" }
        ],
        messages: {
          ...state.messages,
          r1: {
            id: "r1",
            channelId: "random",
            authorName: "Lee",
            authorId: "lee",
            body: "Random update",
            reactions: {},
            pinnedAt: null,
            deletedAt: null,
            createdAt: 2
          }
        }
      });

      expect(await screen.findByText("Random update")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "# random" })).toBeInTheDocument();
    } finally {
      window.location.hash = "";
    }
  });

  it("does not replay the same hard link after manual channel navigation", async () => {
    const user = userEvent.setup();
    const linkedState = {
      ...state,
      channels: [
        ...state.channels,
        { id: "random", name: "random", topic: "Overflow" }
      ],
      messages: {
        ...state.messages,
        r1: {
          id: "r1",
          channelId: "random",
          authorName: "Lee",
          authorId: "lee",
          body: "Random update",
          reactions: {},
          pinnedAt: null,
          deletedAt: null,
          createdAt: 2
        }
      }
    };
    const sent: any[] = [];
    window.location.hash = "#/room/roomkit-chord-6?messageId=r1";
    try {
      renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state: linkedState, operation }; }), linkedState);

      expect(await screen.findByText("Random update")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "#general" }));
      expect(screen.getByRole("heading", { name: "# general" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "React with 😂" }));
      await waitFor(() => expect(sent.some((op) => op.schemaAction === "messageReact")).toBe(true));
      expect(screen.getByRole("heading", { name: "# general" })).toBeInTheDocument();
    } finally {
      window.location.hash = "";
    }
  });

  it("opens the SDK emoji picker for reactions and stores recent reactions", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));

    await user.click(await screen.findByRole("button", { name: "Choose reaction for message from Mina" }));
    await user.type(screen.getByLabelText("Search emoji"), "grinning face");
    await user.click(await screen.findByRole("button", { name: "grinning face" }));

    await waitFor(() => expect(sent.some((op) => op.schemaAction === "messageReact" && op.payload.emoji === "😀")).toBe(true));
    expect(JSON.parse(window.localStorage.getItem("roomkit:chord:recent-reactions:v1") || "[]").slice(0, 3)).toEqual(["😀", "👍", "😂"]);
    expect(screen.getByRole("button", { name: "React with 😀" })).toBeInTheDocument();
  });

  it("keeps quick reaction order stable when using an already visible emoji", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));

    await user.click(await screen.findByRole("button", { name: "React with 😂" }));

    await waitFor(() => expect(sent.some((op) => op.schemaAction === "messageReact" && op.payload.emoji === "😂")).toBe(true));
    expect(JSON.parse(window.localStorage.getItem("roomkit:chord:recent-reactions:v1") || "[]")).toEqual(["👍", "😂", "❤️"]);
  });

  it("forwards messages to other channels and direct messages", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    const twoChannelState = {
      ...state,
      channels: [
        ...state.channels,
        { id: "random", name: "random", topic: "Overflow" }
      ]
    };
    renderChat(
      vi.fn(async (operation) => { sent.push(operation); return { ok: true, state: twoChannelState, operation }; }),
      twoChannelState
    );

    await user.click(await screen.findByRole("button", { name: "Forward message from Mina" }));
    await user.click(screen.getByRole("button", { name: "Forward to # random" }));
    await user.click(screen.getByRole("button", { name: "Forward message from Mina" }));
    await user.click(screen.getByRole("button", { name: "Forward to Lee" }));

    await waitFor(() => expect(sent.map((op) => op.schemaAction)).toEqual(["messageSend", "directMessageSend"]));
    expect(sent[0]).toMatchObject({ type: "messageSend", schemaAction: "messageSend", payload: { channelId: "random" } });
    expect(sent[0].payload.body).toContain("Forwarded from Mina:");
    expect(sent[0].payload.body).toContain("Welcome to the live chat app");
    expect(sent[1]).toMatchObject({ type: "directMessageSend", schemaAction: "directMessageSend", payload: { userIds: ["alice", "lee"] } });
    expect(sent[1].payload.body).toContain("Forwarded from Mina:");
  });

  it("sends status changes as transient presence when the injected bridge supports it", async () => {
    const user = userEvent.setup();
    const sendPresence = vi.fn(async () => true);
    const sendOperation = vi.fn(async (operation) => ({ ok: true, state, operation }));
    window.ROOMKIT_CHORD_HOST = { getState: vi.fn(async () => state), sendOperation, sendPresence } as any;

    render(<ChatApp envelope={{ room: { id: "chat", name: "Chat" }, actor: { memberId: "alice", deviceId: "dev", role: "admin", displayName: "Alice" } }} />);
    await user.click(await screen.findByRole("button", { name: "Open status menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Set busy" }));

    await waitFor(() => expect(sendPresence).toHaveBeenCalledWith({ status: "busy", activity: "in a room", at: expect.any(Number) }));
    expect(sendOperation).not.toHaveBeenCalledWith(expect.objectContaining({ schemaAction: "presenceUpdate" }));
  });

  it("lets admins add and remove camera-capable voice channels", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));

    await user.click(await screen.findByRole("button", { name: "Manage" }));
    const manageDialog = await screen.findByRole("dialog", { name: "Manage" });
    await user.click(within(manageDialog).getByRole("button", { name: "Voice" }));
    await user.type(within(manageDialog).getByLabelText("Voice channel name"), "Design review");
    await user.type(within(manageDialog).getByLabelText("Voice channel group"), "Crits");
    expect(within(manageDialog).getByLabelText("Allow camera")).toBeChecked();
    await user.click(within(manageDialog).getByRole("button", { name: "Create voice channel" }));
    await user.click(within(manageDialog).getByRole("button", { name: "Manage" }));
    await user.click(within(manageDialog).getByRole("button", { name: "Archive voice channel" }));

    await waitFor(() => expect(sent.map((op) => op.schemaAction)).toEqual(["mediaRoomCreate", "mediaRoomArchive"]));
    expect(sent[0]).toMatchObject({ type: "mediaRoomCreate", schemaAction: "mediaRoomCreate", payload: { name: "Design review", group: "Crits", allowsVideo: true } });
    expect(sent[0].payload).not.toHaveProperty("mode");
    expect(sent[1]).toMatchObject({ type: "mediaRoomArchive", schemaAction: "mediaRoomArchive", payload: { roomId: "media1" } });
  });

  it("filters role-gated rooms and marks read-only rooms as unavailable to join", async () => {
    renderChat(undefined, {
      ...state,
      rooms: [
        { id: "open", name: "Open Room", allowsVideo: true, participants: {} },
        { id: "readonly", name: "Readonly Room", allowsVideo: true, participants: {}, roleAccess: { member: "readonly" } },
        { id: "staff", name: "Staff Room", allowsVideo: true, participants: {}, roleAccess: { moderator: "editor" } }
      ]
    }, { memberId: "lee", deviceId: "dev_lee", role: "member", displayName: "Lee" });

    expect(await screen.findByRole("button", { name: "Join Open Room" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Readonly Room is read only" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Join Staff Room" })).not.toBeInTheDocument();
  });

  it("commits direct messages from the active DM view", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    renderChat(
      vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }),
      state
    );

    await user.click(await screen.findByRole("button", { name: "Lee, 1 unread DM" }));
    await user.type(screen.getByLabelText("Message Lee"), "Private update");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ type: "directMessageSend", schemaAction: "directMessageSend", payload: { userIds: ["alice", "lee"], body: "Private update" } });
  });

  it("toggles camera, local mute, and sharing from the bottom-left controls", async () => {
    const user = userEvent.setup();
    const updateMedia = vi.fn();
    const updateVoicePreferences = vi.fn();
    render(
      <UserControls
        actorName="Alice"
        actorRole="admin"
        rooms={state.rooms}
        selectedRoomId="media1"
        joinedRoomId="media1"
        localMedia={{ audio: true, video: false }}
        sfu={{ status: "connected", mediaRoomId: "media1", media: { audio: true, video: false }, remoteStreams: [] }}
        voicePreferences={defaultVoicePreferences()}
        screenShares={[]}
        onUpdateMedia={updateMedia}
        onLeave={vi.fn()}
        onReconnect={vi.fn()}
        onDismissReconnect={vi.fn()}
        onStopShare={vi.fn()}
        onUpdateVoicePreferences={updateVoicePreferences}
        onUpdateStatus={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Join with camera" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Turn camera on" }));
    await user.click(screen.getByRole("button", { name: "Mute mic" }));
    await user.click(screen.getByRole("button", { name: "Share screen" }));

    expect(updateMedia).toHaveBeenNthCalledWith(1, state.rooms[0], { audio: true, video: true, screen: false });
    expect(updateMedia).toHaveBeenNthCalledWith(2, state.rooms[0], { audio: false, video: false, screen: false });
    expect(updateMedia).toHaveBeenNthCalledWith(3, state.rooms[0], { audio: true, video: false, screen: true });
    expect(updateVoicePreferences).toHaveBeenCalledWith(expect.objectContaining({ muted: true, deafened: false }));
  });

  it("configures SDK voice processing from the bottom-left settings cog", async () => {
    const user = userEvent.setup();
    const updateMedia = vi.fn();
    const updateVoicePreferences = vi.fn();
    const voiceSettingsOpenChange = vi.fn();
    const expectedInputGain = Math.sqrt(3);
    render(
      <UserControls
        actorName="Alice"
        actorRole="admin"
        rooms={state.rooms}
        selectedRoomId="media1"
        joinedRoomId="media1"
        localMedia={{ audio: true, video: false }}
        sfu={{ status: "connected", mediaRoomId: "media1", media: { audio: true, video: false }, remoteStreams: [] }}
        voicePreferences={defaultVoicePreferences()}
        screenShares={[]}
        onUpdateMedia={updateMedia}
        onLeave={vi.fn()}
        onReconnect={vi.fn()}
        onDismissReconnect={vi.fn()}
        onStopShare={vi.fn()}
        onUpdateVoicePreferences={updateVoicePreferences}
        onVoiceSettingsOpenChange={voiceSettingsOpenChange}
        onUpdateStatus={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open voice settings" }));
    const dialog = screen.getByRole("dialog", { name: "Voice settings" });
    expect(screen.getByText("Voice connected")).toBeInTheDocument();
    expect(screen.getByText("Launch Room")).toBeInTheDocument();
    expect(updateMedia).toHaveBeenNthCalledWith(1, state.rooms[0], { audio: false, video: false, screen: false });
    expect(voiceSettingsOpenChange).toHaveBeenLastCalledWith(true);
    await user.click(within(dialog).getByLabelText(/Dynamic gain control/));
    fireEvent.change(within(dialog).getByLabelText("Input gain"), { target: { value: "150" } });
    await user.click(within(dialog).getByLabelText(/Silero VAD/));
    await user.click(within(dialog).getByLabelText(/DTLN noise suppression/));
    await user.click(within(dialog).getByLabelText(/Push to talk/));
    await user.click(within(dialog).getByRole("button", { name: "Change" }));
    fireEvent.keyDown(window, { code: "F24", key: "F24" });

    expect(updateVoicePreferences).toHaveBeenLastCalledWith(expect.objectContaining({
      dynamicGainControl: true,
      inputGain: expectedInputGain,
      sileroVad: true,
      dtlnNoiseSuppression: true,
      pushToTalk: true,
      pttKey: "F24"
    }));
    expect(updateMedia.mock.calls.some(([, media]) => media.voice?.vad?.engine === "silero" && media.voice.vad.model === "v5")).toBe(true);
    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], expect.objectContaining({
      audio: false,
      video: false,
      screen: false,
      voice: expect.objectContaining({
        autoGainControl: true,
        inputGain: expectedInputGain,
        inputMode: "ptt",
        pttKey: "F24",
        dtlnNoiseSuppression: true,
        dtlnWorkletUrl: expect.stringMatching(/\/audio-worklet\.js$/)
      })
    }));

    await user.click(within(dialog).getByRole("button", { name: "Close voice settings" }));

    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], expect.objectContaining({
      audio: true,
      video: false,
      screen: false,
      voice: expect.objectContaining({
        autoGainControl: true,
        inputGain: expectedInputGain,
        inputMode: "ptt",
        pttKey: "F24",
        dtlnNoiseSuppression: true
      })
    }));
    expect(voiceSettingsOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("disconnects room audio when settings open while testing raw mic through processed playback", async () => {
    const user = userEvent.setup();
    const getUserMedia = installMediaCapture();
    const playMock = vi.mocked(window.HTMLMediaElement.prototype.play);
    playMock.mockClear();
    const updateMedia = vi.fn();
    const outboundTrack = new FakeMediaStreamTrack("audio", "outbound-audio");
    const cameraTrack = new FakeMediaStreamTrack("video", "camera");
    const outboundStream = new FakeMediaStream([outboundTrack, cameraTrack]) as unknown as MediaStream;
    render(
      <UserControls
        actorName="Alice"
        actorRole="admin"
        rooms={state.rooms}
        selectedRoomId="media1"
        joinedRoomId="media1"
        localMedia={{ audio: true, video: false }}
        sfu={{ status: "connected", mediaRoomId: "media1", media: { audio: true, video: true, screen: true }, localStream: outboundStream, remoteStreams: [] }}
        voicePreferences={defaultVoicePreferences()}
        screenShares={[]}
        onUpdateMedia={updateMedia}
        onLeave={vi.fn()}
        onReconnect={vi.fn()}
        onDismissReconnect={vi.fn()}
        onStopShare={vi.fn()}
        onUpdateVoicePreferences={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open voice settings" }));

    const dialog = screen.getByRole("dialog", { name: "Voice settings" });
    expect(screen.getByText("Voice connected")).toBeInTheDocument();
    expect(screen.getByText("Launch Room")).toBeInTheDocument();
    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: false, video: true, screen: true });

    await user.click(within(dialog).getByRole("button", { name: "Start recording" }));

    await waitFor(() => expect(within(dialog).getByText("Recording raw microphone")).toBeInTheDocument());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: sdkRawVoiceTestAudioConstraints, video: false });
    expect(fakeMediaRecorders).toHaveLength(1);
    expect(fakeMediaRecorders[0].stream).not.toBe(outboundStream);
    expect(fakeMediaRecorders[0].stream.getAudioTracks()).toHaveLength(1);
    expect(fakeMediaRecorders[0].stream.getAudioTracks()[0]).not.toBe(outboundTrack);
    expect(fakeMediaRecorders[0].stream.getVideoTracks()).toEqual([]);
    expect(outboundTrack.readyState).toBe("live");
    expect(cameraTrack.readyState).toBe("live");
    expect(playMock).not.toHaveBeenCalled();
    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: false, video: true, screen: true });

    await user.click(within(dialog).getByRole("button", { name: "Stop recording" }));

    await waitFor(() => expect(within(dialog).getByText("Looping processed recording")).toBeInTheDocument());
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: false, video: true, screen: true });

    await user.click(within(dialog).getByRole("button", { name: "Stop playback" }));

    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: false, video: true, screen: true });

    await user.click(within(dialog).getByRole("button", { name: "Close voice settings" }));

    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: true, video: true, screen: true });
    expect(outboundTrack.readyState).toBe("live");
    expect(cameraTrack.readyState).toBe("live");
  });

  it("uses raw no-DSP capture for the voice settings recording even without an active outbound stream", async () => {
    const user = userEvent.setup();
    const getUserMedia = installMediaCapture();
    const playMock = vi.mocked(window.HTMLMediaElement.prototype.play);
    playMock.mockClear();
    const updateMedia = vi.fn();
    render(
      <UserControls
        actorName="Alice"
        actorRole="admin"
        rooms={state.rooms}
        selectedRoomId="media1"
        joinedRoomId="media1"
        localMedia={{ audio: true, video: false }}
        sfu={{ status: "connected", mediaRoomId: "media1", media: { audio: true, video: false }, remoteStreams: [] }}
        voicePreferences={defaultVoicePreferences()}
        screenShares={[]}
        onUpdateMedia={updateMedia}
        onLeave={vi.fn()}
        onReconnect={vi.fn()}
        onDismissReconnect={vi.fn()}
        onStopShare={vi.fn()}
        onUpdateVoicePreferences={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open voice settings" }));
    const dialog = screen.getByRole("dialog", { name: "Voice settings" });
    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: false, video: false, screen: false });

    await user.click(within(dialog).getByRole("button", { name: "Start recording" }));

    await waitFor(() => expect(within(dialog).getByText("Recording raw microphone")).toBeInTheDocument());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: sdkRawVoiceTestAudioConstraints, video: false });
    expect(fakeMediaRecorders).toHaveLength(1);
    expect(fakeMediaRecorders[0].stream.getAudioTracks()).toHaveLength(1);
    expect(fakeMediaRecorders[0].stream.getVideoTracks()).toEqual([]);
    expect(playMock).not.toHaveBeenCalled();
    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: false, video: false, screen: false });

    await user.click(within(dialog).getByRole("button", { name: "Stop recording" }));

    await waitFor(() => expect(within(dialog).getByText("Looping processed recording")).toBeInTheDocument());
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: false, video: false, screen: false });

    await user.click(within(dialog).getByRole("button", { name: "Close voice settings" }));

    expect(updateMedia).toHaveBeenLastCalledWith(state.rooms[0], { audio: true, video: false, screen: false });
  });

  it("hides room controls until the user is in a voice room while keeping mute and deafen available", async () => {
    render(
      <UserControls
        actorName="Alice"
        actorRole="admin"
        rooms={state.rooms}
        selectedRoomId="media1"
        sfu={{ status: "idle", remoteStreams: [] }}
        voicePreferences={defaultVoicePreferences()}
        screenShares={[]}
        onUpdateMedia={vi.fn()}
        onLeave={vi.fn()}
        onReconnect={vi.fn()}
        onDismissReconnect={vi.fn()}
        onStopShare={vi.fn()}
        onUpdateVoicePreferences={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );

    expect(screen.queryByLabelText("Voice controls")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mute mic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deafen" })).toBeInTheDocument();
    expect(screen.queryByText(/messages/)).not.toBeInTheDocument();
  });

  it("does not treat persisted room participants as local voice join state", async () => {
    renderChat(undefined, {
      ...state,
      rooms: [{
        ...state.rooms[0],
        participants: {
          alice: { memberId: "alice", name: "Alice", media: { audio: true, video: false }, joinedAt: 1 }
        }
      }]
    });

    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.queryByLabelText("Voice controls")).not.toBeInTheDocument();
  });

  it("keeps local mute and deafen preferences after an app restart", async () => {
    const user = userEvent.setup();
    const first = renderChat();

    await user.click(await screen.findByRole("button", { name: "Mute mic" }));
    await user.click(screen.getByRole("button", { name: "Deafen" }));
    first.unmount();

    renderChat();

    expect(await screen.findByRole("button", { name: "Unmute mic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undeafen" })).toBeInTheDocument();
  });

  it("shows a reconnect prompt after refresh without auto joining voice", async () => {
    const user = userEvent.setup();
    const first = renderChat();

    await user.click(await screen.findByRole("button", { name: "Join Launch Room" }));
    expect(screen.getByLabelText("Voice controls")).toBeInTheDocument();
    first.unmount();

    renderChat();

    expect(await screen.findByLabelText("Voice reconnect prompt")).toBeInTheDocument();
    expect(screen.queryByLabelText("Voice controls")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(screen.getByLabelText("Voice controls")).toBeInTheDocument();
  });

  it("keeps read direct-message notifications read after an app restart", async () => {
    const user = userEvent.setup();
    const first = renderChat();

    await user.click(await screen.findByRole("button", { name: "Lee, 1 unread DM" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Lee" })).toBeInTheDocument());
    first.unmount();

    renderChat();

    expect(await screen.findByRole("button", { name: "Lee" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lee, 1 unread DM" })).not.toBeInTheDocument();
  });

  it("closes direct-message rows without deleting the stored thread data", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    const first = renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));

    expect(await screen.findByRole("button", { name: "Lee, 1 unread DM" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close Lee DM" }));

    expect(screen.queryByRole("button", { name: "Lee, 1 unread DM" })).not.toBeInTheDocument();
    expect(screen.getByText("No DMs")).toBeInTheDocument();
    expect(sent).toHaveLength(0);
    first.unmount();

    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }));
    expect(await screen.findByText("No DMs")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lee, 1 unread DM" })).not.toBeInTheDocument();

    fireEvent.contextMenu(await memberRailAvatar("Lee", "Lee, online"), { clientX: 80, clientY: 90 });
    await user.click(await screen.findByRole("menuitem", { name: "Send DM" }));

    expect(await screen.findByText("Private hello")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lee" })).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it("opens a local direct-message draft from a room member without notifying the target", async () => {
    const user = userEvent.setup();
    const initialState = { ...state, directThreads: {}, directMessages: {} };
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state: initialState, operation }; }), initialState);

    await user.click(await screen.findByRole("button", { name: "Lee, online" }));
    const sendButtons = screen.getAllByRole("button", { name: "Send DM" });
    await user.click(sendButtons[sendButtons.length - 1]);

    expect(sent).toHaveLength(0);
    expect(await screen.findByRole("button", { name: "Lee" })).toBeInTheDocument();
    expect(screen.getByLabelText("Message Lee")).toHaveFocus();
  });

  it("opens a focused direct-message draft from the member context menu", async () => {
    const user = userEvent.setup();
    const initialState = { ...state, directThreads: {}, directMessages: {} };
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state: initialState, operation }; }), initialState);

    fireEvent.contextMenu(await memberRailAvatar("Lee", "Lee, online"), { clientX: 80, clientY: 90 });
    await user.click(await screen.findByRole("menuitem", { name: "Send DM" }));

    expect(sent).toHaveLength(0);
    expect(screen.getByLabelText("Message Lee")).toHaveFocus();
  });

  it("does not offer direct messages from your own avatar context menu", async () => {
    renderChat();

    fireEvent.contextMenu(await memberRailAvatar("Alice", "Alice (you)"), { clientX: 80, clientY: 90 });

    expect(await screen.findByRole("menuitem", { name: "Set roles" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Send DM" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Message Alice")).not.toBeInTheDocument();
  });

  it("opens a focused direct-message draft from a message author avatar", async () => {
    const user = userEvent.setup();
    const initialState = {
      ...state,
      messages: { m1: { ...state.messages.m1, authorId: "lee", authorName: "Lee" } },
      directThreads: {},
      directMessages: {}
    };
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state: initialState, operation }; }), initialState);

    const messageLog = await screen.findByRole("log", { name: "# general messages" });
    fireEvent.contextMenu(within(messageLog).getByLabelText("Lee avatar"), { clientX: 80, clientY: 90 });
    await user.click(await screen.findByRole("menuitem", { name: "Send DM" }));

    expect(sent).toHaveLength(0);
    expect(screen.getByLabelText("Message Lee")).toHaveFocus();
  });

  it("opens role-tag assignment from the member context menu and saves multiple roles", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    const roleState: ChatState = {
      ...state,
      roleDefinitions: {
        launch: { id: "launch", name: "Launch Lead", description: "Launch coordination", color: "#38bdf8", rank: 1, archivedAt: null }
      },
      memberRoles: {
        lee: { memberId: "lee", roleIds: ["member"] }
      }
    };
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state: roleState, operation }; }), roleState);

    fireEvent.contextMenu(await memberRailAvatar("Lee", "Lee, online"), { clientX: 80, clientY: 90 });
    await user.click(await screen.findByRole("menuitem", { name: "Set roles" }));
    const manageDialog = await screen.findByRole("dialog", { name: "Manage" });

    expect(within(manageDialog).getByRole("heading", { name: "Role tags for Lee" })).toBeInTheDocument();
    await user.click(within(manageDialog).getByLabelText("Launch Lead"));
    await user.click(within(manageDialog).getByRole("button", { name: "Save roles" }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ type: "memberRoleAssign", schemaAction: "memberRoleAssign", payload: { memberId: "lee", roleIds: ["member", "launch"] } });
  });

  it("creates the direct-message thread only when the first message is sent", async () => {
    const user = userEvent.setup();
    const initialState = { ...state, directThreads: {}, directMessages: {} };
    const sent: any[] = [];
    renderChat(
      vi.fn(async (operation) => { sent.push(operation); return { ok: true, state: initialState, operation }; }),
      initialState
    );

    fireEvent.contextMenu(await memberRailAvatar("Lee", "Lee, online"), { clientX: 80, clientY: 90 });
    await user.click(await screen.findByRole("menuitem", { name: "Send DM" }));
    await user.type(screen.getByLabelText("Message Lee"), "Private update");
    const composer = screen.getByLabelText("Message Lee").closest("form");
    if (!composer) throw new Error("Expected direct-message composer");
    await user.click(within(composer).getByRole("button", { name: "Send DM" }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ type: "directMessageSend", schemaAction: "directMessageSend", payload: { userIds: ["alice", "lee"], body: "Private update" } });
  });

  it("hides direct message threads that are not core NIP-17 threads", async () => {
    const user = userEvent.setup();
    const sent: any[] = [];
    renderChat(vi.fn(async (operation) => { sent.push(operation); return { ok: true, state, operation }; }), {
      ...state,
      directThreads: {
        dm_alice__lee: { id: "dm_alice__lee", protocol: "legacy.plaintext", userIds: ["alice", "lee"], topic: "Wrong app" }
      },
      directMessages: {
        dm_msg_1: { id: "dm_msg_1", protocol: "legacy.plaintext", threadId: "dm_alice__lee", body: "Wrong app message", authorId: "lee", reactions: {}, createdAt: 2 }
      }
    });

    expect(await screen.findByText("Welcome to the live chat app")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lee, 1 unread DM" })).not.toBeInTheDocument();
    expect(screen.queryByText("Wrong app message")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lee, online" }));
    const sendButtons = screen.getAllByRole("button", { name: "Send DM" });
    await user.click(sendButtons[sendButtons.length - 1]);
    expect(sent).toHaveLength(0);
    expect(screen.getByLabelText("Message Lee")).toHaveFocus();
  });
});
