'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

type ConfirmActionProps = {
  label: string;
  confirmText?: string;
  onConfirm: () => void;
  variant?: 'primary' | 'danger' | 'mini';
  ariaLabel?: string;
};

export function ConfirmAction({ label, confirmText = 'Supprimer', variant = 'danger', ariaLabel }: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const handleKeydown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    onConfirm();
    if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
    }
  }, [onConfirm]);

  return (
    <>
      <button
        className={`btn ${variant}`}

        onClick={e => {
          previouslyFocusedRef.current = e.currentTarget as HTMLElement;
          setOpen(true);
        }}
        aria-label={ariaLabel ?? label}
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{ overflow: 'auto' }}
        >
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              maxHeight: 'calc(100vh - 48px)',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-title" style={{ margin: '0 0 16px', fontSize: '14px' }}>
              {label}
            </h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 20px', fontSize: '13px' }}>
              {confirmText}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="btn mini"
                style={{ marginRight: '8px' }}
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
              <button
                className="btn mini primary"
                onClick={handleConfirm}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}