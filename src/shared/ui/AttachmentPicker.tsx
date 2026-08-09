import React, { useRef, useState } from "react";
import { Button } from "@shared/ui/design";
import type { AttachmentTransferState } from "@shared/model/attachments";
import type { AttachmentPickerConfig } from "@shared/model/attachmentPicker";
import { AttachmentPickerAdvanced } from "@shared/ui/AttachmentPickerAdvanced";

function TransferStatus({ transfer }: { transfer: AttachmentTransferState }) {
  if (transfer.error) return <><small role="alert">{transfer.error}</small>{transfer.recovery ? <small role="status">{transfer.recovery.cleanupFailed ? `Drive file ${transfer.recovery.fileId} must be removed manually.` : "The uploaded Drive file was removed."}</small> : null}</>;
  if (transfer.phase === "idle") return null;
  const label = transfer.phase === "sharing" ? "Sharing to Google Drive" : transfer.phase === "downloading" ? "Downloading" : "Uploading";
  return <small aria-live="polite">{label}{transfer.name ? ` ${transfer.name}` : ""}{transfer.progress === undefined ? "…" : ` ${Math.round(transfer.progress * 100)}%`}</small>;
}

export function AttachmentPicker({
  advancedPicker,
  disabled,
  onUpload,
  onShareDrive,
  transfer,
  unavailableReason
}: {
  advancedPicker?: AttachmentPickerConfig;
  disabled?: boolean;
  onUpload?: (file: File) => void;
  onShareDrive?: (file: File) => void;
  transfer: AttachmentTransferState;
  unavailableReason?: string;
}) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const driveInput = useRef<HTMLInputElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const driveBrowserEnabled = !disabled && Boolean(advancedPicker?.adapter);
  return (
    <span className="attachment-picker">
      <input ref={uploadInput} type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload?.(file); event.target.value = ""; }} />
      <input ref={driveInput} type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onShareDrive?.(file); event.target.value = ""; }} />
      <Button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Add file"
        title="Add a file"
        disabled={disabled}
        onClick={() => setMenuOpen((open) => !open)}
      >
        + File
      </Button>
      {menuOpen ? (
        <div className="attachment-picker-menu" role="menu" aria-label="File options">
          <button role="menuitem" type="button" disabled={Boolean(unavailableReason) || !onUpload} onClick={() => { setMenuOpen(false); uploadInput.current?.click(); }}>
            <strong>Upload file</strong>
            <span>Send a local file through the relay</span>
          </button>
          <button role="menuitem" type="button" disabled={!onShareDrive} onClick={() => { setMenuOpen(false); driveInput.current?.click(); }}>
            <strong>Upload through Google Drive</strong>
            <span>Upload a local file to Drive, then share it</span>
          </button>
          <button role="menuitem" type="button" disabled={!driveBrowserEnabled} onClick={() => { setMenuOpen(false); setAdvancedOpen(true); }}>
            <strong>Share from Google Drive</strong>
            <span>Choose a file already in Drive</span>
          </button>
        </div>
      ) : null}
      {unavailableReason ? <small role="status">{unavailableReason}</small> : null}
      <TransferStatus transfer={transfer} />
      {advancedOpen ? (
        <AttachmentPickerAdvanced
          adapter={advancedPicker?.adapter}
          acceptedMimeTypes={advancedPicker?.acceptedMimeTypes}
          driveOnly
          mode={advancedPicker?.mode}
          roomName={advancedPicker?.roomName}
          scopeId={advancedPicker?.scopeId}
          scopeType={advancedPicker?.scopeType}
          onClose={() => setAdvancedOpen(false)}
          onSelect={(selection) => {
            setAdvancedOpen(false);
            void advancedPicker?.onSelect?.(selection);
          }}
        />
      ) : null}
    </span>
  );
}
