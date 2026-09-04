'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clientApiFetch } from '@/lib/client-api';
import type { Alert, CommandCenter, Focus, Loadable, OpsTask, Vehicle } from './types';

type Key = 'center' | 'focus' | 'tasks' | 'alerts' | 'vehicles';
const ENDPOINTS: Record<Key, string> = {
  center: '/api/ops/command-center',
  focus: '/api/ops/focus',
  tasks: '/api/ops/tasks',
  alerts: '/api/alerts?status=OPEN,ACKNOWLEDGED',
  vehicles: '/api/fleet/vehicles',
};

export interface NaviData {
  center: Loadable<CommandCenter>;
  focus: Loadable<Focus>;
  tasks: Loadable<OpsTask[]>;
  alerts: Loadable<Alert[]>;
  vehicles: Loadable<Vehicle[]>;
}

/**
 * Loads the five real endpoints NAVI reads from, independently.
 * A failing panel never blocks the others. Re-fetch is per-key or global.
 * Auto-refresh every 60s while the tab is visible.
 */
export function useNaviData(refreshMs = 60_000) {
  const [state, setState] = useState<NaviData>({
    center: { status: 'loading' }, focus: { status: 'loading' }, tasks: { status: 'loading' }, alerts: { status: 'loading' }, vehicles: { status: 'loading' },
  });
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async (key: Key) => {
    try {
      const data = await clientApiFetch<unknown>(ENDPOINTS[key]);
      if (!alive.current) return;
      setState((s) => ({ ...s, [key]: { status: 'ready', data, at: Date.now() } }));
    } catch (err) {
      if (!alive.current) return;
      const message = err instanceof Error ? err.message : 'ERROR';
      if (message === 'UNAUTHORIZED') { window.location.assign('/login'); return; }
      setState((s) => ({ ...s, [key]: { status: 'error', error: message, data: s[key].data } }));
    }
  }, []);

  const loadAll = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    await Promise.all((Object.keys(ENDPOINTS) as Key[]).map(load));
    if (alive.current) setRefreshing(false);
  }, [load]);

  useEffect(() => {
    alive.current = true;
    void loadAll(true);
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void loadAll(true); }, refreshMs);
    const onVisible = () => { if (document.visibilityState === 'visible') void loadAll(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive.current = false; window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [loadAll, refreshMs]);

  const meta = useMemo(() => {
    const entries = Object.values(state);
    const errors = entries.filter((e) => e.status === 'error').length;
    const ready = entries.filter((e) => e.status === 'ready').length;
    const lastAt = Math.max(0, ...entries.map((e) => (e.status === 'ready' ? e.at : 0)));
    return { errors, ready, total: entries.length, lastAt, allFailed: errors === entries.length, anyLoading: entries.some((e) => e.status === 'loading') };
  }, [state]);

  return { data: state, reload: load, reloadAll: () => loadAll(false), refreshing, meta };
}
