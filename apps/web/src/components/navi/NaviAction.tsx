'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';
import { useLocale, useReducedMotion } from '@/lib/navi/hooks';
import { naviCopy } from '@/lib/navi/i18n';

/**
 * Mutation button that POSTs to an EXISTING endpoint and reports result inline.
 * - optional inline confirmation (accessible: focus moves in, Esc cancels)
 * - optional text prompt (e.g. resolution note) rendered as a real form field
 * - pending / success / error states with retry
 * - onDone(result) lets the parent re-fetch affected panels
 */
export function NaviAction({ path, body, label, variant, icon, confirm, prompt, onDone, className, disabled }: {
  path: string; body?: Record<string, unknown>; label: string; variant?: 'primary' | 'danger' | 'ghost' | ''; icon?: ReactNode;
  confirm?: string; prompt?: { label: string; field: string; required?: boolean }; onDone?: () => void | Promise<void>; className?: string; disabled?: boolean;
}) {
  const lang = useLocale();
  const t = naviCopy(lang).state;
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'pending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLElement>(null);
  const id = useId();

  useEffect(() => {
    if (phase === 'confirm') requestAnimationFrame(() => firstRef.current?.focus());
    if (phase === 'done') {
      const to = window.setTimeout(() => setPhase('idle'), 1800);
      return () => window.clearTimeout(to);
    }
  }, [phase]);

  const run = async () => {
    setPhase('pending'); setError(null);
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...(body ?? {}), ...(prompt ? { [prompt.field]: value } : {}) }) });
      const out = await res.json().catch(() => null) as { error?: { message?: string }; message?: string | string[] } | null;
      if (!res.ok) {
        const msg = out?.error?.message ?? (Array.isArray(out?.message) ? out.message.join(', ') : out?.message) ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setPhase('done'); setValue('');
      await onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed); setPhase('error');
    }
  };

  const needsSheet = Boolean(confirm || prompt);
  const onTrigger = () => { if (needsSheet) setPhase('confirm'); else void run(); };
  const cancel = () => { setPhase('idle'); requestAnimationFrame(() => triggerRef.current?.focus()); };
  const cls = `nv-btn sm ${variant ?? ''} ${className ?? ''}`;
  const busy = phase === 'pending';
  const canConfirm = !prompt?.required || value.trim().length > 0;

  return (
    <span style={{ display: 'contents' }}>
      <button ref={triggerRef} type="button" className={cls} onClick={onTrigger} disabled={disabled || busy || phase === 'confirm'} aria-busy={busy} aria-controls={needsSheet ? id : undefined} aria-expanded={needsSheet ? phase === 'confirm' : undefined}>
        {busy ? <Loader2 size={13} className="nv-spin" aria-hidden="true" /> : phase === 'done' ? <Check size={13} aria-hidden="true" /> : icon}
        {busy ? t.pending : phase === 'done' ? t.done : label}
      </button>
      {phase === 'error' && error && (
        <span role="alert" className="nv-inline-err" style={{ flexBasis: '100%' }}>
          {error} <button type="button" className="nv-btn sm ghost" onClick={() => void run()} style={{ marginInlineStart: 'auto' }}>{t.retry}</button>
        </span>
      )}
      <AnimatePresence initial={false}>
        {phase === 'confirm' && (
          <motion.div
            key="sheet" id={id} role="group" aria-label={label} className="nv-confirm" style={{ flexBasis: '100%' }}
            initial={reduced ? false : { opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); cancel(); } }}
          >
            {confirm && <p>{confirm}</p>}
            {prompt ? (
              <label style={{ margin: 0 }}>
                <span style={{ display: 'block', marginBottom: 4 }}>{prompt.label}</span>
                <textarea ref={firstRef as React.RefObject<HTMLTextAreaElement>} rows={2} value={value} onChange={(e) => setValue(e.target.value)} required={prompt.required} />
              </label>
            ) : null}
            <div className="row">
              <button ref={prompt ? undefined : (firstRef as React.RefObject<HTMLButtonElement>)} type="button" className="nv-btn sm ghost" onClick={cancel}>{t.cancel}</button>
              <button type="button" className={`nv-btn sm ${variant === 'danger' ? 'danger' : 'primary'}`} onClick={() => void run()} disabled={!canConfirm}>{t.confirm}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
