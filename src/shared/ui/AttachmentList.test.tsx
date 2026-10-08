import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentList } from "@shared/ui/AttachmentList";
import type { AttachmentRecord, EncryptedFileRecord } from "@shared/model/attachments";

const file: EncryptedFileRecord = { fileId: "file-1", title: "Meeting notes.txt", mimeType: "text/plain", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 1, chunkCount: 1, relays: [] };
const attachment: AttachmentRecord = { id: "attachment-1", title: "Drive doc", provider: "google-drive", assetId: "asset-1" };

afterEach(() => vi.restoreAllMocks());

describe("AttachmentList", () => {
  it("renders nothing for an empty scope", () => {
    const { container } = render(<AttachmentList attachments={[]} files={[]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders encrypted files and provider attachments and dispatches clicks", () => {
    const download = vi.fn();
    const open = vi.fn();
    render(<AttachmentList attachments={[attachment]} files={[file]} onDownload={download} onOpenAttachment={open} />);
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(screen.getByRole("button", { name: /Drive doc/ }));
    expect(download).toHaveBeenCalledWith(file);
    expect(open).toHaveBeenCalledWith(attachment);
    expect(screen.getByText("Meeting notes.txt")).toBeInTheDocument();
    expect(screen.queryByText("file-1")).not.toBeInTheDocument();
    expect(screen.getByText("google-drive")).toBeInTheDocument();
  });

  it("keeps an unchanged image preview across reconstructed records and callbacks", async () => {
    const imageFile = { ...file, title: "photo.webp", mimeType: "image/webp", revision: 1 };
    const preview = vi.fn(async () => new Blob(["image"], { type: "image/webp" }));
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { rerender, unmount } = render(<AttachmentList attachments={[]} files={[imageFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={preview} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading preview");
    expect(await screen.findByRole("img", { name: "Preview of photo.webp" })).toHaveAttribute("src", "blob:preview");
    expect(preview).toHaveBeenCalledWith(imageFile);
    rerender(<AttachmentList attachments={[]} files={[{ ...imageFile }]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={vi.fn(preview)} />);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    unmount();
    await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledWith("blob:preview"));
  });

  it("loads exactly one new preview when the encrypted file revision changes", async () => {
    const imageFile = { ...file, title: "photo.webp", mimeType: "image/webp", revision: 1 };
    const preview = vi.fn(async (record: EncryptedFileRecord) => new Blob([String(record.revision)], { type: "image/webp" }));
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValueOnce("blob:revision-1").mockReturnValueOnce("blob:revision-2");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { rerender } = render(<AttachmentList attachments={[]} files={[imageFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={preview} />);
    expect(await screen.findByRole("img")).toHaveAttribute("src", "blob:revision-1");

    rerender(<AttachmentList attachments={[]} files={[{ ...imageFile, revision: 2 }]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={preview} />);

    expect(await screen.findByRole("img")).toHaveAttribute("src", "blob:revision-2");
    expect(preview).toHaveBeenCalledTimes(2);
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:revision-1");
  });

  it("keeps the download card usable when an image preview cannot be loaded", async () => {
    const imageFile = { ...file, title: "photo.webp", mimeType: "image/webp" };
    render(<AttachmentList attachments={[]} files={[imageFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={vi.fn(async () => { throw new Error("decrypt failed"); })} />);

    expect(await screen.findByText("Preview unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });

  it("loads encrypted audio into the custom waveform player and cleans up its object URL", async () => {
    const audioFile = { ...file, title: "voice-message.webm", mimeType: "audio/webm", revision: 1 };
    const preview = vi.fn(async () => new Blob(["audio"], { type: "audio/webm" }));
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:audio-preview");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { rerender, unmount, container } = render(<AttachmentList attachments={[]} files={[audioFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={preview} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading audio");
    const audio = await waitFor(() => {
      const element = container.querySelector("audio");
      expect(element).toBeTruthy();
      return element as HTMLAudioElement;
    });
    expect(audio).not.toHaveAttribute("controls");
    expect(audio).toHaveAttribute("preload", "none");
    expect(audio.querySelector("source")).toHaveAttribute("src", "blob:audio-preview");
    expect(screen.getByRole("button", { name: "Play voice-message.webm" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Seek voice-message.webm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();

    rerender(<AttachmentList attachments={[]} files={[{ ...audioFile }]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={vi.fn(preview)} />);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    unmount();
    await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledWith("blob:audio-preview"));
  });

  it("keeps the audio download card usable when decryption fails", async () => {
    const audioFile = { ...file, title: "voice-message.webm", mimeType: "audio/webm" };
    render(<AttachmentList attachments={[]} files={[audioFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={vi.fn(async () => { throw new Error("decrypt failed"); })} />);

    expect(await screen.findByText("Playback unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });

  it("reports an audio decode failure and releases the preview URL", async () => {
    const audioFile = { ...file, title: "voice-message.webm", mimeType: "audio/webm" };
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:audio-error");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { container } = render(<AttachmentList attachments={[]} files={[audioFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={vi.fn(async () => new Blob(["audio"], { type: "audio/webm" }))} />);
    const audio = await waitFor(() => {
      const element = container.querySelector("audio");
      expect(element).toBeTruthy();
      return element as HTMLAudioElement;
    });

    fireEvent.error(audio);

    expect(await screen.findByText("Playback unavailable")).toBeInTheDocument();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:audio-error");
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });

  it("replaces audio playback when encrypted content revision changes", async () => {
    const audioFile = { ...file, title: "voice-message.webm", mimeType: "audio/webm", revision: 1 };
    const preview = vi.fn(async (record: EncryptedFileRecord) => new Blob([String(record.revision)], { type: "audio/webm" }));
    vi.spyOn(URL, "createObjectURL").mockReturnValueOnce("blob:audio-revision-1").mockReturnValueOnce("blob:audio-revision-2");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { rerender, container } = render(<AttachmentList attachments={[]} files={[audioFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={preview} />);
    await waitFor(() => expect(container.querySelector("audio source")).toHaveAttribute("src", "blob:audio-revision-1"));

    rerender(<AttachmentList attachments={[]} files={[{ ...audioFile, revision: 2 }]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={preview} />);

    await waitFor(() => expect(container.querySelector("audio source")).toHaveAttribute("src", "blob:audio-revision-2"));
    expect(preview).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:audio-revision-1");
  });
});
