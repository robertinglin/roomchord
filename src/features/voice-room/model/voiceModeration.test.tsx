import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVoiceModerationState } from "./voiceModeration";

function setup() {
  let relayListener: ((status: "connected" | "reconnecting" | "closed") => void) | undefined;
  let moderationListener: ((result: { operationType: "media.room.member.mute" }) => void) | undefined;
  const unsubscribeRelay = vi.fn();
  const unsubscribeModeration = vi.fn();
  const close = vi.fn();
  const media = {
    available: true,
    getRelayStatus: vi.fn((): "connected" | undefined => "connected"),
    subscribeRelayStatus: vi.fn((listener: typeof relayListener) => {
      relayListener = listener;
      return unsubscribeRelay;
    }),
    moderation: {
      subscribe: vi.fn((listener: typeof moderationListener) => {
        moderationListener = listener;
        return unsubscribeModeration;
      }),
      close
    }
  };
  return { media, unsubscribeRelay, unsubscribeModeration, get relayListener() { return relayListener; }, get moderationListener() { return moderationListener; } };
}

function Harness({ media, capture }: { media: Parameters<typeof useVoiceModerationState>[0]; capture?: (state: ReturnType<typeof useVoiceModerationState>) => void }) {
  const state = useVoiceModerationState(media);
  capture?.(state);
  if (!state) return <output>unavailable</output>;
  return (
    <div>
      <output>{state.relayStatus}</output>
      <output>{state.lastResult?.operationType || "none"}</output>
      <output>{state.error || "no error"}</output>
      <button onClick={state.begin}>begin</button>
      <button onClick={() => state.reportError(new Error("refresh failed"))}>error</button>
      <button onClick={() => state.reportError("string failure")}>string-error</button>
      <button onClick={() => state.reportError("")}>empty-error</button>
      <button onClick={state.clearError}>clear</button>
      <button onClick={state.end}>end</button>
    </div>
  );
}

describe("voice moderation SDK state bridge", () => {
  it("projects relay status, authoritative acknowledgements, errors, and cleanup", async () => {
    const harness = setup();
    const { unmount } = render(<Harness media={harness.media as never} />);
    expect(screen.getAllByText("connected")).toHaveLength(1);
    act(() => harness.relayListener?.("reconnecting"));
    expect(screen.getByText("reconnecting")).toBeInTheDocument();
    act(() => harness.moderationListener?.({ operationType: "media.room.member.mute" }));
    expect(screen.getByText("media.room.member.mute")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "error" }));
    expect(screen.getByText("refresh failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "clear" }));
    expect(screen.getByText("no error")).toBeInTheDocument();
    await waitFor(() => expect(harness.media.moderation.subscribe).toHaveBeenCalledTimes(1));
    unmount();
    expect(harness.unsubscribeModeration).toHaveBeenCalledTimes(1);
    expect(harness.unsubscribeRelay).toHaveBeenCalledTimes(1);
    expect(harness.media.moderation.close).toHaveBeenCalledTimes(1);
  });

  it("keeps pending state transitions local to the state bridge", () => {
    const harness = setup();
    render(<Harness media={harness.media as never} />);
    fireEvent.click(screen.getByRole("button", { name: "begin" }));
    fireEvent.click(screen.getByRole("button", { name: "end" }));
    expect(screen.getByText("connected")).toBeInTheDocument();
  });

  it("fails closed when the SDK controller is absent or its subscription throws", async () => {
    render(<Harness media={{} as never} />);
    expect(screen.getByText("unavailable")).toBeInTheDocument();
    const harness = setup();
    harness.media.moderation.subscribe.mockImplementation(() => { throw new Error("subscription unavailable"); });
    render(<Harness media={harness.media as never} />);
    await waitFor(() => expect(screen.getByText("subscription unavailable")).toBeInTheDocument());
  });

  it("normalizes non-Error action failures", () => {
    const harness = setup();
    render(<Harness media={harness.media as never} />);
    fireEvent.click(screen.getByRole("button", { name: "string-error" }));
    expect(screen.getByText("string failure")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "empty-error" }));
    expect(screen.getByText("Voice moderation failed.")).toBeInTheDocument();
  });

  it("fails closed when relay status is absent and tolerates controller close errors", () => {
    const harness = setup();
    harness.media.getRelayStatus.mockReturnValue(undefined);
    harness.media.moderation.close.mockImplementation(() => { throw new Error("already closed"); });
    const { unmount } = render(<Harness media={harness.media as never} />);
    expect(screen.getByText("closed")).toBeInTheDocument();
    unmount();
    act(() => harness.relayListener?.("connected"));
  });

  it("keeps callbacks inert after the media controller is removed", () => {
    const harness = setup();
    let initialState: ReturnType<typeof useVoiceModerationState>;
    let currentState: ReturnType<typeof useVoiceModerationState>;
    const { rerender } = render(<Harness media={harness.media as never} capture={(value) => { initialState ||= value; currentState = value; }} />);
    act(() => rerender(<Harness media={{} as never} capture={(value) => { currentState = value; }} />));
    expect(initialState).toBeDefined();
    expect(currentState).toBeUndefined();
    act(() => {
      initialState?.begin();
      initialState?.end();
      initialState?.reportError("late error");
      initialState?.clearError();
    });
    expect(currentState).toBeUndefined();
  });

  it("supports a controller without optional relay subscription or status", () => {
    const close = vi.fn();
    const subscribe = vi.fn(() => undefined);
    const media = { moderation: { subscribe, close } };
    const { unmount } = render(<Harness media={media as never} />);
    expect(screen.getByText("closed")).toBeInTheDocument();
    unmount();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
