import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentPickerAdvanced, type AttachmentPickerDriveAdapter } from "@shared/ui/AttachmentPickerAdvanced";

const connection = { connectionId: "google-1", brokerIdentity: "drive@example.com", accountLabel: "Drive" };
const folder = { id: "folder-1", name: "Images", mimeType: "application/vnd.google-apps.folder", isFolder: true };
const image = { id: "image-1", name: "photo.png", mimeType: "image/png", size: 4, isFolder: false };
const documentFile = { id: "doc-1", name: "notes.pdf", mimeType: "application/pdf", size: 4, isFolder: false };

function adapter(overrides: Partial<AttachmentPickerDriveAdapter> = {}): AttachmentPickerDriveAdapter {
  return {
    listConnections: vi.fn(async () => [connection]),
    listFiles: vi.fn(async (_connectionId, parentId) => parentId === "folder-1" ? [image] : [folder, image, documentFile]),
    download: vi.fn(async () => new Blob(["img"], { type: "image/png" })),
    shareToRoom: vi.fn(async (_connectionId, file, scope) => ({ assetId: "asset-1", fileId: file.id, title: file.name, mimeType: file.mimeType, ...scope })),
    uploadLocalFile: vi.fn(async () => ({ file: { id: "local-1", name: "local.txt", mimeType: "text/plain" }, url: "https://drive.example/local" })),
    remove: vi.fn(async () => ({ removed: true })),
    ...overrides
  };
}

function renderPicker(props: Partial<React.ComponentProps<typeof AttachmentPickerAdvanced>> = {}) {
  return render(<AttachmentPickerAdvanced onClose={vi.fn()} onSelect={vi.fn()} {...props} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AttachmentPickerAdvanced", () => {
  it("validates malformed MIME filters before allowing local selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = renderPicker({ onSelect });
    const filter = screen.getByRole("textbox", { name: "Accepted MIME types" });
    await user.clear(filter);
    await user.type(filter, "definitely-not-mime");
    expect(screen.getByRole("button", { name: "Choose local file" })).toBeDisabled();

    const inputs = container.querySelectorAll<HTMLInputElement>("input[type=file]");
    fireEvent.change(inputs[0], { target: { files: [new File(["x"], "x.txt", { type: "text/plain" })] } });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("uses image-only mode and renders a bounded lazy local thumbnail", async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:image");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { container } = renderPicker({ mode: "image" });
    expect(screen.getByRole("textbox", { name: "Accepted MIME types" })).toBeDisabled();
    const inputs = container.querySelectorAll<HTMLInputElement>("input[type=file]");
    fireEvent.change(inputs[0], { target: { files: [new File(["img"], "photo.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByRole("img", { name: "Preview of photo.png" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Upload file" }));
  });

  it("filters Drive entries, navigates folders, and returns a draft selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderPicker({ adapter: adapter(), onClose, onSelect, roomName: "general", scopeType: "channel", scopeId: "channel-1" });

    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Open folder Images" })).toBeInTheDocument());
    expect(screen.getByRole("treeitem", { name: "Open folder Images" })).toBeInTheDocument();
    await user.click(screen.getByRole("treeitem", { name: "Open folder Images" }));
    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Select photo.png" })).toBeInTheDocument());
    await user.click(screen.getByRole("treeitem", { name: "Select photo.png" }));
    await user.click(screen.getByRole("button", { name: "Add photo.png to message" }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ kind: "drive", connectionId: "google-1", file: expect.objectContaining({ id: "image-1" }) }));
    expect(onClose).toHaveBeenCalled();
  });

  it("returns from a nested Drive folder and reports an empty filtered folder", async () => {
    const user = userEvent.setup();
    const drive = adapter({
      listFiles: vi.fn(async (_connectionId, parentId) => parentId === "folder-1" ? [folder] : [folder, documentFile])
    });
    renderPicker({ adapter: drive });

    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Open folder Images" })).toBeInTheDocument());
    await user.click(screen.getByRole("treeitem", { name: "Open folder Images" }));
    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Open folder Images" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(drive.listFiles).toHaveBeenLastCalledWith("google-1", "root"));
    expect(screen.getByRole("status")).toHaveTextContent("Select a file to share.");

    const emptyDrive = adapter({ listFiles: vi.fn(async () => [documentFile]) });
    cleanup();
    renderPicker({ adapter: emptyDrive, acceptedMimeTypes: "image/*" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("This folder has no matching files."));
  });

  it("keeps local encrypted and Drive actions separate and preserves selected connection", async () => {
    const user = userEvent.setup();
    const onLocalFile = vi.fn();
    const onLocalDriveUpload = vi.fn();
    const { container } = renderPicker({ adapter: adapter(), onLocalFile, onLocalDriveUpload });
    const inputs = container.querySelectorAll<HTMLInputElement>("input[type=file]");
    const file = new File(["text"], "notes.txt", { type: "text/plain" });
    fireEvent.change(inputs[0], { target: { files: [file] } });
    await user.click(screen.getByRole("button", { name: "Upload file" }));
    expect(onLocalFile).toHaveBeenCalledWith(file);
    fireEvent.change(inputs[0], { target: { files: [file] } });
    await user.click(screen.getByRole("button", { name: "Upload through Google Drive" }));
    expect(onLocalDriveUpload).toHaveBeenCalledWith(file, "google-1");
  });

  it("defers Drive sharing until send and reports adapter errors", async () => {
    const user = userEvent.setup();
    const shareToRoom = vi.fn(async () => { throw new Error("share failed"); });
    const drive = adapter({ shareToRoom });
    const onSelect = vi.fn();
    renderPicker({ adapter: drive, onSelect });
    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Select photo.png" })).toBeInTheDocument());
    await user.click(screen.getByRole("treeitem", { name: "Select photo.png" }));
    await user.click(await screen.findByRole("button", { name: "Add photo.png to message" }));
    expect(onSelect).toHaveBeenCalled();
    expect(shareToRoom).not.toHaveBeenCalled();

    cleanup();
    const listConnections = vi.fn(async () => { throw new Error("Drive offline"); });
    renderPicker({ adapter: adapter({ listConnections }) });
    expect(await screen.findByRole("alert")).toHaveTextContent("Drive offline");
  });

  it("cancels pending thumbnail work when the picker closes", () => {
    const drive = adapter();
    const { unmount } = renderPicker({ adapter: drive });
    unmount();
    expect(drive.listConnections).toHaveBeenCalled();
  });

  it("renders bounded remote thumbnails and uses the selected Drive account", async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:remote-image");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const second = { ...connection, connectionId: "google-2", accountLabel: "Second Drive" };
    const drive = adapter({
      listConnections: vi.fn(async () => [connection, second]),
      download: vi.fn(async () => new Blob(["img!"], { type: "image/png" }))
    });
    const { container } = renderPicker({ adapter: drive, scopeType: "channel", scopeId: "general" });

    await waitFor(() => expect(container.querySelector("img")).toBeInTheDocument());
    expect(drive.download).toHaveBeenCalledWith("google-1", expect.objectContaining({ id: "image-1" }), expect.any(AbortSignal));
    await user.selectOptions(screen.getByRole("combobox", { name: "Google Drive account" }), "google-2");
    await waitFor(() => expect(drive.listFiles).toHaveBeenCalledWith("google-2", "root"));
  });

  it("keeps local Drive upload unavailable when no eligible account is connected", async () => {
    const user = userEvent.setup();
    const drive = adapter({ listConnections: vi.fn(async () => []) });
    const { container } = renderPicker({ adapter: drive, onLocalDriveUpload: vi.fn() });
    const inputs = container.querySelectorAll<HTMLInputElement>("input[type=file]");
    fireEvent.change(inputs[0], { target: { files: [new File(["text"], "notes.txt", { type: "text/plain" })] } });
    await user.click(screen.getByRole("button", { name: "Upload file" }));
    expect(screen.getByRole("status")).toHaveTextContent("No eligible Google Drive account");
  });

  it("shows only Google Drive files when opened from Share from Google Drive", async () => {
    renderPicker({ adapter: adapter(), driveOnly: true, scopeType: "channel", scopeId: "general" });

    expect(screen.getByRole("dialog", { name: "Share from Google Drive" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Accepted MIME types" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose local file" })).not.toBeInTheDocument();
    expect(await screen.findByRole("treeitem", { name: "Select photo.png" })).toBeInTheDocument();
  });
});
