import React, { useEffect, useId, useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import { Glyph } from "@shared/ui/design";
import { button, modal } from "@features/management/ui/manage.styles";

export function Modal({
  open,
  onClose,
  icon,
  title,
  description,
  children,
  footer
}: {
  open: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const input = dialogRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
    input?.focus();
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div {...stylex.props(modal.scrim)} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...stylex.props(modal.dialog)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header {...stylex.props(modal.head)}>
          <div {...stylex.props(modal.mhIc)}>{icon}</div>
          <div {...stylex.props(modal.titleWrap)}>
            <h3 id={titleId} {...stylex.props(modal.title)}>{title}</h3>
            <p {...stylex.props(modal.description)}>{description}</p>
          </div>
          <button type="button" aria-label="Close dialog" title="Close" onClick={onClose} {...stylex.props(button.btn, button.ghost, button.sm)}>
            <Glyph size={16}><><path d="M6 6l12 12M18 6 6 18" /></></Glyph>
          </button>
        </header>
        <div {...stylex.props(modal.body)}>{children}</div>
        <footer {...stylex.props(modal.foot)}>{footer}</footer>
      </div>
    </div>
  );
}
