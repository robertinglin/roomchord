import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioWaveformPlayer, formatAudioDuration } from "@shared/ui/AudioWaveformPlayer";
import { createVoiceRecordingFileName } from "@shared/ui/AttachmentPicker";

describe("AudioWaveformPlayer", () => {
  it("formats elapsed and total durations", () => {
    expect(formatAudioDuration(75.9)).toBe("1:15");
    expect(formatAudioDuration(Number.NaN)).toBe("0:00");
  });

  it("shows metadata, offers playback, and seeks from the waveform", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const onError = vi.fn();
    render(<AudioWaveformPlayer src="blob:audio" label="voice message" onError={onError} />);
    const audio = document.querySelector("audio") as HTMLAudioElement;
    const slider = screen.getByRole("slider", { name: "Seek voice message" });
    Object.defineProperty(audio, "duration", { configurable: true, value: 12 });
    fireEvent.loadedMetadata(audio);
    expect(screen.getByRole("timer", { name: "voice message playback time" })).toHaveTextContent("0:00 / 0:12");

    Object.defineProperty(slider, "getBoundingClientRect", { configurable: true, value: () => ({ left: 0, width: 100, top: 0, right: 100, bottom: 40, height: 40 }) });
    fireEvent.click(slider, { clientX: 25 });
    expect(slider).toHaveAttribute("aria-valuenow", "3");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "8");

    const playButton = screen.getByRole("button", { name: "Play voice message" });
    fireEvent.click(playButton);
    expect(playButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.pause(audio);
    expect(playButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.ended(audio);
    expect(screen.getByRole("slider", { name: "Seek voice message" })).toHaveAttribute("aria-valuenow", "12");
    fireEvent.error(audio);
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Play voice message" })).toBeInTheDocument();
  });

  it("advances waveform progress during the first playback from the media clock", () => {
    let animationFrame: FrameRequestCallback | undefined;
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { animationFrame = callback; return 1; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { unmount } = render(<AudioWaveformPlayer src="blob:first-play" label="first play" />);
    const audio = document.querySelector("audio") as HTMLAudioElement;
    const slider = screen.getByRole("slider", { name: "Seek first play" });
    Object.defineProperty(audio, "duration", { configurable: true, value: 12 });
    Object.defineProperty(audio, "currentTime", { configurable: true, writable: true, value: 0 });
    fireEvent.loadedMetadata(audio);

    fireEvent.click(screen.getByRole("button", { name: "Play first play" }));
    audio.currentTime = 3;
    act(() => animationFrame?.(0));

    expect(slider.querySelectorAll("span.is-played")).toHaveLength(12);
    expect(requestFrame).toHaveBeenCalled();
    unmount();
  });

  it("reloads a completed WebM before replaying it", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const load = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    play.mockClear();
    render(<AudioWaveformPlayer src="blob:replay" label="replay" waveformSource={new Blob(["audio"], { type: "audio/webm" })} />);
    const audio = document.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "ended", { configurable: true, value: true });
    Object.defineProperty(audio, "paused", { configurable: true, get: () => true });
    fireEvent.click(screen.getByRole("button", { name: "Play replay" }));
    expect(load).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("creates a readable local recording name with a safe extension", () => {
    expect(createVoiceRecordingFileName(new Date(2026, 7, 11, 14, 5, 9), "webm")).toBe("Voice message 2026-08-11 at 14-05-09.webm");
    expect(createVoiceRecordingFileName(new Date(2026, 7, 11, 14, 5, 9), "../webm")).toBe("Voice message 2026-08-11 at 14-05-09.webm");
  });

  it("derives waveform peaks from the decoded audio source", async () => {
    const OriginalAudioContext = globalThis.AudioContext;
    const decodeAudioData = vi.fn(async () => ({ duration: 4, getChannelData: () => Float32Array.from([0.1, 0.5, 0.2, 0.9]) }));
    class FakeAudioContext {
      state = "running";
      decodeAudioData = decodeAudioData;
      close = vi.fn(async () => undefined);
    }
    Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: FakeAudioContext });
    try {
      render(<AudioWaveformPlayer src="blob:audio" label="voice message" waveformSource={new Blob(["audio"], { type: "audio/webm" })} />);
      expect(document.querySelector("audio source")).toHaveAttribute("type", "audio/webm; codecs=opus");
      const waveform = document.querySelector(".voice-waveform");
      expect(waveform).toHaveAttribute("role", "slider");
      await waitFor(() => expect(decodeAudioData).toHaveBeenCalledTimes(1));
      expect(screen.getByRole("timer", { name: "voice message playback time" })).toHaveTextContent("0:00 / 0:04");
      expect(waveform?.querySelectorAll("span")[0]).toHaveStyle({ height: "12%" });
      expect(waveform?.querySelectorAll("span")[47]).toHaveStyle({ height: "100%" });
    } finally {
      Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: OriginalAudioContext });
    }
  });
});
