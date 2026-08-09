import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  MatterhornCustomMediaClient,
  MatterhornCustomMediaProviderCapability,
  MatterhornCustomMediaProviderResult,
  MatterhornCustomMediaRecord,
  MatterhornCustomMediaMessageReference,
  MatterhornCustomMediaType
} from "matterhorn-sdk/browser";
import type { DrivePickerAdapter } from "@shared/model/drivePickerAdapter";

type Props = {
  client: MatterhornCustomMediaClient;
  scopeType: string;
  scopeId: string;
  drivePickerAdapter?: DrivePickerAdapter;
  onSelectReference?: (reference: MatterhornCustomMediaMessageReference) => void;
  onRecordsChanged?: (records: MatterhornCustomMediaRecord[]) => void;
};

const LOCAL_TYPES: MatterhornCustomMediaType[] = ["emoji", "sticker", "gif", "voice"];
const PROVIDER_TYPES: MatterhornCustomMediaType[] = ["emoji", "sticker", "gif", "voice"];

function mediaLabel(record: MatterhornCustomMediaRecord) {
  return `${record.name} · ${record.mediaType}`;
}

export function CustomMediaCatalog({ client, scopeType, scopeId, drivePickerAdapter, onSelectReference, onRecordsChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<MatterhornCustomMediaRecord[]>([]);
  const [providers, setProviders] = useState<MatterhornCustomMediaProviderCapability[]>([]);
  const [selectedType, setSelectedType] = useState<MatterhornCustomMediaType>("emoji");
  const [provider, setProvider] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatterhornCustomMediaProviderResult[]>([]);
  const [consent, setConsent] = useState(false);
  const [storage, setStorage] = useState<"files-v2" | "drive">("files-v2");
  const [driveConnections, setDriveConnections] = useState<Array<{ connectionId: string; accountLabel?: string }>>([]);
  const [selectedDriveConnectionId, setSelectedDriveConnectionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string>();
  const [previewLabel, setPreviewLabel] = useState<string>();
  const providerRequest = useRef<AbortController | undefined>(undefined);

  const selectedProvider = useMemo(() => providers.find((item) => item.provider === provider), [providers, provider]);
  const capabilities = client.capabilities();
  const effectiveDriveConnectionId = selectedDriveConnectionId || driveConnections[0]?.connectionId || "";
  const driveConnectionAvailable = Boolean(effectiveDriveConnectionId)
    && driveConnections.some((connection) => connection.connectionId === effectiveDriveConnectionId);

  async function refresh() {
    setError(undefined);
    try {
      const [nextRecords, nextProviders] = await Promise.all([
        client.forScope({ scopeType, scopeId }),
        client.providerCapabilities()
      ]);
      const safeRecords = nextRecords.filter((record) => {
        if (record.removedAt) return false;
        try {
          client.safeRenderMetadata(record.render);
          return true;
        } catch {
          return false;
        }
      });
      setRecords(safeRecords);
      onRecordsChanged?.(safeRecords);
      const authorizedProviders = capabilities.providerSearch ? nextProviders : [];
      setProviders(authorizedProviders);
      setProvider((current) => current || authorizedProviders[0]?.provider || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Custom media catalog is unavailable.");
    }
  }

  useEffect(() => {
    if (open) void refresh();
    return () => {
      providerRequest.current?.abort();
      providerRequest.current = undefined;
    };
  }, [client, open, scopeId, scopeType]);

  useEffect(() => {
    if (!open || !drivePickerAdapter) {
      setDriveConnections([]);
      return;
    }
    let cancelled = false;
    void drivePickerAdapter.listConnections().then((connections) => {
      if (!cancelled) {
        const nextConnections = connections.map(({ connectionId, accountLabel }) => ({ connectionId, accountLabel }));
        setDriveConnections(nextConnections);
        if (selectedDriveConnectionId
          && !nextConnections.some((connection) => connection.connectionId === selectedDriveConnectionId)
          && storage === "drive") {
          setError("The selected Google Drive account is no longer connected.");
        }
        setSelectedDriveConnectionId((current) => {
          if (!current) return nextConnections[0]?.connectionId || "";
          if (nextConnections.some((connection) => connection.connectionId === current)) return current;
          return current;
        });
      }
    }).catch(() => {
      if (!cancelled) {
        setDriveConnections([]);
        if (storage === "drive") setError("The selected Google Drive account is no longer connected.");
      }
    });
    return () => { cancelled = true; };
  }, [drivePickerAdapter, open, selectedDriveConnectionId, storage]);

  async function perform(task: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await task();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Custom media operation failed.");
    } finally {
      setBusy(false);
    }
  }

  function upload(file: File) {
    void perform(() => client.upload({
      file,
      title: file.name,
      scopeType,
      scopeId,
      mediaType: selectedType,
      name: file.name,
      render: { mode: selectedType === "voice" ? "audio" : "image", altText: file.name }
    }));
  }

  function recordVoice() {
    if (storage === "drive" && !driveConnectionAvailable) {
      setError("The selected Google Drive account is no longer connected.");
      return;
    }
    const recordStorage = storage === "drive"
      ? { kind: "drive" as const, connectionId: effectiveDriveConnectionId }
      : { kind: "files-v2" as const };
    setRecording(true);
    setError(undefined);
    void client.recordVoiceMessage({
      scopeType,
      scopeId,
      name: `Voice message ${new Date().toLocaleTimeString()}`,
      storage: recordStorage,
      maxDurationMs: 10 * 60 * 1000
    }).then(() => refresh()).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Voice message recording failed.");
    }).finally(() => setRecording(false));
  }

  function selectReference(record: MatterhornCustomMediaRecord) {
    if (!onSelectReference) return;
    void client.reference(record.id).then((reference) => {
      if (reference.scopeType !== scopeType || reference.scopeId !== scopeId || reference.mediaType !== record.mediaType) {
        throw new Error("Custom media belongs to a different room scope.");
      }
      onSelectReference(reference);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Custom media reference is unavailable."));
  }

  function search() {
    if (!selectedProvider || !query.trim() || !consent) return;
    providerRequest.current?.abort();
    const controller = new AbortController();
    providerRequest.current = controller;
    void client.searchProvider({
      provider: selectedProvider.provider,
      query,
      mediaTypes: [...PROVIDER_TYPES].filter((type) => selectedProvider.mediaTypes.includes(type)),
      limit: Math.min(25, selectedProvider.maxResults || 25),
      consent: { provider: selectedProvider.provider, purpose: "search", granted: true },
      signal: controller.signal,
      timeoutMs: 10_000
    }).then((response) => setResults(response.items)).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Provider search failed.");
    }).finally(() => {
      if (providerRequest.current === controller) providerRequest.current = undefined;
    });
  }

  function importResult(result: MatterhornCustomMediaProviderResult) {
    if (!consent || !selectedProvider) return;
    if (storage === "drive" && !driveConnectionAvailable) {
      setError("The selected Google Drive account is no longer connected.");
      return;
    }
    const importStorage = storage === "drive"
      ? { kind: "drive" as const, connectionId: effectiveDriveConnectionId }
      : { kind: "files-v2" as const };
    void perform(() => client.importProviderResult({
      result,
      scopeType,
      scopeId,
      storage: importStorage,
      consent: { provider: selectedProvider.provider, purpose: "import", granted: true }
    }));
  }

  function previewResult(result: MatterhornCustomMediaProviderResult) {
    void client.previewProviderResult({ result, timeoutMs: 10_000 }).then((blob) => {
      setPreviewLabel(`${result.name}: ${blob.size} bytes of ${blob.type || result.mimeType}`);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Provider preview failed."));
  }

  return (
    <div className="custom-media-composer">
      <button type="button" aria-expanded={open} aria-label="Open custom media catalog" onClick={() => setOpen((value) => !value)}>
        Custom media
      </button>
      {open ? (
        <section aria-label="Custom media catalog" className="custom-media-catalog">
          <header className="custom-media-catalog-header"><div><strong>Custom media</strong><span>Reusable media for this room</span></div><span className="custom-media-count">{records.length} saved</span></header>
          <p className="custom-media-intro" role="note">Select an item to attach its encrypted room reference to your next message. Removing an item makes it unavailable to this room.</p>
          <section className="custom-media-section" aria-label="Add custom media">
            <header><strong>Add media</strong><span>Stored in the selected room storage</span></header>
            <div className="custom-media-catalog-controls">
            <label>Type<select aria-label="Custom media type" value={selectedType} onChange={(event) => setSelectedType(event.target.value as MatterhornCustomMediaType)}>{LOCAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            {selectedType !== "voice" ? <label>Upload<input aria-label="Upload custom media" type="file" accept="image/*,video/*" disabled={busy || !capabilities.encryptedFiles} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.currentTarget.value = ""; }} /></label> : <button type="button" disabled={busy || recording || (storage === "files-v2" ? !capabilities.encryptedFiles : !capabilities.driveAssets || !effectiveDriveConnectionId)} onClick={recordVoice}>{recording ? "Recording…" : "Record voice message"}</button>}
            </div>
            {!capabilities.encryptedFiles ? <p className="custom-media-unavailable" role="status">Encrypted Files v2 is unavailable for custom media uploads. Connect an eligible Drive account to record voice media instead.</p> : null}
          </section>
          {capabilities.driveAssets && drivePickerAdapter ? <section className="custom-media-section custom-media-storage" aria-label="Storage options"> <header><strong>Storage</strong><span>Choose before recording or importing</span></header>
            <label>Google Drive account<select aria-label="Google Drive account" value={effectiveDriveConnectionId} onChange={(event) => setSelectedDriveConnectionId(event.target.value)}>{driveConnections.map((connection) => <option key={connection.connectionId} value={connection.connectionId}>{connection.accountLabel || "Google Drive account"}</option>)}</select></label>
            <label>Storage<select aria-label="Custom media storage" value={storage} onChange={(event) => setStorage(event.target.value as "files-v2" | "drive")}><option value="files-v2">Encrypted Files v2</option><option value="drive" disabled={!effectiveDriveConnectionId}>Google Drive room asset</option></select></label>
            {!driveConnections.length ? <p className="custom-media-unavailable" role="status">No eligible Google Drive account is connected. Drive storage remains unavailable.</p> : null}
          </section> : null}
          <section className="custom-media-section" aria-label="Saved custom media">
            <header><strong>Saved to this room</strong><span>Only this room can use these references</span></header>
            {records.length ? <ul aria-label="Custom media items">
              {records.map((record) => <li key={record.id}><span>{mediaLabel(record)}</span><span className="custom-media-item-actions"><button type="button" disabled={!onSelectReference} onClick={() => selectReference(record)}>Use in message</button><button type="button" className="custom-media-danger" disabled={busy} onClick={() => void perform(() => client.remove(record.id))}>Remove</button></span></li>)}
            </ul> : <p className="custom-media-empty" role="status">No saved media yet. Upload an image or record a voice message to build this room’s catalog.</p>}
          </section>
          {providers.length ? <section className="custom-media-section custom-media-provider" aria-label="Provider search">
            <header><strong>Provider search</strong><span>External search needs your consent</span></header>
            <label>Provider<select aria-label="Custom media provider" value={provider} onChange={(event) => setProvider(event.target.value)}>{providers.map((item) => <option key={item.provider} value={item.provider}>{item.provider}</option>)}</select></label>
            <label>Search<input aria-label="Custom media provider query" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label className="custom-media-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Allow this provider to search/import media</label>
            <p className="custom-media-import-storage">Imports use the storage selected above. Google Drive imports require an eligible connected account.</p>
            <button type="button" disabled={busy || !capabilities.providerSearch || !selectedProvider?.search || !query.trim() || !consent} onClick={search}>Search provider</button>
            <ul aria-label="Custom media provider results">{results.map((result) => <li key={`${result.provider}:${result.id}`}><span>{result.name} · {result.mediaType}</span><span className="custom-media-item-actions"><button type="button" disabled={!result.previewId || !consent} onClick={() => previewResult(result)}>Preview</button><button type="button" disabled={busy || !capabilities.providerUpload || !selectedProvider?.import || !consent} onClick={() => importResult(result)}>Import</button></span></li>)}</ul>
            {previewLabel ? <p role="status">{previewLabel}</p> : null}
          </section> : <p className="custom-media-unavailable" role="status">No authorized media providers are available. Voice provider search/import uses consent and supported audio only.</p>}
          {error ? <p role="alert">{error}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
