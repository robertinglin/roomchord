import React, { useEffect, useRef, useState } from "react";
import { runVoiceProcessingPipelineDiagnostic, type VoicePipelineDiagnosticResult } from "roomkit-sdk/browser/voicePipelineDiagnostics";
import {
  startVoiceProcessingRecordingTest,
  stopVoiceProcessingRecordingForPlayback,
  stopVoiceProcessingRecordingTest,
  updateVoiceProcessingRecordingTestPlayback,
  type VoiceProcessingRecordingTestSession
} from "roomkit-sdk/browser/voiceOutboundRecordingTest";
import { pttKeyFromKeyboardEvent, voiceProcessingSettingsFromPreferences, type VoicePreferences } from "../localVoicePreferences";
import { CloseIcon } from "./Icons";

type Props = {
  preferences: VoicePreferences;
  onChange: (preferences: VoicePreferences) => void;
  onClose: () => void;
};

type VoiceTestPhase = "idle" | "recording" | "playback";
const MIN_POSITIVE_INPUT_GAIN = 0.01;
const MAX_INPUT_GAIN = 3;

function inputGainPercent(preferences: VoicePreferences) {
  return Math.round(Math.max(0, Math.min(MAX_INPUT_GAIN, preferences.inputGain)) * 100);
}

function inputGainSliderValue(preferences: VoicePreferences) {
  const gain = Math.max(0, Math.min(MAX_INPUT_GAIN, preferences.inputGain));
  if (gain <= 0) return 0;
  if (gain < 1) return Math.round(Math.log(gain / MIN_POSITIVE_INPUT_GAIN) / Math.log(1 / MIN_POSITIVE_INPUT_GAIN) * 100);
  return 100 + Math.round(Math.log(gain) / Math.log(MAX_INPUT_GAIN) * 100);
}

function inputGainFromSliderValue(value: number) {
  const sliderValue = Math.max(0, Math.min(200, value));
  if (sliderValue <= 0) return 0;
  if (sliderValue <= 100) return MIN_POSITIVE_INPUT_GAIN * Math.pow(1 / MIN_POSITIVE_INPUT_GAIN, sliderValue / 100);
  return Math.pow(MAX_INPUT_GAIN, (sliderValue - 100) / 100);
}

function thresholdSliderValue(preferences: VoicePreferences) {
  return Math.round(preferences.vadThreshold * 1000);
}

function keyLabel(key: string) {
  return key.replace(/^Key/, "").replace(/^Digit/, "");
}

function stopVoiceTestSession(session: VoiceProcessingRecordingTestSession | undefined) {
  stopVoiceProcessingRecordingTest(session);
}

function diagnosticSummary(result: VoicePipelineDiagnosticResult): string {
  const dropout = `${(result.metrics.dropoutRatio * 100).toFixed(1)}% dropout`;
  const rms = `${Math.round(result.metrics.rmsRatio * 100)}% level`;
  const latency = `${Math.round(result.metrics.latencyMs)}ms latency`;
  if (result.passed) return `Passed · ${rms}, ${dropout}, ${latency}`;
  return `Failed · ${result.reasons[0] || `${rms}, ${dropout}, ${latency}`}`;
}

export function VoiceSettingsDialog({ preferences, onChange, onClose }: Props) {
  const [recordingKey, setRecordingKey] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState(preferences);
  const [testPhase, setTestPhase] = useState<VoiceTestPhase>("idle");
  const [testError, setTestError] = useState<string | undefined>();
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<VoicePipelineDiagnosticResult | undefined>();
  const [diagnosticError, setDiagnosticError] = useState<string | undefined>();
  const testSession = useRef<VoiceProcessingRecordingTestSession | undefined>();
  const latestPreferences = useRef(preferences);

  function update(partial: Partial<VoicePreferences>) {
    const nextPreferences = { ...draftPreferences, ...partial };
    setDraftPreferences(nextPreferences);
    latestPreferences.current = nextPreferences;
    setDiagnosticResult(undefined);
    setDiagnosticError(undefined);
    onChange(nextPreferences);
    updateVoiceProcessingRecordingTestPlayback(testSession.current, voiceProcessingSettingsFromPreferences(nextPreferences), true);
  }


  useEffect(() => {
    setDraftPreferences(preferences);
    latestPreferences.current = preferences;
  }, [preferences]);

  useEffect(() => {
    if (!recordingKey) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      update({ pttKey: pttKeyFromKeyboardEvent(event) });
      setRecordingKey(false);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true, once: true });
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [draftPreferences, recordingKey]);

  useEffect(() => {
    return () => {
      stopVoiceTestSession(testSession.current);
      testSession.current = undefined;
    };
  }, []);

  async function startVoiceTestRecording() {
    stopVoiceTestSession(testSession.current);
    testSession.current = undefined;
    setTestError(undefined);
    setTestPhase("idle");
    const testPreferences = latestPreferences.current;
    const MediaRecorderCtor = globalThis.MediaRecorder;
    if (typeof MediaRecorderCtor !== "function") {
      setTestError("This browser cannot record raw microphone tests.");
      return;
    }
    try {
      testSession.current = await startVoiceProcessingRecordingTest(
        voiceProcessingSettingsFromPreferences(testPreferences),
        { mediaRecorder: MediaRecorderCtor }
      );
      setTestPhase("recording");
    } catch {
      stopVoiceTestSession(testSession.current);
      testSession.current = undefined;
      setTestPhase("idle");
      setTestError("Could not start raw microphone recording test.");
    }
  }

  async function stopVoiceTestRecording() {
    const session = testSession.current;
    if (!session || session.recorder.state === "inactive") return;
    setTestError(undefined);
    try {
      setTestPhase("playback");
      updateVoiceProcessingRecordingTestPlayback(session, voiceProcessingSettingsFromPreferences(latestPreferences.current), true);
      await stopVoiceProcessingRecordingForPlayback(session);
    } catch {
      stopVoiceTest();
      setTestError("Could not finish processed microphone test playback.");
    }
  }

  function stopVoiceTest() {
    stopVoiceTestSession(testSession.current);
    testSession.current = undefined;
    setTestPhase("idle");
    setTestError(undefined);
  }

  async function runPipelineCheck() {
    setDiagnosticRunning(true);
    setDiagnosticResult(undefined);
    setDiagnosticError(undefined);
    try {
      const result = await runVoiceProcessingPipelineDiagnostic(voiceProcessingSettingsFromPreferences(latestPreferences.current), { durationMs: 1_600 });
      setDiagnosticResult(result);
    } catch {
      setDiagnosticError("Could not run the synthetic pipeline quality check in this browser.");
    } finally {
      setDiagnosticRunning(false);
    }
  }

  const testTitle = testPhase === "recording" ? "Recording raw microphone" : testPhase === "playback" ? "Looping processed recording" : "Raw-to-processed audio test";
  const testDescription = testPhase === "recording"
    ? "Speak once; this records raw mic input with browser DSP disabled"
    : testPhase === "playback"
      ? "The fixed raw recording is looping through the live gain, VAD, PTT, and DTLN settings"
      : "Record raw mic audio, stop, then hear the processing stack applied to that recording";
  const testButtonLabel = testPhase === "recording" ? "Stop recording" : testPhase === "playback" ? "Stop playback" : "Start recording";
  const testButtonAction = testPhase === "recording" ? stopVoiceTestRecording : testPhase === "playback" ? stopVoiceTest : () => void startVoiceTestRecording();

  return (
    <div className="voice-settings-shroud" onMouseDown={onClose}>
      <section className="voice-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="voice-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="voice-settings-header">
          <span>
            <h2 id="voice-settings-title">Voice settings</h2>
            <small>Microphone processing for this device</small>
          </span>
          <button className="self-icon-button" type="button" aria-label="Close voice settings" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="voice-settings-body">
          <section className="voice-settings-section" aria-labelledby="voice-gain-heading">
            <h3 id="voice-gain-heading">Gain</h3>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draftPreferences.dynamicGainControl}
                onChange={(event) => update({ dynamicGainControl: event.target.checked })}
              />
              <span>
                <strong>Dynamic gain control</strong>
                <small>Use browser input gain correction when supported</small>
              </span>
            </label>
            <label className="settings-range-row">
              <span>
                <strong>Input gain</strong>
                <small>{inputGainPercent(draftPreferences)}%</small>
              </span>
              <input
                aria-label="Input gain"
                type="range"
                min="0"
                max="200"
                value={inputGainSliderValue(draftPreferences)}
                onChange={(event) => update({ inputGain: inputGainFromSliderValue(Number(event.target.value)) })}
              />
            </label>
          </section>

          <section className="voice-settings-section" aria-labelledby="voice-input-heading">
            <h3 id="voice-input-heading">Input mode</h3>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draftPreferences.pushToTalk}
                onChange={(event) => update({ pushToTalk: event.target.checked })}
              />
              <span>
                <strong>Push to talk</strong>
                <small>Hold the key before audio is sent</small>
              </span>
            </label>
            <div className={`settings-keybind${draftPreferences.pushToTalk ? "" : " disabled"}`}>
              <span>
                <strong>Keybind</strong>
                <small>{recordingKey ? "Press any key" : keyLabel(draftPreferences.pttKey)}</small>
              </span>
              <button className="secondary-action" type="button" disabled={!draftPreferences.pushToTalk || recordingKey} onClick={() => setRecordingKey(true)}>
                {recordingKey ? "Listening" : "Change"}
              </button>
            </div>
          </section>

          <section className="voice-settings-section" aria-labelledby="voice-test-heading">
            <h3 id="voice-test-heading">Test</h3>
            <div className="settings-test-row">
              <span>
                <strong>{testTitle}</strong>
                <small>{testDescription}</small>
              </span>
              <button className="secondary-action" type="button" onClick={testButtonAction}>
                {testButtonLabel}
              </button>
            </div>
            <p className="voice-test-note">Opening voice settings disconnects your outbound audio while keeping you in the channel. This test records unprocessed mic audio, then loops that fixed sample through a live copy of the outbound processing graph, so slider and toggle changes update what you hear immediately.</p>
            <div className="settings-test-row">
              <span>
                <strong>Processing pipeline quality check</strong>
                <small>Sends a synthetic signal through the processing graph and checks level, clipping, and dropouts</small>
              </span>
              <button className="secondary-action" type="button" disabled={diagnosticRunning} onClick={() => void runPipelineCheck()}>
                {diagnosticRunning ? "Checking" : "Run check"}
              </button>
            </div>
            {diagnosticResult ? <p className={`voice-test-diagnostic${diagnosticResult.passed ? " pass" : " fail"}`}>{diagnosticSummary(diagnosticResult)}</p> : null}
            {diagnosticError ? <p className="voice-test-error">{diagnosticError}</p> : null}
            {testError ? <p className="voice-test-error">{testError}</p> : null}
          </section>

          <section className="voice-settings-section" aria-labelledby="voice-cleanup-heading">
            <h3 id="voice-cleanup-heading">Cleanup</h3>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draftPreferences.sileroVad}
                disabled={draftPreferences.pushToTalk}
                onChange={(event) => update({ sileroVad: event.target.checked })}
              />
              <span>
                <strong>Silero VAD</strong>
                <small>Gate speech with the Silero model when push to talk is off</small>
              </span>
            </label>
            <label className={`settings-range-row${draftPreferences.sileroVad && !draftPreferences.pushToTalk ? "" : " disabled"}`}>
              <span>
                <strong>VAD threshold</strong>
                <small>{draftPreferences.vadThreshold.toFixed(3)}</small>
              </span>
              <input
                aria-label="VAD threshold"
                type="range"
                min="1"
                max="1000"
                value={thresholdSliderValue(draftPreferences)}
                disabled={!draftPreferences.sileroVad || draftPreferences.pushToTalk}
                onChange={(event) => update({ vadThreshold: Number(event.target.value) / 1000 })}
              />
            </label>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draftPreferences.dtlnNoiseSuppression}
                onChange={(event) => update({ dtlnNoiseSuppression: event.target.checked })}
              />
              <span>
                <strong>DTLN noise suppression</strong>
                <small>Use the bundled neural denoiser worklet when available</small>
              </span>
            </label>
          </section>
        </div>
      </section>
    </div>
  );
}
