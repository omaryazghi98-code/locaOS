/**
 * StoragePort (ADR-0011 note): local-filesystem adapter for MVP; S3-compatible adapter is
 * the V1 swap-in (same interface). Objects are addressed by opaque keys scoped per agency.
 * Downloads flow through HMAC-signed URLs — never public buckets.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { env } from '../../env';

export interface StoragePort {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string }>;
  signedUrl(key: string, ttlSeconds?: number, agencyId?: string | null): string;
  verify(key: string, exp: string | null, sig: string | null, agencyId?: string | null): boolean;
}

class LocalStorage implements StoragePort {
  private root = join(process.cwd(), env.storageDir);

  private path(key: string) {
    const safe = normalize(key).replace(/^(\.\.[/\\])+/, '');
    return join(this.root, safe);
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const p = this.path(key);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, data);
    writeFileSync(p + '.meta', contentType);
  }

  async get(key: string): Promise<{ data: Buffer; contentType: string }> {
    const p = this.path(key);
    if (!existsSync(p)) throw new StorageError('NOT_FOUND');
    const contentType = existsSync(p + '.meta') ? readFileSync(p + '.meta', 'utf8') : 'application/octet-stream';
    return { data: readFileSync(p), contentType };
  }

  signedUrl(key: string, ttlSeconds = 300, agencyId?: string | null): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    // tenant-scoped capability: the signature binds key + expiry + owning agency
    const sig = this.sign(key, exp, agencyId ?? null);
    const a = agencyId ? `&a=${agencyId}` : '';
    return `/api/files/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}${a}`;
  }

  sign(key: string, exp: number, agencyId: string | null): string {
    return createHmac('sha256', env.sessionSecret).update(`${key}:${exp}:${agencyId ?? ''}`).digest('hex').slice(0, 32);
  }

  /** agencyId (when provided) must match the session's agency AND be embedded in the signature. */
  verify(key: string, exp: string | null, sig: string | null, agencyId?: string | null): boolean {
    if (!exp || !sig) return false;
    if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
    const expected = this.sign(key, Number(exp), agencyId ?? null);
    return expected === sig;
  }
}

export class StorageError extends Error {
  constructor(public code: string) { super(code); }
}

export const storage: StoragePort = new LocalStorage();

export function objectKey(agencyId: string, kind: string, name: string): string {
  return `${agencyId}/${kind}/${Date.now()}-${randomBytes(4).toString('hex')}-${name}`;
}

/** Basic magic-byte sniffing for uploads — reject anything not a real image (§20). */
export function sniffImage(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}
