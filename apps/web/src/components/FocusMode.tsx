'use client';

import { useEffect, useMemo, useState } from 'react';
import { clientApiFetch } from '@/lib/client-api';
import { FOCUS_STRINGS } from '@locaos/domain/i18n';

export interface Pickup {
  reservationId: string;
  customerName: string;
  plate: string | null;
  categoryName: string;
  pickupAt: string;
  contractId: string | null;
  contractStatus: string | null;
  blockers: string[];
}

export interface ReturnItem {
  reservationId: string;
  customerName: string;
  plate: string | null;
  categoryName: string;
  returnAt: string;
  contractId: string | null;
  contractStatus: string | null;
  returnInspectionDone: boolean;
}

interface FocusData {
  pickups: Pickup[];
  returns: ReturnItem[];
  overdueTasks: { reservationId: string; customerName: string; blockers: string[] }[];
  unresolvedBlockers: string[];
  inspectionsPending: boolean;
  contractActions: { id: string; reservationId: string; customerName: string; href: string }[];
}

type Lang = 'fr' | 'ar' | 'en';

function readLanguage(): Lang {
  const match = document.cookie.match(/(?:^|;\s*)locaos-lang=([^;]+)/);
  if (match?.[1] === 'ar' || match?.[1] === 'en') return match[1];
  return 'fr';
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function FocusMode() {
  const [data, setData] = useState<FocusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lang, setLang] = useState<Lang>('fr');

  useEffect(() => {
    setLang(readLanguage());
    let cancelled = false;
    clientApiFetch<FocusData>('/api/ops/focus')
      .then((payload) => { if (!cancelled) setData(payload); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const strings = useMemo(() => FOCUS_STRINGS[lang], [lang]);
  const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-MA' : 'fr-MA';
  const direction = lang === 'ar' ? 'rtl' : 'ltr';

  if (loading) return <div className="loading" role="status" aria-live="polite">{strings.loading}</div>;
  if (error || !data) return <div className="alert alert-CRITICAL" role="alert">{strings.error}</div>;

  return (
    <div className="focus-mode" dir={direction}>
      <header className="focus-header">
        <h1>{strings.title}</h1>
        <p>{strings.question}</p>
      </header>

      <section className="pickups" aria-labelledby="focus-pickups-title">
        <h2 id="focus-pickups-title">{data.pickups.length} {strings.pickups}</h2>
        {data.pickups.length === 0 && <p>{strings.noPickups}</p>}
        {data.pickups.map((pickup) => (
          <article key={pickup.reservationId} className="focus-item">
            <div className="item-header">
              <span className="item-time">{formatTime(pickup.pickupAt, locale)}</span>
              <span className={`item-pill ${pickup.blockers.length ? 'warn' : 'ok'}`}>
                {pickup.blockers.length ? `${pickup.blockers.length} ${strings.blockers}` : strings.ready}
              </span>
            </div>
            <div className="item-body">
              <strong>{pickup.customerName}</strong> — {pickup.categoryName}
              {pickup.plate && <span> · {pickup.plate}</span>}
              {pickup.contractId && <span> · <a href={`/contracts/${pickup.contractId}`}>{strings.contract}</a></span>}
            </div>
            {pickup.blockers.length > 0 && (
              <div className="item-blockers" aria-label={strings.unresolvedBlockers}>
                {pickup.blockers.map((blocker) => <span key={blocker} className="pill danger">{blocker}</span>)}
              </div>
            )}
            <div className="item-actions">
              {pickup.contractId ? (
                <>
                  <a className="btn mini" href={`/contracts/${pickup.contractId}`}>{strings.contract}</a>
                  <a className="btn mini" href={`/api/contracts/${pickup.contractId}/pdf`} target="_blank" rel="noreferrer">{strings.print}</a>
                </>
              ) : (
                <a className="btn mini primary" href={`/brief?scope=morning&reservationId=${pickup.reservationId}`}>{strings.prepareContract}</a>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="returns" aria-labelledby="focus-returns-title">
        <h2 id="focus-returns-title">{data.returns.length} {strings.returns}</h2>
        {data.returns.length === 0 && <p>{strings.noReturns}</p>}
        {data.returns.map((item) => (
          <article key={item.reservationId} className="focus-item">
            <div className="item-header">
              <span className="item-time">{formatTime(item.returnAt, locale)}</span>
              <span className={`item-pill ${item.returnInspectionDone ? 'ok' : 'warn'}`}>
                {item.returnInspectionDone ? strings.inspected : strings.inspectionPending}
              </span>
            </div>
            <div className="item-body">
              <strong>{item.customerName}</strong> — {item.categoryName}
              {item.plate && <span> · {item.plate}</span>}
              {item.contractId && <span> · <a href={`/contracts/${item.contractId}`}>{strings.contract}</a></span>}
            </div>
            <div className="item-actions">
              {!item.returnInspectionDone && (
                <a className="btn mini primary" href={`/field?reservationId=${item.reservationId}&kind=RETURN`}>{strings.inspectVehicle}</a>
              )}
              {item.contractId && <a className="btn mini" href={`/contracts/${item.contractId}`}>{strings.contract}</a>}
            </div>
          </article>
        ))}
      </section>

      <section className="priorities" aria-labelledby="focus-priorities-title">
        <h2 id="focus-priorities-title">{strings.priorities}</h2>
        {data.overdueTasks.length > 0 && (
          <div className="priority critical">
            <strong>{data.overdueTasks.length} {strings.overdueTasks}</strong>
            {data.overdueTasks.map((task) => (
              <div key={task.reservationId} className="pill danger">{task.customerName}: {task.blockers.join(', ')}</div>
            ))}
          </div>
        )}
        {data.unresolvedBlockers.length > 0 && (
          <div className="priority high">
            <strong>{data.unresolvedBlockers.length} {strings.unresolvedBlockers}</strong>
            {data.unresolvedBlockers.map((blocker) => <div key={blocker} className="pill warn">{blocker}</div>)}
          </div>
        )}
        {data.inspectionsPending && <div className="priority medium"><strong>{strings.inspectionsPending}</strong></div>}
        {data.contractActions.length > 0 && (
          <div className="priority high">
            <strong>{data.contractActions.length} {strings.contractActions}</strong>
            {data.contractActions.map((action) => (
              <div key={action.id} className="action-item">
                <a href={action.href}>{strings.prepareContract} — {action.customerName}</a>
              </div>
            ))}
          </div>
        )}
        {data.contractActions.length === 0 && data.overdueTasks.length === 0 && data.unresolvedBlockers.length === 0 && !data.inspectionsPending && (
          <p>{strings.noContractActions}</p>
        )}
      </section>
    </div>
  );
}
