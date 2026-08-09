import React, { useEffect, useRef, useState } from "react";
import {
  createMatterhornThumbnailLoader,
  matterhornMimeTypeMatches,
  normalizeMatterhornMimeTypes,
  type MatterhornThumbnailLoader
} from "matterhorn-sdk/file-picker";
import type {
  AdvancedPickerSelection,
  AttachmentPickerConfig,
  AttachmentPickerDriveAdapter,
  AttachmentPickerDriveEntry
} from "@shared/model/attachmentPicker";
export type { AdvancedPickerSelection, AttachmentPickerDriveAdapter } from "@shared/model/attachmentPicker";
export type DrivePickerEntry = AttachmentPickerDriveEntry;

type DrivePickerAdapter = AttachmentPickerDriveAdapter;

type LazyThumbnailProps = {
  loader: MatterhornThumbnailLoader;
  sourceKey: string;
  size: number;
  load: (signal: AbortSignal) => Promise<Blob>;
  alt: string;
};

function LazyThumbnail({ loader, sourceKey, size, load, alt }: LazyThumbnailProps) {
  const targetRef = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState<string>();
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let disposed = false;
    const start = () => {
      if (disposed) return;
      void loader.load(size, (signal) => loadRef.current(signal)).then((blob) => {
        if (disposed || !blob) return;
        const nextUrl = URL.createObjectURL(blob);
        if (disposed) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        setUrl(nextUrl);
      });
    };
    const target = targetRef.current;
    let observer: IntersectionObserver | undefined;
    if (target && typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        start();
      });
      observer.observe(target);
    } else {
      start();
    }
    return () => {
      disposed = true;
      observer?.disconnect();
      setUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return undefined;
      });
    };
  }, [loader, size, sourceKey]);

  return <span ref={targetRef} className="attachment-picker-thumbnail">{url ? <img src={url} alt={alt} /> : "▧"}</span>;
}

export function AttachmentPickerAdvanced({
  adapter,
  acceptedMimeTypes = "*/*",
  driveOnly = false,
  mode = "file",
  onClose,
  onSelect,
  roomName,
  scopeId,
  scopeType,
  onLocalFile,
  onLocalDriveUpload
}: Omit<AttachmentPickerConfig, "onSelect"> & { driveOnly?: boolean; onClose: () => void; onSelect: (selection: AdvancedPickerSelection) => void }) {
  const localInput = useRef<HTMLInputElement>(null);
  const [mimeInput, setMimeInput] = useState(mode === "image" ? "image/*" : acceptedMimeTypes);
  const [localFile, setLocalFile] = useState<File>();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState("Choose a local file or a connected Drive file.");
  const [connections, setConnections] = useState<Awaited<ReturnType<DrivePickerAdapter["listConnections"]>>>([]);
  const [connectionId, setConnectionId] = useState<string>();
  const [folderId, setFolderId] = useState("root");
  const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([]);
  const [entries, setEntries] = useState<DrivePickerEntry[]>([]);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DrivePickerEntry>();
  const thumbnailLoaderRef = useRef<MatterhornThumbnailLoader | undefined>(undefined);
  const accepted = normalizeMatterhornMimeTypes(mimeInput, mode);
  const acceptedKey = accepted.join(",");
  const validMimeTypes = accepted.length > 0;

  if (!thumbnailLoaderRef.current) thumbnailLoaderRef.current = createMatterhornThumbnailLoader();
  const thumbnailLoader = thumbnailLoaderRef.current;

  useEffect(() => () => {
    thumbnailLoaderRef.current?.cancel();
  }, []);

  useEffect(() => {
    if (!adapter) return;
    let active = true;
    void adapter.listConnections().then((next) => {
      if (!active) return;
      setConnections(next);
      setConnectionId((current) => current || next[0]?.connectionId);
      if (next.length === 0) setStatus("No eligible Google Drive account is connected.");
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { active = false; };
  }, [adapter]);

  useEffect(() => {
    if (!adapter || !connectionId) return;
    let active = true;
    thumbnailLoader.cancel();
    setSelectedDriveFile(undefined);
    setStatus("Loading Drive files…");
    void adapter.listFiles(connectionId, folderId).then((next) => {
      if (!active) return;
      const filtered = next.filter((entry) => entry.isFolder || matterhornMimeTypeMatches(entry.mimeType, accepted));
      setEntries(filtered);
      setStatus(filtered.length ? "Select a file to share." : "This folder has no matching files.");
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { active = false; };
  }, [acceptedKey, adapter, connectionId, folderId]);

  function chooseLocalFile(file: File | undefined) {
    if (!file) return;
    const mimeType = file.type || "application/octet-stream";
    if (!validMimeTypes || !matterhornMimeTypeMatches(mimeType, accepted)) {
      setError(`${file.name} does not match the selected MIME types.`);
      setLocalFile(undefined);
      return;
    }
    setError(undefined);
    setLocalFile(file);
    setStatus(`${file.name} is ready to share.`);
  }

  async function selectDriveFile() {
    if (!adapter || !connectionId || !selectedDriveFile) return;
    try {
      setStatus("Adding to message…");
      onSelect({ kind: "drive", connectionId, file: selectedDriveFile });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="attachment-picker-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="attachment-picker-dialog" role="dialog" aria-modal="true" aria-label={driveOnly ? "Share from Google Drive" : mode === "image" ? "Choose an image to share" : "Choose a file to share"}>
        <header className="attachment-picker-dialog-header">
          <div>
            <h2>{driveOnly ? "Share from Google Drive" : mode === "image" ? "Share an image" : "Share a file"}</h2>
            <p>{driveOnly ? "Choose a file already in Google Drive." : "Choose a local file or an eligible Google Drive file."}</p>
          </div>
          <button type="button" aria-label="Close file picker" onClick={onClose}>×</button>
        </header>

        {!driveOnly ? <>
          <label className="attachment-picker-field">
            <span>Accepted MIME types</span>
            <input
              aria-label="Accepted MIME types"
              disabled={mode === "image"}
              value={mimeInput}
              onChange={(event) => setMimeInput(event.target.value)}
            />
          </label>
          <input
            ref={localInput}
            hidden
            type="file"
            accept={validMimeTypes && !accepted.includes("*/*") ? accepted.join(",") : mode === "image" ? "image/*" : undefined}
            onChange={(event) => {
              chooseLocalFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <div className="attachment-picker-actions">
            <button type="button" disabled={!validMimeTypes} onClick={() => localInput.current?.click()}>
              Choose local {mode === "image" ? "image" : "file"}
            </button>
            {localFile ? <>
              <button type="button" onClick={() => { void (onLocalFile ? onLocalFile(localFile) : onSelect({ kind: "local", file: localFile })); onClose(); }}>
                Upload file
              </button>
              {adapter && onLocalDriveUpload ? <button type="button" disabled={!connectionId} onClick={() => { if (!connectionId) return; void onLocalDriveUpload(localFile, connectionId); onClose(); }}>
                Upload through Google Drive
              </button> : null}
            </> : null}
          </div>

          {localFile && localFile.type.startsWith("image/") ? <LazyThumbnail loader={thumbnailLoader} sourceKey={`${localFile.name}:${localFile.lastModified}`} size={localFile.size} load={(signal) => localFile.slice(0, localFile.size).arrayBuffer().then((value) => new Blob([value], { type: localFile.type || "image/*" }))} alt={`Preview of ${localFile.name}`} /> : null}
        </> : null}

        {adapter ? (
          <div className="attachment-picker-drive">
            <label className="attachment-picker-field">
              <span>Google Drive account</span>
              <select aria-label="Google Drive account" value={connectionId || ""} onChange={(event) => { setConnectionId(event.target.value || undefined); setFolderId("root"); setFolderStack([]); }}>
                <option value="">Select an account</option>
                {connections.map((connection) => <option key={connection.connectionId} value={connection.connectionId}>{connection.accountLabel || connection.brokerIdentity}</option>)}
              </select>
            </label>
            {folderStack.length ? <button type="button" onClick={() => { const parent = folderStack.length > 1 ? folderStack[folderStack.length - 2] : undefined; setFolderStack((stack) => stack.slice(0, -1)); setFolderId(parent?.id || "root"); }}>Back</button> : null}
            <div className="attachment-picker-drive-list" role="tree" aria-label="Account file tree">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="treeitem"
                  aria-label={entry.isFolder ? `Open folder ${entry.name}` : `Select ${entry.name}`}
                  onClick={() => {
                    if (entry.isFolder) {
                      setFolderStack((stack) => [...stack, { id: folderId, name: entry.name }]);
                      setFolderId(entry.id);
                      return;
                    }
                    setSelectedDriveFile(entry);
                    setStatus(`${entry.name} selected.`);
                  }}
                >
                  {entry.isFolder ? "▰" : entry.mimeType.startsWith("image/") && adapter && connectionId ? <LazyThumbnail loader={thumbnailLoader} sourceKey={entry.id} size={entry.size || 0} load={(signal) => adapter.download(connectionId, entry, signal)} alt="" /> : "•"}
                  <span>{entry.name}</span>
                </button>
              ))}
            </div>
            {selectedDriveFile ? <button type="button" onClick={() => void selectDriveFile()}>Add {selectedDriveFile.name} to message</button> : null}
          </div>
        ) : null}

        {roomName && adapter ? <small>Local Drive uploads are stored under /matterhorn/{roomName}/ and linked to this room scope.</small> : null}
        {error ? <p role="alert">{error}</p> : <p role="status">{status}</p>}
      </section>
    </div>
  );
}
