import React, { useEffect, useRef, useState } from "react";
import type { AttachmentPreviewLoader, AttachmentRecord, EncryptedFileRecord } from "@shared/model/attachments";

function EncryptedImagePreview({ file, load }: { file: EncryptedFileRecord; load: AttachmentPreviewLoader }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const fileRef = useRef(file);
  const loadRef = useRef(load);
  fileRef.current = file;
  loadRef.current = load;
  const contentVersion = file.revision !== undefined
    ? `revision:${file.revision}`
    : `manifest:${file.manifestSha256 || "initial"}`;

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setUrl(undefined);
    setFailed(false);
    void loadRef.current(fileRef.current).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.fileId, contentVersion]);

  if (failed) return <span className="attachment-preview-status">Preview unavailable</span>;
  if (!url) return <span className="attachment-preview-status" role="status">Loading preview…</span>;
  return <img className="attachment-preview" src={url} alt={`Preview of ${file.title || file.fileName || "image"}`} />;
}

export function AttachmentList({ attachments, files, onDownload, onOpenAttachment, onPreview }: { attachments: AttachmentRecord[]; files: EncryptedFileRecord[]; onDownload: (file: EncryptedFileRecord) => void; onOpenAttachment: (attachment: AttachmentRecord) => void; onPreview?: AttachmentPreviewLoader }) {
  if (attachments.length === 0 && files.length === 0) return null;
  return (
    <aside className="attachment-list" aria-label="Shared files">
      {files.map((file) => {
        const image = file.mimeType?.startsWith("image/") && onPreview;
        return (
          <div className={`attachment-card${image ? " attachment-card-image" : ""}`} key={file.fileId}>
            {image ? <EncryptedImagePreview file={file} load={onPreview} /> : null}
            <div className="attachment-card-details">
              <span className="attachment-card-icon" aria-hidden="true">↗</span>
              <span className="attachment-card-copy"><strong>{file.title || file.fileName || "File"}</strong><small>{file.mimeType || "File attachment"}</small></span>
              <button type="button" onClick={() => onDownload(file)}>Download</button>
            </div>
          </div>
        );
      })}
      {attachments.map((attachment) => (
        <button className="attachment-card" type="button" onClick={() => onOpenAttachment(attachment)} key={attachment.id}>
          <span className="attachment-card-icon" aria-hidden="true">↗</span>
          <span className="attachment-card-copy"><strong>{attachment.title}</strong><small>{attachment.provider || "Shared file"}</small></span>
          <span aria-hidden="true">Open</span>
        </button>
      ))}
    </aside>
  );
}
