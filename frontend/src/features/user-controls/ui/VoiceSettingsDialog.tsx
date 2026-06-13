import React, { useEffect, useRef, useState } from "react";
import { runVoiceProcessingPipelineDiagnostic, type VoicePipelineDiagnosticResult } from "matterhorn-sdk/browser/voicePipelineDiagnostics";
import {
  startVoiceProcessingRecordingTest,
  stopVoiceProcessingRecordingForPlayback,
  stopVoiceProcessingRecordingTest,
  updateVoiceProcessingRecordingTestPlayback,
  type VoiceProcessingRecordingTestSession
} from "matterhorn-sdk/browser/voiceOutboundRecordingTest";
import { pttKeyFromKeyboardEvent, voiceProcessingSettingsFromPreferences, type VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { CloseIcon } from "@shared/ui/Icons";
import { CleanupSettingsSection, GainSettingsSection, InputModeSettingsSection, VoiceTestSettingsSection } from "@features/user-controls/ui/voiceSettings/VoiceSettingsSections";

type Props = {
  preferences: VoicePreferences;
  onChange: (preferences: VoicePreferences) => void;
  onClose: () => void;
};

type VoiceTestPhase = "idle" | "recording" | "playback";

function stopVoiceTestSession(session: VoiceProcessingRecordingTestSession | undefined) {
  stopVoiceProcessingRecordingTest(session);
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
          <GainSettingsSection preferences={draftPreferences} onUpdate={update} />
          <InputModeSettingsSection
            preferences={draftPreferences}
            recordingKey={recordingKey}
            onRecordKey={() => setRecordingKey(true)}
            onUpdate={update}
          />
          <VoiceTestSettingsSection
            diagnosticError={diagnosticError}
            diagnosticResult={diagnosticResult}
            diagnosticRunning={diagnosticRunning}
            onRunDiagnostic={() => void runPipelineCheck()}
            onToggleTest={testButtonAction}
            testButtonLabel={testButtonLabel}
            testDescription={testDescription}
            testError={testError}
            testTitle={testTitle}
          />
          <CleanupSettingsSection preferences={draftPreferences} onUpdate={update} />
        </div>
      </section>
    </div>
  );
}
