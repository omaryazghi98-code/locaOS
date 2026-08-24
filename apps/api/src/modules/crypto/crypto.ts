/** Sensitive-field encryption (identity document numbers) — AES-256-GCM, key derived from SESSION_SECRET. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../env';

const KEY = createHash('sha256').update(env.sessionSecret).digest(); // 32 bytes

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${enc.toString('base64')}`;
}

export function decryptField(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid encrypted payload');
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

export function last4(value: string): string {
  return value.slice(-4);
}

export function maskNumber(value: string): string {
  return '••••••' + value.slice(-4);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function contentHash(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}
