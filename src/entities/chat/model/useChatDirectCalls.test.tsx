import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { emptyChatState } from "./state";
import { useChatDirectCalls } from "./useChatDirectCalls";

const call = vi.hoisted(() => ({
  options: undefined as any,
  start: vi.fn(() => "direct-room"), accept: vi.fn(), decline: vi.fn(), end: vi.fn(),
  updateMedia: vi.fn(), watch: vi.fn(), stopWatching: vi.fn()
}));

vi.mock("matterhorn-sdk/browser/directCalls", () => ({
  DirectCallOrchestrator: class {
    constructor(options: any) { call.options = options; }
    startDirectCall = call.start;
    acceptInvite = call.accept;
    declineInvite = call.decline;
    endDirectCall = call.end;
    updateMedia = call.updateMedia;
    watchScreen = call.watch;
    stopWatchingScreen = call.stopWatching;
    callPubkey() { return "call-key"; }
    destroy() {}
  }
}));

function fixture(status = "connected") {
  const peer = { id: "peer-1", on: vi.fn(), off: vi.fn() };
  const updateMemberCall = vi.fn().mockResolvedValue(undefined);
  const live = {
    status,
    can: () => true,
    actions: { updateMemberCall },
    media: {
      clientId: "client-1",
      getCallPublicKey: () => "call-key",
      getMediaPeer: () => peer,
      getMediaPeerAddress: () => "peer-address",
      sendPeerSignal: vi.fn(),
      subscribeRelayMessage: () => () => {}
    }
  };
  const input = {
    actor: { memberId: "alice", displayName: "Alice", role: "member" },
    roomName: "idle-room",
    state: emptyChatState(),
    live
  } as Parameters<typeof useChatDirectCalls>[0];
  return { input, live, updateMemberCall, peer };
}

async function tick(ms = 1000) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it.each(["connecting", "reconnecting", "cached", "offline", "error", "saving"])("idle %s does not enqueue automatic call-route writes across activity intervals", async (status) => {
  const f = fixture(status);
  const hook = renderHook(() => useChatDirectCalls(f.input));
  await tick(30_000);
  expect(f.updateMemberCall).not.toHaveBeenCalled();

  f.input = { ...f.input, live: { ...f.input.live, status: "connected" } };
  hook.rerender();
  await tick();
  expect(f.updateMemberCall).toHaveBeenCalledTimes(1);
  expect(f.updateMemberCall.mock.calls[0][1]).toEqual({ requireCurrentAuthority: true });

  f.input.state = { ...f.input.state, presence: {} };
  hook.rerender();
  await tick(30_000);
  expect(f.updateMemberCall).toHaveBeenCalledTimes(1);
});

it("a recovery race refuses the automatic write and retries only after reconnection", async () => {
  const f = fixture();
  f.updateMemberCall.mockRejectedValueOnce(new Error("Access is being verified."));
  renderHook(() => useChatDirectCalls(f.input));
  await tick();
  expect(f.updateMemberCall).toHaveBeenCalledTimes(1);
  expect(f.updateMemberCall.mock.calls[0][1]).toEqual({ requireCurrentAuthority: true });

  f.live.status = "reconnecting";
  await tick(30_000);
  expect(f.updateMemberCall).toHaveBeenCalledTimes(1);
  f.live.status = "connected";
  await tick();
  expect(f.updateMemberCall).toHaveBeenCalledTimes(2);
});

it("an acknowledged or pending call route is not republished on the activity timer", async () => {
  const f = fixture();
  let acknowledge!: () => void;
  f.updateMemberCall.mockImplementationOnce(() => new Promise<void>(resolve => { acknowledge = resolve; }));
  const hook = renderHook(() => useChatDirectCalls(f.input));
  await tick(30_000);
  expect(f.updateMemberCall).toHaveBeenCalledTimes(1);
  await act(async () => { acknowledge(); });
  f.input.state = { ...f.input.state, callRoutes: { alice: {
    callClientId: "client-1", peerId: "peer-1", peerAddress: "peer-address", callPubkey: "call-key"
  } } };
  hook.rerender();
  await tick(30_000);
  expect(f.updateMemberCall).toHaveBeenCalledTimes(1);
});

it("preserves incoming and outgoing calls after call-route registration", async () => {
  const f = fixture();
  f.input.state.callRoutes = { bob: { memberId: "bob", callClientId: "bob-client", callPubkey: "bob-key", peerId: "bob-peer" } };
  f.input.incomingActions = vi.fn(() => []);
  f.input.onBeforeAccept = vi.fn(() => true);
  const hook = renderHook(() => useChatDirectCalls(f.input));
  await tick();
  expect(call.options.getParticipant("bob-client")).toMatchObject({ id: "bob-client" });
  expect(call.options.getPeer()).toBe(f.peer);
  expect(call.options.getPeerAddress()).toBe("peer-address");
  expect(call.options.sendSignal("bob-client", "bob-peer", {}, undefined)).toBe(false);
  expect(call.options.renderDefaultCallDock.incomingActions({})).toEqual([]);
  expect(call.options.renderDefaultCallDock.onBeforeAccept({})).toBe(true);
  expect(call.options.renderDefaultCallDock.shouldRender({ status: "incoming" })).toBe(true);

  act(() => { hook.result.current.acceptCall(); hook.result.current.declineCall(); });
  act(() => { call.options.onCallState({ status: "incoming", directRoomId: "direct-room", remoteClientId: "bob-client", invitedMemberIds: ["bob"], room: { remoteStreams: [{ clientId: "bob-client" }], peers: [{ clientId: "bob-client" }] } }); });
  expect(hook.result.current.memberIds).toEqual(["alice", "bob"]);
  act(() => { hook.result.current.acceptCall(); hook.result.current.declineCall(); });
  expect(call.accept).toHaveBeenCalledWith("direct-room", { audio: true, video: false });
  expect(call.decline).toHaveBeenCalledWith("direct-room");
  act(() => {
    expect(hook.result.current.callMember("bob")).toBe(true);
    hook.result.current.endCall();
    hook.result.current.updateMedia({ audio: false });
    hook.result.current.watchScreenShare("bob-client");
    hook.result.current.stopWatchingScreenShare("bob-client");
    call.options.onError("Call failed", "offline");
  });
  expect(call.start).toHaveBeenCalledWith("bob", "voice");
  expect(call.end).toHaveBeenCalled();
  expect(call.updateMedia).toHaveBeenCalledWith({ audio: false });
  expect(call.watch).toHaveBeenCalledWith("bob-client");
  expect(call.stopWatching).toHaveBeenCalledWith("bob-client");
  expect(hook.result.current.error).toBe("Call failed");
});
