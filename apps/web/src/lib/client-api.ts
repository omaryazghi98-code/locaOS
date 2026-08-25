const API = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Browser-side fetch for client components. Session cookies are sent by the browser. */
export async function clientApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
    cache: 'no-store',
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
  return body as T;
}
