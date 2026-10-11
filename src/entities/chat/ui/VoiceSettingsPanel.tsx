import React, { useEffect, useRef, useState } from "react";
import type { MediaDeviceController, MediaDeviceState } from "matterhorn-sdk/browser/mediaDevices";
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
import { Switch } from "@shared/ui/SettingsControls";
import { range, button, misc } from "@shared/ui/manage.styles";
import { voiceSettingsStyles as vs } from "@entities/chat/ui/voiceSettings.styles";

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
  mediaDeviceController,
  preferences,
  onChange,
  view = "all"
}: {
  mediaDeviceController?: MediaDeviceController;
  preferences: VoicePreferences;
  onChange: (preferences: VoicePreferences) => void;
  view?: "all" | "voice" | "advanced";
}) {
  const [recordingKey, setRecordingKey] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState(preferences);
  const [testPhase, setTestPhase] = useState<VoiceTestPhase>("idle");
  const [testError, setTestError] = useState<string | undefined>();
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<VoicePipelineDiagnosticResult | undefined>();
  const [diagnosticError, setDiagnosticError] = useState<string | undefined>();
  const [mediaDeviceState, setMediaDeviceState] = useState<MediaDeviceState>(() => mediaDeviceController?.state() || {
    devices: [], outputVolume: 1, outputSelectionSupported: false
  });
  const [mediaDeviceError, setMediaDeviceError] = useState<string | undefined>();
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
    if (!mediaDeviceController) return undefined;
    const unsubscribe = mediaDeviceController.subscribe(setMediaDeviceState);
    void mediaDeviceController.refresh();
    return unsubscribe;
  }, [mediaDeviceController]);

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
        { mediaRecorder: MediaRecorderCtor, mediaDeviceController }
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
  const testTitle = testPhase === "recording" ? "Listening…" : testPhase === "playback" ? "Playing your test…" : "Check your microphone";
  const testDescription = testPhase === "recording"
    ? "Say something, then stop when you’re ready."
    : testPhase === "playback"
      ? "This is how your current voice settings sound."
      : "Record a short sample and hear exactly what everyone else will hear.";
  const testButtonLabel = testPhase === "recording" ? "Stop recording" : testPhase === "playback" ? "Stop playback" : "Start recording";
  const testButtonText = testPhase === "idle" ? "Let's Check" : testButtonLabel;
  const testButtonAction = testPhase === "recording" ? stopVoiceTestRecording : testPhase === "playback" ? stopVoiceTest : () => void startVoiceTestRecording();
  const showVoice = view !== "advanced";
  const showAdvanced = view !== "voice";
  const inputDevices = mediaDeviceState.devices.filter((device) => device.kind === "audioinput");
  const outputDevices = mediaDeviceState.devices.filter((device) => device.kind === "audiooutput");

  async function changeInputDevice(deviceId: string) {
    if (!mediaDeviceController) return;
    setMediaDeviceError(undefined);
    try {
      await mediaDeviceController.setInputDevice(deviceId || undefined);
    } catch (error) {
      setMediaDeviceError(error instanceof Error ? error.message : "Could not select microphone.");
    }
  }

  async function changeOutputDevice(deviceId: string) {
    if (!mediaDeviceController) return;
    setMediaDeviceError(undefined);
    try {
      await mediaDeviceController.setOutputDevice(deviceId || undefined);
    } catch (error) {
      setMediaDeviceError(error instanceof Error ? error.message : "Could not select speakers.");
    }
  }

  return (
    <div {...stylex.props(vs.stack)}>
      {showVoice ? <>
        <section {...stylex.props(vs.section)} aria-labelledby="voice-devices-heading">
          <header {...stylex.props(vs.sectionHead)}><strong id="voice-devices-heading" {...stylex.props(vs.eyebrow)}>Devices</strong><span {...stylex.props(vs.sectionDesc)}>Mosh uses the microphone and speakers selected by your browser.</span></header>
          <div {...stylex.props(vs.deviceGrid)}>
            <label {...stylex.props(vs.device)}><span {...stylex.props(vs.label)}>Input device</span><select aria-label="Input device" value={mediaDeviceState.selectedInputDeviceId || ""} onChange={(event) => { void changeInputDevice(event.target.value); }} {...stylex.props(vs.selectLike)}><option value="">System default</option>{inputDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microphone"}</option>)}</select></label>
            <label {...stylex.props(vs.device)}><span {...stylex.props(vs.label)}>Output device</span><select aria-label="Output device" value={mediaDeviceState.selectedOutputDeviceId || ""} onChange={(event) => { void changeOutputDevice(event.target.value); }} {...stylex.props(vs.selectLike)}><option value="">System default</option>{outputDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Speaker"}</option>)}</select></label>
          </div>
          <p {...stylex.props(vs.notice)}>{mediaDeviceState.outputSelectionSupported ? "Device choices are saved locally for this browser." : "Speaker selection depends on browser output-routing support."}</p>
          {mediaDeviceError ? <p {...stylex.props(vs.error)}>{mediaDeviceError}</p> : null}
        </section>

        <section {...stylex.props(vs.section)} aria-labelledby="voice-output-volume-heading">
          <header {...stylex.props(vs.sectionHead)}><strong id="voice-output-volume-heading" {...stylex.props(vs.eyebrow)}>Output volume</strong><span {...stylex.props(vs.sectionDesc)}>Adjust how loud voice audio is for you.</span></header>
          <div {...stylex.props(vs.card)}><div {...stylex.props(vs.sliderRow)}><input aria-label="Output volume" type="range" min="0" max="100" value={Math.round(mediaDeviceState.outputVolume * 100)} onChange={(event) => mediaDeviceController?.setOutputVolume(Number(event.target.value) / 100)} {...stylex.props(range.range)} /><span {...stylex.props(range.rangeVal)}>{Math.round(mediaDeviceState.outputVolume * 100)}%</span></div></div>
        </section>

        <section {...stylex.props(vs.section)} aria-labelledby="voice-volume-heading">
          <header {...stylex.props(vs.sectionHead)}><strong id="voice-volume-heading" {...stylex.props(vs.eyebrow)}>Input volume</strong><span {...stylex.props(vs.sectionDesc)}>Adjust the level sent to everyone else.</span></header>
          <div {...stylex.props(vs.card)}>
            <div {...stylex.props(vs.sliderRow)}><input aria-label="Input gain" type="range" min="0" max="200" value={gainSliderValue} style={rangeFill(gainSliderValue, 200)} onChange={(event) => update({ inputGain: inputGainFromSliderValue(Number(event.target.value)) })} {...stylex.props(range.range)} /><span {...stylex.props(range.rangeVal)}>{inputGainPercent(draftPreferences)}%</span></div>
            <div {...stylex.props(vs.divider)} />
            <div {...stylex.props(vs.row)}><span {...stylex.props(vs.rowCopy)}><span {...stylex.props(vs.rowTitle)}>Automatic gain control</span><span {...stylex.props(vs.rowDesc)}>Let the browser smooth large microphone-level changes.</span></span><Switch checked={draftPreferences.dynamicGainControl} onChange={(v) => update({ dynamicGainControl: v })} aria-label="Dynamic gain control" /></div>
          </div>
        </section>

        <section {...stylex.props(vs.section)} aria-labelledby="voice-test-heading">
          <header {...stylex.props(vs.sectionHead)}><strong id="voice-test-heading" {...stylex.props(vs.eyebrow)}>Mic test</strong><span {...stylex.props(vs.sectionDesc)}>Record a short sample and hear the processed result privately.</span></header>
          <div {...stylex.props(vs.testCard)}><span {...stylex.props(vs.testCopy)}><span {...stylex.props(vs.rowTitle)}>{testTitle}</span><span {...stylex.props(vs.rowDesc)}>{testDescription}</span></span><button type="button" aria-label={testButtonLabel} onClick={testButtonAction} {...stylex.props(button.btn, vs.testButton)}>{testButtonText}</button></div>
          <p {...stylex.props(vs.status)}>Only you hear the mic test. Your channel connection stays active.</p>
          {testError ? <p {...stylex.props(vs.error)}>{testError}</p> : null}
        </section>

        <section {...stylex.props(vs.section)} aria-labelledby="voice-input-heading">
          <header {...stylex.props(vs.sectionHead)}><strong id="voice-input-heading" {...stylex.props(vs.eyebrow)}>Input mode</strong><span {...stylex.props(vs.sectionDesc)}>Choose when your microphone transmits.</span></header>
          <div {...stylex.props(vs.modeGrid)} role="radiogroup" aria-label="Input mode">
            <button type="button" role="radio" aria-checked={!draftPreferences.pushToTalk} onClick={() => update({ pushToTalk: false })} {...stylex.props(vs.mode, !draftPreferences.pushToTalk && vs.modeSelected)}><span {...stylex.props(vs.radio, !draftPreferences.pushToTalk && vs.radioSelected)}>{!draftPreferences.pushToTalk ? <span {...stylex.props(vs.radioDot)} /> : null}</span><span {...stylex.props(vs.modeCopy)}><span {...stylex.props(vs.modeTitle)}>Voice Activity</span><span {...stylex.props(vs.modeDesc)}>Transmit automatically when voice detection is enabled.</span></span></button>
            <button type="button" role="radio" aria-checked={draftPreferences.pushToTalk} onClick={() => update({ pushToTalk: true })} {...stylex.props(vs.mode, draftPreferences.pushToTalk && vs.modeSelected)}><span {...stylex.props(vs.radio, draftPreferences.pushToTalk && vs.radioSelected)}>{draftPreferences.pushToTalk ? <span {...stylex.props(vs.radioDot)} /> : null}</span><span {...stylex.props(vs.modeCopy)}><span {...stylex.props(vs.modeTitle)}>Push to Talk</span><span {...stylex.props(vs.modeDesc)}>Transmit only while holding your chosen shortcut.</span></span></button>
          </div>
          {draftPreferences.pushToTalk ? <div {...stylex.props(vs.card)}><div {...stylex.props(vs.row)}><span {...stylex.props(vs.rowCopy)}><span {...stylex.props(vs.rowTitle)}>Shortcut</span><span {...stylex.props(vs.rowDesc)}>Hold this key while you speak.</span></span><span><kbd {...stylex.props(misc.kbd)}>{recordingKey ? "Listening" : keyLabel(draftPreferences.pttKey)}</kbd> <button type="button" disabled={recordingKey} onClick={() => setRecordingKey(true)} {...stylex.props(button.btn, button.ghost, button.sm)}>{recordingKey ? "Listening" : "Change"}</button></span></div></div> : <div {...stylex.props(vs.card)}><div {...stylex.props(vs.row)}><span {...stylex.props(vs.rowCopy)}><span {...stylex.props(vs.rowTitle)}>Voice detection</span><span {...stylex.props(vs.rowDesc)}>Use the Silero model to prevent background noise from opening your mic.</span></span><Switch checked={draftPreferences.sileroVad} onChange={(v) => update({ sileroVad: v })} aria-label="Silero VAD" /></div>{draftPreferences.sileroVad ? <><div {...stylex.props(vs.divider)} /><span {...stylex.props(vs.rowCopy)}><span {...stylex.props(vs.rowTitle)}>Input sensitivity</span><div {...stylex.props(vs.sliderRow)}><input aria-label="VAD threshold" type="range" min="1" max="1000" value={thresholdValue} style={rangeFill(thresholdValue, 1000)} onChange={(event) => update({ vadThreshold: Number(event.target.value) / 1000 })} {...stylex.props(range.range)} /><span {...stylex.props(range.rangeVal)}>{draftPreferences.vadThreshold.toFixed(3)}</span></div></span></> : null}</div>}
        </section>
      </> : null}

      {showAdvanced ? <>
        <section {...stylex.props(vs.section)} aria-labelledby="voice-processing-heading">
          <header {...stylex.props(vs.sectionHead)}><strong id="voice-processing-heading" {...stylex.props(vs.eyebrow)}>Voice processing</strong><span {...stylex.props(vs.sectionDesc)}>Optional cleanup applied before your audio is sent.</span></header>
          <div {...stylex.props(vs.card)}><div {...stylex.props(vs.row)}><span {...stylex.props(vs.rowCopy)}><span {...stylex.props(vs.rowTitle)}>Noise suppression</span><span {...stylex.props(vs.rowDesc)}>Reduces steady background noise such as fans and room hum.</span></span><Switch checked={draftPreferences.dtlnNoiseSuppression} onChange={(v) => update({ dtlnNoiseSuppression: v })} aria-label="DTLN noise suppression" /></div><div {...stylex.props(vs.divider)} /><div {...stylex.props(vs.row)}><span {...stylex.props(vs.rowCopy)}><span {...stylex.props(vs.rowTitle)}>Echo cancellation</span><span {...stylex.props(vs.rowDesc)}>Reduces sound from your speakers feeding back into your microphone.</span></span><span {...stylex.props(vs.browserBadge)}>ON</span></div></div>
        </section>
        <section {...stylex.props(vs.section)} aria-labelledby="voice-diagnostics-heading">
          <header {...stylex.props(vs.sectionHead)}><strong id="voice-diagnostics-heading" {...stylex.props(vs.eyebrow)}>Diagnostics</strong><span {...stylex.props(vs.sectionDesc)}>Test audio processing without joining or transmitting.</span></header>
          <div {...stylex.props(vs.testCard)}><span {...stylex.props(vs.testCopy)}><span {...stylex.props(vs.rowTitle)}>Audio quality check</span><span {...stylex.props(vs.rowDesc)}>Checks microphone level, clipping, delay, and dropouts with a private test signal.</span></span><button type="button" disabled={diagnosticRunning} onClick={() => void runPipelineCheck()} {...stylex.props(button.btn, vs.secondaryButton)}>{diagnosticRunning ? "Checking" : "Run check"}</button></div>
          {diagnosticResult ? <p {...stylex.props(diagnosticResult.passed ? vs.pass : vs.error)}>{diagnosticSummary(diagnosticResult)}</p> : null}
          {diagnosticError ? <p {...stylex.props(vs.error)}>{diagnosticError}</p> : null}
        </section>
      </> : null}
    </div>
  );
}
