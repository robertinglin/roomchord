import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultVoicePreferences } from "@entities/chat/model/localVoicePreferences";

const recording = vi.hoisted(() => ({
  start: vi.fn(),
  stopForPlayback: vi.fn(),
  stop: vi.fn(),
  update: vi.fn()
}));

const diagnostics = vi.hoisted(() => ({ run: vi.fn() }));

vi.mock("matterhorn-sdk/browser/voiceOutboundRecordingTest", () => ({
  startVoiceProcessingRecordingTest: recording.start,
  stopVoiceProcessingRecordingForPlayback: recording.stopForPlayback,
  stopVoiceProcessingRecordingTest: recording.stop,
  updateVoiceProcessingRecordingTestPlayback: recording.update
}));

vi.mock("matterhorn-sdk/browser/voicePipelineDiagnostics", () => ({
  runVoiceProcessingPipelineDiagnostic: diagnostics.run
}));

import { diagnosticSummary, VoiceSettingsPanel } from "@entities/chat/ui/VoiceSettingsPanel";

function result(passed: boolean, reasons: string[] = []) {
  return {
    passed,
    reasons,
    metrics: { dropoutRatio: 0.012, rmsRatio: 0.64, latencyMs: 48 }
  } as never;
}

describe("VoiceSettingsPanel", () => {
  beforeEach(() => {
    recording.start.mockReset();
    recording.stopForPlayback.mockReset();
    recording.stop.mockReset();
    recording.update.mockReset();
    diagnostics.run.mockReset();
    vi.stubGlobal("MediaRecorder", class MediaRecorder {});
  });

  it("keeps common voice controls together and captures push-to-talk input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VoiceSettingsPanel preferences={defaultVoicePreferences()} onChange={onChange} view="voice" />);

    expect(screen.getByText("Devices")).toBeInTheDocument();
    expect(screen.queryByText("Diagnostics")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Input gain"), { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ inputGain: 0 }));

    await user.click(screen.getByLabelText("Silero VAD"));
    fireEvent.change(screen.getByLabelText("VAD threshold"), { target: { value: "275" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ sileroVad: true, vadThreshold: 0.275 }));

    await user.click(screen.getByRole("radio", { name: /Push to Talk/ }));
    await user.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.keyDown(window, { code: "KeyV", key: "v" });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ pushToTalk: true, pttKey: "KeyV" }));
    expect(screen.getByText("V")).toBeInTheDocument();
  });

  it("routes device and output-volume changes through the shared controller", async () => {
    const user = userEvent.setup();
    const state = {
      devices: [
        { deviceId: "mic-1", groupId: "group-1", kind: "audioinput" as const, label: "Desk mic" },
        { deviceId: "speaker-1", groupId: "group-1", kind: "audiooutput" as const, label: "Desk speakers" }
      ],
      outputVolume: 1,
      outputSelectionSupported: true
    };
    const controller = {
      state: vi.fn(() => state),
      subscribe: vi.fn((listener: (next: typeof state) => void) => { listener(state); return vi.fn(); }),
      refresh: vi.fn(async () => state),
      setInputDevice: vi.fn(async () => state),
      setOutputDevice: vi.fn(async () => state),
      setOutputVolume: vi.fn(() => state),
      audioConstraints: vi.fn((value) => value),
      registerPlaybackElement: vi.fn(() => vi.fn()),
      onInputDeviceChanged: vi.fn(() => vi.fn()),
      close: vi.fn()
    } as any;
    render(<VoiceSettingsPanel mediaDeviceController={controller} preferences={defaultVoicePreferences()} onChange={vi.fn()} view="voice" />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Input device" }), "mic-1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Output device" }), "speaker-1");
    fireEvent.change(screen.getByRole("slider", { name: "Output volume" }), { target: { value: "35" } });

    expect(controller.setInputDevice).toHaveBeenCalledWith("mic-1");
    expect(controller.setOutputDevice).toHaveBeenCalledWith("speaker-1");
    expect(controller.setOutputVolume).toHaveBeenCalledWith(0.35);
  });

  it("explains when the browser cannot start a microphone test", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    render(<VoiceSettingsPanel preferences={defaultVoicePreferences()} onChange={vi.fn()} view="voice" />);

    await userEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(await screen.findByText("This browser cannot record raw microphone tests.")).toBeInTheDocument();
    expect(recording.start).not.toHaveBeenCalled();
  });

  it("runs the microphone recording and playback lifecycle", async () => {
    const session = { recorder: { state: "recording" } };
    recording.start.mockResolvedValue(session);
    recording.stopForPlayback.mockResolvedValue(undefined);
    const { unmount } = render(<VoiceSettingsPanel preferences={defaultVoicePreferences()} onChange={vi.fn()} view="voice" />);

    await userEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(await screen.findByText("Listening…")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    expect(await screen.findByText("Playing your test…")).toBeInTheDocument();
    expect(recording.stopForPlayback).toHaveBeenCalledWith(session);
    await userEvent.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(screen.getByText("Check your microphone")).toBeInTheDocument();
    unmount();
    expect(recording.stop).toHaveBeenCalled();
  });

  it("reports microphone startup and playback failures", async () => {
    recording.start.mockRejectedValueOnce(new Error("denied"));
    const { unmount } = render(<VoiceSettingsPanel preferences={defaultVoicePreferences()} onChange={vi.fn()} view="voice" />);
    await userEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(await screen.findByText("Could not start raw microphone recording test.")).toBeInTheDocument();
    unmount();

    const session = { recorder: { state: "recording" } };
    recording.start.mockResolvedValueOnce(session);
    recording.stopForPlayback.mockRejectedValueOnce(new Error("encode failed"));
    render(<VoiceSettingsPanel preferences={defaultVoicePreferences()} onChange={vi.fn()} view="voice" />);
    await userEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await userEvent.click(await screen.findByRole("button", { name: "Stop recording" }));
    expect(await screen.findByText("Could not finish processed microphone test playback.")).toBeInTheDocument();
  });

  it("shows successful, failed, and unavailable advanced diagnostics", async () => {
    diagnostics.run.mockResolvedValueOnce(result(true));
    const { unmount } = render(<VoiceSettingsPanel preferences={defaultVoicePreferences()} onChange={vi.fn()} view="advanced" />);
    expect(screen.queryByText("Devices")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Run check" }));
    expect(await screen.findByText("Passed · 64% level, 1.2% dropout, 48ms latency")).toBeInTheDocument();
    unmount();

    diagnostics.run.mockResolvedValueOnce(result(false, ["Excessive clipping"]));
    const failed = render(<VoiceSettingsPanel preferences={defaultVoicePreferences()} onChange={vi.fn()} view="advanced" />);
    await userEvent.click(screen.getByRole("button", { name: "Run check" }));
    expect(await screen.findByText("Failed · Excessive clipping")).toBeInTheDocument();
    failed.unmount();

    diagnostics.run.mockRejectedValueOnce(new Error("unsupported"));
    render(<VoiceSettingsPanel preferences={defaultVoicePreferences()} onChange={vi.fn()} view="advanced" />);
    await userEvent.click(screen.getByRole("button", { name: "Run check" }));
    expect(await screen.findByText("Could not run the synthetic pipeline quality check in this browser.")).toBeInTheDocument();
  });

  it("summarizes a failed diagnostic without a supplied reason", () => {
    expect(diagnosticSummary(result(false))).toBe("Failed · 64% level, 1.2% dropout, 48ms latency");
  });
});
