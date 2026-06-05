import React from "react";
import type { VoicePipelineDiagnosticResult } from "roomkit-sdk/browser/voicePipelineDiagnostics";
import type { VoicePreferences } from "../../localVoicePreferences";

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

export function diagnosticSummary(result: VoicePipelineDiagnosticResult): string {
  const dropout = `${(result.metrics.dropoutRatio * 100).toFixed(1)}% dropout`;
  const rms = `${Math.round(result.metrics.rmsRatio * 100)}% level`;
  const latency = `${Math.round(result.metrics.latencyMs)}ms latency`;
  if (result.passed) return `Passed · ${rms}, ${dropout}, ${latency}`;
  return `Failed · ${result.reasons[0] || `${rms}, ${dropout}, ${latency}`}`;
}

export function GainSettingsSection({
  preferences,
  onUpdate
}: {
  preferences: VoicePreferences;
  onUpdate: (partial: Partial<VoicePreferences>) => void;
}) {
  return (
    <section className="voice-settings-section" aria-labelledby="voice-gain-heading">
      <h3 id="voice-gain-heading">Gain</h3>
      <label className="settings-check-row">
        <input
          type="checkbox"
          checked={preferences.dynamicGainControl}
          onChange={(event) => onUpdate({ dynamicGainControl: event.target.checked })}
        />
        <span>
          <strong>Dynamic gain control</strong>
          <small>Use browser input gain correction when supported</small>
        </span>
      </label>
      <label className="settings-range-row">
        <span>
          <strong>Input gain</strong>
          <small>{inputGainPercent(preferences)}%</small>
        </span>
        <input
          aria-label="Input gain"
          type="range"
          min="0"
          max="200"
          value={inputGainSliderValue(preferences)}
          onChange={(event) => onUpdate({ inputGain: inputGainFromSliderValue(Number(event.target.value)) })}
        />
      </label>
    </section>
  );
}

export function InputModeSettingsSection({
  preferences,
  recordingKey,
  onRecordKey,
  onUpdate
}: {
  preferences: VoicePreferences;
  recordingKey: boolean;
  onRecordKey: () => void;
  onUpdate: (partial: Partial<VoicePreferences>) => void;
}) {
  return (
    <section className="voice-settings-section" aria-labelledby="voice-input-heading">
      <h3 id="voice-input-heading">Input mode</h3>
      <label className="settings-check-row">
        <input
          type="checkbox"
          checked={preferences.pushToTalk}
          onChange={(event) => onUpdate({ pushToTalk: event.target.checked })}
        />
        <span>
          <strong>Push to talk</strong>
          <small>Hold the key before audio is sent</small>
        </span>
      </label>
      <div className={`settings-keybind${preferences.pushToTalk ? "" : " disabled"}`}>
        <span>
          <strong>Keybind</strong>
          <small>{recordingKey ? "Press any key" : keyLabel(preferences.pttKey)}</small>
        </span>
        <button className="secondary-action" type="button" disabled={!preferences.pushToTalk || recordingKey} onClick={onRecordKey}>
          {recordingKey ? "Listening" : "Change"}
        </button>
      </div>
    </section>
  );
}

export function VoiceTestSettingsSection({
  diagnosticError,
  diagnosticResult,
  diagnosticRunning,
  onRunDiagnostic,
  onToggleTest,
  testButtonLabel,
  testDescription,
  testError,
  testTitle
}: {
  diagnosticError?: string;
  diagnosticResult?: VoicePipelineDiagnosticResult;
  diagnosticRunning: boolean;
  onRunDiagnostic: () => void;
  onToggleTest: () => void;
  testButtonLabel: string;
  testDescription: string;
  testError?: string;
  testTitle: string;
}) {
  return (
    <section className="voice-settings-section" aria-labelledby="voice-test-heading">
      <h3 id="voice-test-heading">Test</h3>
      <div className="settings-test-row">
        <span>
          <strong>{testTitle}</strong>
          <small>{testDescription}</small>
        </span>
        <button className="secondary-action" type="button" onClick={onToggleTest}>
          {testButtonLabel}
        </button>
      </div>
      <p className="voice-test-note">Opening voice settings disconnects your outbound audio while keeping you in the channel. This test records unprocessed mic audio, then loops that fixed sample through a live copy of the outbound processing graph, so slider and toggle changes update what you hear immediately.</p>
      <div className="settings-test-row">
        <span>
          <strong>Processing pipeline quality check</strong>
          <small>Sends a synthetic signal through the processing graph and checks level, clipping, and dropouts</small>
        </span>
        <button className="secondary-action" type="button" disabled={diagnosticRunning} onClick={onRunDiagnostic}>
          {diagnosticRunning ? "Checking" : "Run check"}
        </button>
      </div>
      {diagnosticResult ? <p className={`voice-test-diagnostic${diagnosticResult.passed ? " pass" : " fail"}`}>{diagnosticSummary(diagnosticResult)}</p> : null}
      {diagnosticError ? <p className="voice-test-error">{diagnosticError}</p> : null}
      {testError ? <p className="voice-test-error">{testError}</p> : null}
    </section>
  );
}

export function CleanupSettingsSection({
  preferences,
  onUpdate
}: {
  preferences: VoicePreferences;
  onUpdate: (partial: Partial<VoicePreferences>) => void;
}) {
  return (
    <section className="voice-settings-section" aria-labelledby="voice-cleanup-heading">
      <h3 id="voice-cleanup-heading">Cleanup</h3>
      <label className="settings-check-row">
        <input
          type="checkbox"
          checked={preferences.sileroVad}
          disabled={preferences.pushToTalk}
          onChange={(event) => onUpdate({ sileroVad: event.target.checked })}
        />
        <span>
          <strong>Silero VAD</strong>
          <small>Gate speech with the Silero model when push to talk is off</small>
        </span>
      </label>
      <label className={`settings-range-row${preferences.sileroVad && !preferences.pushToTalk ? "" : " disabled"}`}>
        <span>
          <strong>VAD threshold</strong>
          <small>{preferences.vadThreshold.toFixed(3)}</small>
        </span>
        <input
          aria-label="VAD threshold"
          type="range"
          min="1"
          max="1000"
          value={thresholdSliderValue(preferences)}
          disabled={!preferences.sileroVad || preferences.pushToTalk}
          onChange={(event) => onUpdate({ vadThreshold: Number(event.target.value) / 1000 })}
        />
      </label>
      <label className="settings-check-row">
        <input
          type="checkbox"
          checked={preferences.dtlnNoiseSuppression}
          onChange={(event) => onUpdate({ dtlnNoiseSuppression: event.target.checked })}
        />
        <span>
          <strong>DTLN noise suppression</strong>
          <small>Use the bundled neural denoiser worklet when available</small>
        </span>
      </label>
    </section>
  );
}
