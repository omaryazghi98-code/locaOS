'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

type ConfirmActionProps = {
  label: string;
  confirmText?: string;
  onConfirm: () => void;
  variant?: 'primary' | 'danger' | 'mini';
  ariaLabel?: string;
};

export function ConfirmAction({
  label,
  confirmText = 'Confirmer cette action',
  onConfirm,
  variant = 'danger',
  ariaLabel,
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

    const dialog = dialogRef.current;
    cancelRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
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
      >
        {label}
      </button>

      {open && (
        <div
          role="presentation"
          className="confirm-overlay"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000, overflow: 'auto',
          }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            style={{
              background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px',
              padding: '24px', maxWidth: '400px', width: '100%', maxHeight: 'calc(100vh - 48px)', overflow: 'auto',
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 id={titleId} style={{ margin: '0 0 16px', fontSize: '14px' }}>{label}</h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 20px', fontSize: '13px' }}>{confirmText}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button ref={cancelRef} type="button" className="btn mini" onClick={close}>Annuler</button>
              <button type="button" className="btn mini primary" onClick={confirm}>OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
