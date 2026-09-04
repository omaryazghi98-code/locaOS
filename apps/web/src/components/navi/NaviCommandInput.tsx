'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, CornerDownLeft, FileSearch, Link2, Search, Sparkles, X } from 'lucide-react';
import type { Ctx, Answer } from '@/lib/navi/intents';
import { route, suggestions } from '@/lib/navi/intents';
import { useReducedMotion } from '@/lib/navi/hooks';
import { Chip, Kbd } from './primitives';

/**
 * NAVI command experience. Combobox (ARIA 1.2) with suggestion listbox, ⌘K / Ctrl+K focus,
 * result rendered as ANSWER → EVIDENCE → RELATED → ACTIONS. Structured retrieval over loaded
 * real data — clearly labelled as such (no fake LLM prose).
 */
export function NaviCommandInput({ ctx, disabled }: { ctx: Ctx; disabled?: boolean }) {
  const { t } = ctx;
  const reduced = useReducedMotion();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'answer'>('idle');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const resultId = useId();
  const items = suggestions(t).filter((s) => !q.trim() || s.label.toLowerCase().includes(q.toLowerCase()));

  // ⌘K / Ctrl+K anywhere → focus. Esc → clear result.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = useCallback((query: string) => {
    if (!query.trim()) return;
    setOpen(false); setActive(-1); setPhase('thinking');
    const compute = () => { setAnswer(route(query, ctx)); setPhase('answer'); };
    // Brief, honest "assembling" state: gives the eye a beat but never blocks. Skipped under reduced motion.
    if (reduced) compute(); else window.setTimeout(compute, 260);
  }, [ctx, reduced]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && active >= 0 && items[active]) { setQ(items[active].query); ask(items[active].query); } else ask(q); }
    else if (e.key === 'Escape') { if (open) setOpen(false); else { setAnswer(null); setPhase('idle'); } }
  };

  const clear = () => { setAnswer(null); setPhase('idle'); setQ(''); inputRef.current?.focus(); };

  return (
    <div className="nv-cmd">
      <div className="nv-cmd-box" role="search">
        <Search className="lead" size={18} aria-hidden="true" />
        <input
          ref={inputRef} className="nv-cmd-input" type="text" value={q} placeholder={t.cmd.placeholder} aria-label={t.cmd.ariaLabel}
          role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off" spellCheck={false} disabled={disabled}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown}
        />
        <span className="nv-cmd-hints" aria-hidden="true"><Kbd>⌘</Kbd><Kbd>K</Kbd><span>{t.cmd.hint}</span></span>
        <button type="button" className="nv-btn primary sm nv-cmd-submit" onClick={() => ask(q)} disabled={disabled || !q.trim()} aria-label={t.cmd.submit}>
          <CornerDownLeft size={14} aria-hidden="true" /><span className="nv-cmd-submit-label">{t.cmd.submit}</span>
        </button>
        <AnimatePresence>
          {open && items.length > 0 && (
            <motion.ul id={listId} role="listbox" aria-label={t.cmd.suggestions} className="nv-cmd-list"
              initial={reduced ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
              {items.map((s, i) => (
                <li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); setQ(s.query); ask(s.query); }} onMouseEnter={() => setActive(i)}>
                  <Sparkles size={13} aria-hidden="true" style={{ color: 'var(--navi)' }} />{s.label}<span className="k">↵</span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {phase === 'idle' && (
        <div className="nv-suggest" aria-label={t.cmd.suggestions}>
          {suggestions(t).map((s) => <button key={s.id} type="button" onClick={() => { setQ(s.query); ask(s.query); }} disabled={disabled}><Sparkles size={12} aria-hidden="true" style={{ color: 'var(--navi)' }} />{s.label}</button>)}
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'thinking' && (
          <motion.div key="thinking" className="nv-thinking" role="status" aria-live="polite" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="bars" aria-hidden="true"><i /><i /><i /><i /></span>{t.cmd.thinking}
          </motion.div>
        )}
        {phase === 'answer' && answer && (
          <motion.section key="answer" id={resultId} className="nv-result" aria-live="polite" aria-label={t.cmd.answer}
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.995 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduced ? undefined : { opacity: 0, y: 4 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
            <header className="nv-result-head">
              <span className="nv-result-q"><FileSearch size={14} aria-hidden="true" /><strong>{q}</strong></span>
              <button type="button" className="nv-btn sm ghost" onClick={clear} aria-label={t.cmd.close}><X size={14} aria-hidden="true" /> {t.cmd.close}</button>
            </header>
            <div className="nv-result-body">
              <div className="nv-result-section">
                <span className="nv-eyebrow">{t.cmd.answer}</span>
                <p className="nv-result-answer">{answer.answer}</p>
              </div>
              {answer.evidence.length > 0 && (
                <div className="nv-result-section">
                  <span className="nv-eyebrow">{t.cmd.evidence}</span>
                  <ul className="nv-evidence">
                    {answer.evidence.map((e, i) => (
                      <motion.li key={i} initial={reduced ? false : { opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduced ? 0 : 0.05 + i * 0.03 }}>
                        <Link2 size={13} aria-hidden="true" />
                        <span>{e.href ? <Link href={e.href}>{e.text}</Link> : e.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
              {answer.related.length > 0 && (
                <div className="nv-result-section">
                  <span className="nv-eyebrow">{t.cmd.related}</span>
                  <div className="nv-btnrow">
                    {answer.related.map((r, i) => (
                      <Link key={i} href={r.href} className="nv-chip mono" data-status={r.status} style={r.status ? { color: 'var(--st)', borderColor: 'color-mix(in srgb, var(--st) 35%, transparent)', textDecoration: 'none' } : { textDecoration: 'none' }}>
                        {r.status && <i className="dot" style={{ background: 'var(--st)' }} aria-hidden="true" />}{r.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {answer.actions.length > 0 && (
                <div className="nv-result-section">
                  <span className="nv-eyebrow">{t.cmd.actions}</span>
                  <div className="nv-btnrow">
                    {answer.actions.map((a, i) => <Link key={i} href={a.href} className={`nv-btn sm ${a.primary ? 'primary' : ''}`}>{a.label} <ArrowUpRight size={13} aria-hidden="true" /></Link>)}
                  </div>
                </div>
              )}
              <div className="nv-panel-hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Chip quiet>{t.cmd.evidence}</Chip>{t.cmd.scopeNote}</div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
