'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

type ConfirmActionProps = {
  label: string;
  confirmText: string;
  onConfirm: () => void;
  variant?: 'primary' | 'danger' | 'mini';
  ariaLabel?: string;
  cancelLabel?: string;
  confirmLabel?: string;
};

export function ConfirmAction({
  label,
  confirmText,
  onConfirm,
  variant = 'danger',
  ariaLabel,
  cancelLabel = 'Annuler',
  confirmLabel = 'OK',
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0);

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [close, open]);

  const confirm = () => {
    setOpen(false);
    onConfirm();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`btn ${variant}`}
        onClick={() => setOpen(true)}
        aria-label={ariaLabel ?? label}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {label}
      </button>

      {open && (
        <div className="confirm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div
            ref={dialogRef}
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 id={titleId}>{label}</h3>
            <p>{confirmText}</p>
            <div className="confirm-actions">
              <button ref={cancelRef} type="button" className="btn mini" onClick={close}>{cancelLabel}</button>
              <button type="button" className="btn mini primary" onClick={confirm}>{confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
