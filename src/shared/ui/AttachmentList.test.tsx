import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentList } from "@shared/ui/AttachmentList";
import type { AttachmentRecord, EncryptedFileRecord } from "@shared/model/attachments";

const file: EncryptedFileRecord = { fileId: "file-1", title: "Meeting notes.txt", mimeType: "text/plain", scopeType: "channel", scopeId: "general", encryptedManifest: {}, ciphertextBytes: 1, chunkCount: 1, relays: [] };
const attachment: AttachmentRecord = { id: "attachment-1", title: "Drive doc", provider: "google-drive", assetId: "asset-1" };

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

  it("decrypts image attachments into inline previews and releases the object URL", async () => {
    const imageFile = { ...file, title: "photo.webp", mimeType: "image/webp" };
    const preview = vi.fn(async () => new Blob(["image"], { type: "image/webp" }));
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { unmount } = render(<AttachmentList attachments={[]} files={[imageFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={preview} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading preview");
    expect(await screen.findByRole("img", { name: "Preview of photo.webp" })).toHaveAttribute("src", "blob:preview");
    expect(preview).toHaveBeenCalledWith(imageFile);
    expect(createObjectUrl).toHaveBeenCalled();
    unmount();
    await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledWith("blob:preview"));
  });

  it("keeps the download card usable when an image preview cannot be loaded", async () => {
    const imageFile = { ...file, title: "photo.webp", mimeType: "image/webp" };
    render(<AttachmentList attachments={[]} files={[imageFile]} onDownload={vi.fn()} onOpenAttachment={vi.fn()} onPreview={vi.fn(async () => { throw new Error("decrypt failed"); })} />);

    expect(await screen.findByText("Preview unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });
});
