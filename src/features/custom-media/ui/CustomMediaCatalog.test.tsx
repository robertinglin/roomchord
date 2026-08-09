import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MatterhornCustomMediaClient } from "matterhorn-sdk/browser";
import type { DrivePickerAdapter } from "@shared/model/drivePickerAdapter";
import { CustomMediaCatalog } from "@features/custom-media/ui/CustomMediaCatalog";

const record = {
  id: "media-1",
  scopeType: "channel",
  scopeId: "general",
  mediaType: "emoji" as const,
  name: "party",
  reference: { kind: "files-v2" as const, id: "file-1", scopeType: "channel", scopeId: "general" },
  render: { mode: "image" as const, altText: "party" }
};

function client(overrides: Partial<MatterhornCustomMediaClient> = {}) {
  return {
    capabilities: vi.fn(() => ({ encryptedFiles: true, driveAssets: false, providerSearch: true, providerUpload: true })),
    providerCapabilities: vi.fn(async () => [{ provider: "giphy", mediaTypes: ["emoji", "sticker", "gif"], search: true, import: true, requiresConsent: true, maxResults: 10 }]),
    searchProvider: vi.fn(async () => ({ items: [{ provider: "giphy", id: "result-1", mediaType: "gif", name: "Party", mimeType: "image/gif", importToken: "opaque-token", previewId: "preview-1" }] })),
    previewProviderResult: vi.fn(async () => new Blob(["preview"], { type: "image/gif" })),
    importProviderResult: vi.fn(async () => ({ operation: {}, fileId: "file-2", referenceKind: "files-v2" as const })),
    register: vi.fn(async () => undefined),
    upload: vi.fn(async () => ({ upload: { fileId: "file-3" }, operation: {} })),
    remove: vi.fn(async () => undefined),
    reference: vi.fn(async (mediaId: string) => ({ mediaId, scopeType: "channel", scopeId: "general", mediaType: "emoji" as const })),
    recordVoiceMessage: vi.fn(async () => ({ upload: { fileId: "voice-file" }, operation: {}, fileId: "voice-file", referenceKind: "files-v2" as const, playback: { kind: "files-v2" as const, id: "voice-file" }, durationMs: 1000, mimeType: "audio/webm" })),
    forScope: vi.fn(async () => [record]),
    byId: vi.fn(async () => record),
    safeRenderMetadata: vi.fn((value) => value),
    ...overrides
  } as unknown as MatterhornCustomMediaClient;
}

function drivePicker(): DrivePickerAdapter {
  return {
    listConnections: vi.fn(async () => [{ connectionId: "drive-1", provider: "google-drive", brokerIdentity: "drive", status: "active", scopes: [], features: ["files.content.read", "files.metadata.read", "files.create", "files.delete", "permissions.write"], updatedAt: 1, accountLabel: "Team Drive" }]),
    listFiles: vi.fn(async () => []), download: vi.fn(async () => new Blob()),
    shareToRoom: vi.fn(async () => ({ assetId: "asset", fileId: "file", title: "file", mimeType: "image/png", scopeType: "channel", scopeId: "general" })),
    uploadLocalFile: vi.fn(), remove: vi.fn()
  };
}

describe("CustomMediaCatalog", () => {
  it("loads scoped records, uploads/removes files, and selects typed references", async () => {
    const user = userEvent.setup();
    const value = client();
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByText("party · emoji")).toBeInTheDocument());
    expect(screen.getByRole("note")).toHaveTextContent("encrypted room reference");
    const file = new File(["image"], "party.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload custom media"), { target: { files: [file] } });
    await waitFor(() => expect(value.upload).toHaveBeenCalledWith(expect.objectContaining({ file, scopeType: "channel", scopeId: "general", mediaType: "emoji" })));
    // The first render intentionally has no composer callback, so insertion stays unavailable.
    expect(screen.getByRole("button", { name: "Use in message" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(value.remove).toHaveBeenCalledWith("media-1"));
  });

  it("requires explicit consent for bounded provider search, preview, and import", async () => {
    const user = userEvent.setup();
    const value = client();
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Custom media provider" })).toBeInTheDocument());
    await user.type(screen.getByLabelText("Custom media provider query"), "party");
    expect(screen.getByRole("button", { name: "Search provider" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /Allow this provider/ }));
    await user.click(screen.getByRole("button", { name: "Search provider" }));
    await waitFor(() => expect(value.searchProvider).toHaveBeenCalledWith(expect.objectContaining({ provider: "giphy", query: "party", limit: 10, timeoutMs: 10_000, consent: { provider: "giphy", purpose: "search", granted: true } })));
    await user.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(value.previewProviderResult).toHaveBeenCalled());
    expect(await screen.findByRole("status")).toHaveTextContent("bytes");
    await user.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(value.importProviderResult).toHaveBeenCalledWith(expect.objectContaining({ scopeType: "channel", scopeId: "general", storage: { kind: "files-v2" }, consent: { provider: "giphy", purpose: "import", granted: true } })));
  });

  it("obtains an authoritative reference before attaching a catalog item", async () => {
    const user = userEvent.setup();
    const value = client();
    const onSelectReference = vi.fn();
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" drivePickerAdapter={drivePicker()} onSelectReference={onSelectReference} />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByText("party · emoji")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Use in message" }));
    await waitFor(() => expect(value.reference).toHaveBeenCalledWith("media-1"));
    expect(onSelectReference).toHaveBeenCalledWith({ mediaId: "media-1", scopeType: "channel", scopeId: "general", mediaType: "emoji" });
  });

  it("records a bounded local voice message through the public SDK", async () => {
    const user = userEvent.setup();
    const value = client();
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Custom media type" }), "voice");
    await user.click(screen.getByRole("button", { name: "Record voice message" }));
    await waitFor(() => expect(value.recordVoiceMessage).toHaveBeenCalledWith(expect.objectContaining({ scopeType: "channel", scopeId: "general", maxDurationMs: 600000, storage: { kind: "files-v2" } })));
  });

  it("fails closed for recording/reference errors and supports Drive voice storage", async () => {
    const user = userEvent.setup();
    const onSelectReference = vi.fn();
    const value = client({
      capabilities: vi.fn(() => ({ encryptedFiles: true, driveAssets: true, providerSearch: true, providerUpload: true })),
      recordVoiceMessage: vi.fn(async () => { throw "record denied"; }),
      reference: vi.fn(async () => ({ mediaId: "media-1", scopeType: "channel", scopeId: "other", mediaType: "emoji" as const }))
    });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" drivePickerAdapter={drivePicker()} onSelectReference={onSelectReference} />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByLabelText("Google Drive account")).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Custom media storage"), "drive");
    await user.selectOptions(screen.getByRole("combobox", { name: "Custom media type" }), "voice");
    await user.click(screen.getByRole("button", { name: "Record voice message" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Voice message recording failed.");
    await user.click(screen.getByRole("button", { name: "Use in message" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("different room scope");
    expect(onSelectReference).not.toHaveBeenCalled();
  });

  it("fails closed when the shared Drive adapter cannot list eligible accounts", async () => {
    const user = userEvent.setup();
    const value = client({ capabilities: vi.fn(() => ({ encryptedFiles: true, driveAssets: true, providerSearch: false, providerUpload: false })) });
    const adapter = drivePicker();
    adapter.listConnections = vi.fn(async () => { throw new Error("Drive unavailable"); });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" drivePickerAdapter={adapter} />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(adapter.listConnections).toHaveBeenCalled());
    expect(screen.getByLabelText("Google Drive account")).toBeInTheDocument();
  });

  it("imports to Drive only with an explicit connection id", async () => {
    const user = userEvent.setup();
    const value = client({ capabilities: vi.fn(() => ({ encryptedFiles: true, driveAssets: true, providerSearch: true, providerUpload: true })) });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" drivePickerAdapter={drivePicker()} />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByLabelText("Google Drive account")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Custom media provider query"), "party");
    await user.click(screen.getByRole("checkbox", { name: /Allow this provider/ }));
    await user.selectOptions(screen.getByLabelText("Custom media storage"), "drive");
    await user.click(screen.getByRole("button", { name: "Search provider" }));
    await user.click(await screen.findByRole("button", { name: "Import" }));
    await waitFor(() => expect(value.importProviderResult).toHaveBeenCalledWith(expect.objectContaining({ storage: { kind: "drive", connectionId: "drive-1" } })));
  });

  it("does not switch Drive recording to Files v2 when the selected account disappears", async () => {
    const user = userEvent.setup();
    const value = client({ capabilities: vi.fn(() => ({ encryptedFiles: true, driveAssets: true, providerSearch: true, providerUpload: true })) });
    const adapter = drivePicker();
    const disconnectedAdapter = { ...adapter, listConnections: vi.fn(async () => []) };
    const rendered = render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" drivePickerAdapter={adapter} />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByLabelText("Google Drive account")).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Custom media storage"), "drive");
    await user.selectOptions(screen.getByRole("combobox", { name: "Custom media type" }), "voice");

    // Changing the adapter causes the catalog to re-authorize the selected account.
    // The stale selection stays visible so the requested Drive operation can fail closed.
    rendered.rerender(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" drivePickerAdapter={disconnectedAdapter} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("selected Google Drive account is no longer connected");
    await user.click(screen.getByRole("button", { name: "Record voice message" }));
    expect(value.recordVoiceMessage).not.toHaveBeenCalled();
  });

  it("does not switch provider import to Files v2 when the selected Drive account disappears", async () => {
    const user = userEvent.setup();
    const value = client({ capabilities: vi.fn(() => ({ encryptedFiles: true, driveAssets: true, providerSearch: true, providerUpload: true })) });
    const adapter = drivePicker();
    const disconnectedAdapter = { ...adapter, listConnections: vi.fn(async () => []) };
    const rendered = render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" drivePickerAdapter={adapter} />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByLabelText("Google Drive account")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Custom media provider query"), "party");
    await user.click(screen.getByRole("checkbox", { name: /Allow this provider/ }));
    await user.selectOptions(screen.getByLabelText("Custom media storage"), "drive");
    await user.click(screen.getByRole("button", { name: "Search provider" }));
    await screen.findByRole("button", { name: "Import" });
    rendered.rerender(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" drivePickerAdapter={disconnectedAdapter} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("selected Google Drive account is no longer connected");
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect(value.importProviderResult).not.toHaveBeenCalled();
  });

  it("surfaces bounded upload and provider errors", async () => {
    const user = userEvent.setup();
    const value = client({
      upload: vi.fn(async () => { throw new Error("upload denied"); }),
      searchProvider: vi.fn(async () => { throw new Error("provider unavailable"); })
    });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByLabelText("Upload custom media")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Upload custom media"), { target: { files: [new File(["image"], "bad.png", { type: "image/png" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("upload denied");
    await user.type(screen.getByLabelText("Custom media provider query"), "party");
    await user.click(screen.getByRole("checkbox", { name: /Allow this provider/ }));
    await user.click(screen.getByRole("button", { name: "Search provider" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("provider unavailable");
  });

  it("reports unavailable provider surfaces and catalog failures", async () => {
    const value = client({ capabilities: vi.fn(() => ({ encryptedFiles: false, driveAssets: false, providerSearch: false, providerUpload: false })), providerCapabilities: vi.fn(async () => []), forScope: vi.fn(async () => { throw new Error("catalog denied"); }) });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    fireEvent.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("catalog denied");
    expect(screen.getByText("No authorized media providers are available. Voice provider search/import uses consent and supported audio only.")).toBeInTheDocument();
  });

  it("fails closed for records with unsafe render metadata", async () => {
    const user = userEvent.setup();
    const unsafe = { ...record, id: "unsafe", name: "unsafe", render: { mode: "image", html: "<script>" } };
    const value = client({
      forScope: vi.fn(async () => [record, unsafe]),
      safeRenderMetadata: vi.fn((render) => {
        if ((render as { html?: string }).html) throw new Error("unsafe metadata");
        return render;
      })
    });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByText("party · emoji")).toBeInTheDocument());
    expect(screen.queryByText("unsafe · emoji")).not.toBeInTheDocument();
  });

  it("surfaces provider preview failures", async () => {
    const user = userEvent.setup();
    const value = client({ previewProviderResult: vi.fn(async () => { throw "preview denied"; }) });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByLabelText("Custom media provider query")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Custom media provider query"), "party");
    await user.click(screen.getByRole("checkbox", { name: /Allow this provider/ }));
    await user.click(screen.getByRole("button", { name: "Search provider" }));
    await user.click(await screen.findByRole("button", { name: "Preview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Provider preview failed");
  });

  it("uses provider MIME metadata when a preview blob omits its type", async () => {
    const user = userEvent.setup();
    const value = client({ previewProviderResult: vi.fn(async () => new Blob(["preview"])) });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByLabelText("Custom media provider query")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Custom media provider query"), "party");
    await user.click(screen.getByRole("checkbox", { name: /Allow this provider/ }));
    await user.click(screen.getByRole("button", { name: "Search provider" }));
    await user.click(await screen.findByRole("button", { name: "Preview" }));
    expect(await screen.findByRole("status")).toHaveTextContent("image/gif");
  });

  it("cancels an in-flight provider search when the catalog closes", async () => {
    const user = userEvent.setup();
    let requestSignal: AbortSignal | undefined;
    const value = client({
      searchProvider: vi.fn(({ signal }: { signal?: AbortSignal }) => {
        requestSignal = signal;
        return new Promise(() => undefined);
      })
    });
    render(<CustomMediaCatalog client={value} scopeType="channel" scopeId="general" />);
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    await waitFor(() => expect(screen.getByLabelText("Custom media provider query")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Custom media provider query"), "party");
    await user.click(screen.getByRole("checkbox", { name: /Allow this provider/ }));
    await user.click(screen.getByRole("button", { name: "Search provider" }));
    await waitFor(() => expect(value.searchProvider).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Open custom media catalog" }));
    expect(requestSignal?.aborted).toBe(true);
  });
});
