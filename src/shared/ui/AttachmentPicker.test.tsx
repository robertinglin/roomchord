import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
});
