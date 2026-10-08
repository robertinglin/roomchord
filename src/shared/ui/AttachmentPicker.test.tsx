import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AttachmentPicker } from "@shared/ui/AttachmentPicker";
import type { AttachmentPickerDriveAdapter } from "@shared/model/attachmentPicker";

const transfer = { phase: "idle" as const };
const driveAdapter: AttachmentPickerDriveAdapter = {
  listConnections: vi.fn(async () => [{ connectionId: "drive-1", brokerIdentity: "drive", accountLabel: "My Drive" }]),
  listFiles: vi.fn(async () => [{ id: "file-1", name: "drive-notes.txt", mimeType: "text/plain", isFolder: false }]),
  download: vi.fn(async () => new Blob()),
  shareToRoom: vi.fn(async (_connectionId, file, scope) => ({ assetId: "asset-1", fileId: file.id, title: file.name, mimeType: file.mimeType, ...scope })),
  uploadLocalFile: vi.fn(),
  remove: vi.fn()
};

describe("AttachmentPicker", () => {
  it("fires relay and Google Drive file selections", async () => {
    const user = userEvent.setup();
    const upload = vi.fn();
    const share = vi.fn();
    const { container } = render(<AttachmentPicker onUpload={upload} onShareDrive={share} transfer={transfer} />);
    await user.click(screen.getByRole("button", { name: "Add file" }));
    await user.click(screen.getByRole("menuitem", { name: /Upload file/ }));
    await user.click(screen.getByRole("button", { name: "Add file" }));
    await user.click(screen.getByRole("menuitem", { name: /Upload through Google Drive/ }));
    const inputs = container.querySelectorAll<HTMLInputElement>("input[type=file]");
    const first = new File(["one"], "one.txt", { type: "text/plain" });
    const second = new File(["two"], "two.txt", { type: "text/plain" });
    fireEvent.change(inputs[0], { target: { files: [first] } });
    fireEvent.change(inputs[1], { target: { files: [second] } });
    expect(upload).toHaveBeenCalledWith(first);
    expect(share).toHaveBeenCalledWith(second);
  });

  it("shows transfer phases and a disabled-unavailable stub", () => {
    const upload = vi.fn();
    const { container, rerender } = render(<AttachmentPicker onUpload={upload} transfer={{ phase: "uploading", name: "one.txt", progress: 0.5 }} />);
    expect(screen.getByText("Uploading one.txt 50%")).toBeInTheDocument();
    rerender(<AttachmentPicker onUpload={upload} transfer={{ phase: "sharing", name: "one.txt" }} />);
    expect(screen.getByText("Sharing to Google Drive one.txt…")).toBeInTheDocument();
    rerender(<AttachmentPicker onUpload={upload} transfer={{ phase: "downloading", name: "one.txt" }} />);
    expect(screen.getByText("Downloading one.txt…")).toBeInTheDocument();
    rerender(<AttachmentPicker onUpload={upload} unavailableReason="DM attachments are unavailable" transfer={transfer} />);
    expect(screen.getByRole("status")).toHaveTextContent("DM attachments are unavailable");
    expect(screen.getByRole("button", { name: "Record voice message" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Add file" }));
    expect(screen.getByRole("menuitem", { name: /Upload file/ })).toBeDisabled();
    expect(container.querySelectorAll("input[type=file]")).toHaveLength(2);
  });

  it("renders transfer errors and respects disabled controls", () => {
    const upload = vi.fn();
    render(<AttachmentPicker disabled onUpload={upload} transfer={{ phase: "idle", error: "relay unavailable" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("relay unavailable");
    expect(screen.getByRole("button", { name: "Add file" })).toBeDisabled();
  });

  it("surfaces Drive recovery state after a partial room share", () => {
    render(<AttachmentPicker transfer={{ phase: "idle", error: "Google Drive sharing failed.", recovery: { fileId: "drive-1", cleanupFailed: true } }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("sharing failed");
    expect(screen.getByRole("status")).toHaveTextContent("drive-1 must be removed manually");
  });

  it("keeps Google Drive browsing disabled until its adapter is configured", () => {
    render(<AttachmentPicker transfer={transfer} />);

    fireEvent.click(screen.getByRole("button", { name: "Add file" }));
    const shareFromDrive = screen.getByRole("menuitem", { name: /Share from Google Drive/ });
    expect(shareFromDrive).toBeDisabled();
  });

  it("presents the three distinct upload paths", async () => {
    const user = userEvent.setup();
    const upload = vi.fn();
    const share = vi.fn();
    const onSelect = vi.fn();
    render(<AttachmentPicker advancedPicker={{ adapter: driveAdapter, onSelect, scopeType: "channel", scopeId: "general" }} onUpload={upload} onShareDrive={share} transfer={transfer} />);

    await user.click(screen.getByRole("button", { name: "Add file" }));
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    expect(screen.getByRole("menuitem", { name: /Upload file/ })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: /Upload through Google Drive/ })).toBeEnabled();
    await user.click(screen.getByRole("menuitem", { name: /Share from Google Drive/ }));
    expect(screen.getByRole("dialog", { name: "Share from Google Drive" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose local file" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("treeitem", { name: "Select drive-notes.txt" }));
    await user.click(screen.getByRole("button", { name: "Add drive-notes.txt to message" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ kind: "drive" }));
  });

  it("opens the local Google Drive upload input", async () => {
    const user = userEvent.setup();
    const share = vi.fn();
    const { container } = render(<AttachmentPicker onShareDrive={share} transfer={transfer} />);

    await user.click(screen.getByRole("button", { name: "Add file" }));
    await user.click(screen.getByRole("menuitem", { name: /Upload through Google Drive/ }));
    const pickerInputs = container.querySelectorAll<HTMLInputElement>("input[type=file]");
    const file = new File(["text"], "notes.txt", { type: "text/plain" });
    fireEvent.change(pickerInputs[1], { target: { files: [file] } });
    expect(share).toHaveBeenCalledWith(file);
  });

  it("records a voice message and only offers local destinations", async () => {
    const user = userEvent.setup();
    const upload = vi.fn();
    const share = vi.fn();
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const getUserMedia = vi.fn(async () => stream);
    const OriginalMediaRecorder = globalThis.MediaRecorder;
    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported() { return true; }
      state: RecordingState = "inactive";
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        this.dispatchEvent(new MessageEvent("dataavailable", { data: new Blob(["voice"], { type: "audio/webm" }) }));
        this.dispatchEvent(new Event("stop"));
      }
    }
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });
    try {
      render(<AttachmentPicker onUpload={upload} onShareDrive={share} transfer={transfer} />);
      await user.click(screen.getByRole("button", { name: "Record voice message" }));
      await user.click(screen.getByRole("button", { name: "Stop voice recording" }));
      expect(screen.getByText("Voice message preview")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Add recording to message" }));
      expect(upload).toHaveBeenCalledWith(expect.any(File));
      expect(share).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: OriginalMediaRecorder });
    }
  });

  it("waits for microphone permission before recording and provides an audio preview", async () => {
    const user = userEvent.setup();
    const upload = vi.fn();
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    let resolvePermission!: (value: MediaStream) => void;
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => { resolvePermission = resolve; }));
    const OriginalMediaRecorder = globalThis.MediaRecorder;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn(() => "blob:voice-preview");
    const revokeObjectURL = vi.fn();
    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported() { return true; }
      state: RecordingState = "inactive";
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        this.dispatchEvent(new MessageEvent("dataavailable", { data: new Blob(["voice"], { type: "audio/webm" }) }));
        this.dispatchEvent(new Event("stop"));
      }
    }
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    try {
      render(<AttachmentPicker onUpload={upload} transfer={transfer} />);
      await user.click(screen.getByRole("button", { name: "Record voice message" }));
      expect(screen.getByRole("status")).toHaveTextContent("Waiting for microphone permission");
      expect(screen.getByRole("button", { name: "Requesting microphone permission" })).toBeDisabled();
      expect(screen.queryByRole("timer")).not.toBeInTheDocument();

      await act(async () => { resolvePermission(stream); });
      expect(screen.getByRole("button", { name: "Stop voice recording" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Live voice waveform" })).toBeInTheDocument();
      expect(screen.getByRole("timer", { name: /Recording duration/ })).toHaveTextContent("0:00");
      await user.click(screen.getByRole("button", { name: "Stop and preview" }));

      expect(document.querySelector("audio source[src='blob:voice-preview']")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Play recorded voice message" })).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Seek recorded voice message" })).toBeInTheDocument();
      expect(screen.getByRole("timer", { name: /recorded voice message playback time/ })).toHaveTextContent("0:00 / 0:00");
      expect(screen.getByRole("button", { name: "Discard recording" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Record again" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add recording through Google Drive" })).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "Add recording to message" }));
      expect(upload).toHaveBeenCalledWith(expect.any(File));
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:voice-preview");
      expect(track.stop).toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: OriginalMediaRecorder });
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL });
    }
  });

  it("explains denied microphone permission and stops a late permission stream after unmount", async () => {
    const user = userEvent.setup();
    const denied = vi.fn(async () => { throw new DOMException("Permission denied", "NotAllowedError"); });
    const OriginalMediaRecorder = globalThis.MediaRecorder;
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: denied } });
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: class FakeMediaRecorder {} });
    try {
      const deniedRender = render(<AttachmentPicker transfer={transfer} />);
      await user.click(screen.getByRole("button", { name: "Record voice message" }));
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Microphone permission was denied"));
      deniedRender.unmount();
    } finally {
      Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: OriginalMediaRecorder });
    }

    let resolvePermission!: (value: MediaStream) => void;
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const deferred = vi.fn(() => new Promise<MediaStream>((resolve) => { resolvePermission = resolve; }));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: deferred } });
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: class FakeMediaRecorder {} });
    const { unmount } = render(<AttachmentPicker transfer={transfer} />);
    await user.click(screen.getByRole("button", { name: "Record voice message" }));
    unmount();
    await act(async () => { resolvePermission(stream); });
    expect(track.stop).toHaveBeenCalled();
  });
});
