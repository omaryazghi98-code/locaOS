import { cookies, headers } from 'next/headers';

const API = process.env.API_URL ?? 'http://127.0.0.1:3001';

/** Server-side fetch that forwards the session cookie (server components). */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', cookie: jar.toString(), ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
  return body as T;
}
