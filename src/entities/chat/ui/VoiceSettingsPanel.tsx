import React, { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { runVoiceProcessingPipelineDiagnostic, type VoicePipelineDiagnosticResult } from "matterhorn-sdk/browser/voicePipelineDiagnostics";
import {
  startVoiceProcessingRecordingTest,
  stopVoiceProcessingRecordingForPlayback,
  stopVoiceProcessingRecordingTest,
  updateVoiceProcessingRecordingTestPlayback,
  type VoiceProcessingRecordingTestSession
} from "matterhorn-sdk/browser/voiceOutboundRecordingTest";
import { pttKeyFromKeyboardEvent, voiceProcessingSettingsFromPreferences, type VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { Switch } from "@features/management/ui/Controls";
import { panel, option, range, button, misc } from "@features/management/ui/manage.styles";

const MIN_POSITIVE_INPUT_GAIN = 0.01;
const MAX_INPUT_GAIN = 3;

type VoiceTestPhase = "idle" | "recording" | "playback";

function inputGainPercent(preferences: VoicePreferences) {
  return Math.round(Math.max(0, Math.min(MAX_INPUT_GAIN, preferences.inputGain)) * 100);
}

function inputGainSliderValue(preferences: VoicePreferences) {
  const gain = Math.max(0, Math.min(MAX_INPUT_GAIN, preferences.inputGain));
  if (gain <= 0) return 0;
  if (gain < 1) return Math.round(Math.log(gain / MIN_POSITIVE_INPUT_GAIN) / Math.log(1 / MIN_POSITIVE_INPUT_GAIN) * 100);
  return 100 + Math.round(Math.log(gain) / Math.log(MAX_INPUT_GAIN) * 100);
}

function rangeFill(value: number, max: number) {
  return { "--fill": `${Math.max(0, Math.min(max, value)) / max * 100}%` } as React.CSSProperties;
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

export function diagnosticSummary(result: VoicePipelineDiagnosticResult): string {
  const dropout = `${(result.metrics.dropoutRatio * 100).toFixed(1)}% dropout`;
  const rms = `${Math.round(result.metrics.rmsRatio * 100)}% level`;
  const latency = `${Math.round(result.metrics.latencyMs)}ms latency`;
  if (result.passed) return `Passed · ${rms}, ${dropout}, ${latency}`;
  return `Failed · ${result.reasons[0] || `${rms}, ${dropout}, ${latency}`}`;
}

export function VoiceSettingsPanel({
  preferences,
  onChange
}: {
  preferences: VoicePreferences;
  onChange: (preferences: VoicePreferences) => void;
}) {
  const [recordingKey, setRecordingKey] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState(preferences);
  const [testPhase, setTestPhase] = useState<VoiceTestPhase>("idle");
  const [testError, setTestError] = useState<string | undefined>();
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<VoicePipelineDiagnosticResult | undefined>();
  const [diagnosticError, setDiagnosticError] = useState<string | undefined>();
  const testSession = useRef<VoiceProcessingRecordingTestSession | undefined>(undefined);
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

  const gainSliderValue = inputGainSliderValue(draftPreferences);
  const thresholdValue = thresholdSliderValue(draftPreferences);
  const testTitle = testPhase === "recording" ? "Recording raw microphone" : testPhase === "playback" ? "Looping processed recording" : "Raw-to-processed audio test";
  const testDescription = testPhase === "recording"
    ? "Speak once; this records raw mic input with browser DSP disabled."
    : testPhase === "playback"
      ? "The fixed raw recording is looping through the live gain, VAD, PTT, and DTLN settings."
      : "Records unprocessed mic audio, then loops that fixed sample through a live copy of the outbound processing graph.";
  const testButtonLabel = testPhase === "recording" ? "Stop recording" : testPhase === "playback" ? "Stop playback" : "Start recording";
  const testButtonAction = testPhase === "recording" ? stopVoiceTestRecording : testPhase === "playback" ? stopVoiceTest : () => void startVoiceTestRecording();

  return (
    <>
      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}><h3 id="voice-gain-heading" {...stylex.props(panel.h3)}>Input gain</h3></header>
        <div {...stylex.props(panel.body)}>
          <div {...stylex.props(option.opt, option.optFirst)}>
            <span {...stylex.props(option.optMain)}>
              <span {...stylex.props(option.optTitle)}>Dynamic gain control</span>
              <span {...stylex.props(option.optDesc)}>Use browser input-gain correction when supported.</span>
            </span>
            <span {...stylex.props(option.optEnd)}>
              <Switch checked={draftPreferences.dynamicGainControl} onChange={(v) => update({ dynamicGainControl: v })} aria-label="Dynamic gain control" />
            </span>
          </div>
          <div {...stylex.props(option.opt, option.optDivider, option.optLast)}>
            <span {...stylex.props(option.optMain)}>
              <span {...stylex.props(option.optTitle)}>Input gain</span>
              <div {...stylex.props(range.rangeRow)}>
                <input
                  aria-label="Input gain"
                  type="range"
                  min="0"
                  max="200"
                  value={gainSliderValue}
                  style={rangeFill(gainSliderValue, 200)}
                  onChange={(event) => update({ inputGain: inputGainFromSliderValue(Number(event.target.value)) })}
                  {...stylex.props(range.range)}
                />
                <span {...stylex.props(range.rangeVal)}>{inputGainPercent(draftPreferences)}%</span>
              </div>
            </span>
          </div>
        </div>
      </section>

      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}><h3 id="voice-input-heading" {...stylex.props(panel.h3)}>Input mode</h3></header>
        <div {...stylex.props(panel.body)}>
          <div {...stylex.props(option.opt, option.optFirst)}>
            <span {...stylex.props(option.optMain)}>
              <span {...stylex.props(option.optTitle)}>Push to talk</span>
              <span {...stylex.props(option.optDesc)}>Hold the keybind before audio is sent. When off, your mic is open.</span>
            </span>
            <span {...stylex.props(option.optEnd)}>
              <Switch checked={draftPreferences.pushToTalk} onChange={(v) => update({ pushToTalk: v })} aria-label="Push to talk" />
            </span>
          </div>
          <div {...stylex.props(option.opt, option.optDivider, option.optLast)}>
            <span {...stylex.props(option.optMain)}>
              <span {...stylex.props(option.optTitle)}>Keybind</span>
              <span {...stylex.props(option.optDesc)}>The key held to transmit while push-to-talk is on.</span>
            </span>
            <span {...stylex.props(option.optEnd)}>
              <kbd {...stylex.props(misc.kbd)}>{recordingKey ? "Listening" : keyLabel(draftPreferences.pttKey)}</kbd>
              <button type="button" disabled={!draftPreferences.pushToTalk || recordingKey} onClick={() => setRecordingKey(true)} {...stylex.props(button.btn, button.ghost, button.sm)}>
                {recordingKey ? "Listening" : "Change"}
              </button>
            </span>
          </div>
        </div>
      </section>

      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}><h3 id="voice-test-heading" {...stylex.props(panel.h3)}>Test &amp; diagnostics</h3></header>
        <div {...stylex.props(panel.body)}>
          <div {...stylex.props(option.opt, option.optFirst)}>
            <span {...stylex.props(option.optMain)}>
              <span {...stylex.props(option.optTitle)}>{testTitle}</span>
              <span {...stylex.props(option.optDesc)}>{testDescription}</span>
            </span>
            <span {...stylex.props(option.optEnd)}>
              <button type="button" onClick={testButtonAction} {...stylex.props(button.btn, button.ghost, button.sm)}>{testButtonLabel}</button>
            </span>
          </div>
          <p {...stylex.props(misc.note)}>Opening this page disconnects outbound audio while keeping you in the channel. Slider and toggle changes update what you hear immediately during playback.</p>
          <div {...stylex.props(option.opt, option.optDivider, option.optLast)}>
            <span {...stylex.props(option.optMain)}>
              <span {...stylex.props(option.optTitle)}>Processing pipeline quality check</span>
              <span {...stylex.props(option.optDesc)}>Sends a synthetic signal through the processing graph and checks level, clipping, and dropouts.</span>
            </span>
            <span {...stylex.props(option.optEnd)}>
              <button type="button" disabled={diagnosticRunning} onClick={() => void runPipelineCheck()} {...stylex.props(button.btn, button.ghost, button.sm)}>
                {diagnosticRunning ? "Checking" : "Run check"}
              </button>
            </span>
          </div>
          {diagnosticResult ? <p {...stylex.props(diagnosticResult.passed ? misc.diagPass : misc.diagFail)}>{diagnosticSummary(diagnosticResult)}</p> : null}
          {diagnosticError ? <p {...stylex.props(misc.diagFail)}>{diagnosticError}</p> : null}
          {testError ? <p {...stylex.props(misc.diagFail)}>{testError}</p> : null}
        </div>
      </section>

      <section {...stylex.props(panel.panel)}>
        <header {...stylex.props(panel.head)}><h3 id="voice-cleanup-heading" {...stylex.props(panel.h3)}>Cleanup</h3></header>
        <div {...stylex.props(panel.body)}>
          <div {...stylex.props(option.opt, option.optFirst, !draftPreferences.sileroVad && option.optLast)}>
            <span {...stylex.props(option.optMain)}>
              <span {...stylex.props(option.optTitle)}>Silero VAD</span>
              <span {...stylex.props(option.optDesc)}>Gate speech with the Silero model when push-to-talk is off.</span>
            </span>
            <span {...stylex.props(option.optEnd)}>
              <Switch checked={draftPreferences.sileroVad} disabled={draftPreferences.pushToTalk} onChange={(v) => update({ sileroVad: v })} aria-label="Silero VAD" />
            </span>
          </div>
          {draftPreferences.sileroVad && !draftPreferences.pushToTalk ? (
            <div {...stylex.props(option.opt, option.optDivider, option.optLast)}>
              <span {...stylex.props(option.optMain)}>
                <span {...stylex.props(option.optTitle)}>VAD threshold</span>
                <div {...stylex.props(range.rangeRow)}>
                  <input
                    aria-label="VAD threshold"
                    type="range"
                    min="1"
                    max="1000"
                    value={thresholdValue}
                    style={rangeFill(thresholdValue, 1000)}
                    onChange={(event) => update({ vadThreshold: Number(event.target.value) / 1000 })}
                    {...stylex.props(range.range)}
                  />
                  <span {...stylex.props(range.rangeVal)}>{draftPreferences.vadThreshold.toFixed(3)}</span>
                </div>
              </span>
            </div>
          ) : null}
          <div {...stylex.props(option.opt, option.optDivider, option.optLast)}>
            <span {...stylex.props(option.optMain)}>
              <span {...stylex.props(option.optTitle)}>DTLN noise suppression</span>
              <span {...stylex.props(option.optDesc)}>Use the bundled neural denoiser worklet when available.</span>
            </span>
            <span {...stylex.props(option.optEnd)}>
              <Switch checked={draftPreferences.dtlnNoiseSuppression} onChange={(v) => update({ dtlnNoiseSuppression: v })} aria-label="DTLN noise suppression" />
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
