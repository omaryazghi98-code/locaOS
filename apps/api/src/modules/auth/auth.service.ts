import { and, eq, isNull, gt } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../../db/client';
import { memberships, rolePermissions, sessions, users } from '../../db/schema';
import { hashToken } from '../crypto/crypto.js';

export interface RequestContext {
  sessionId: string;
  userId: string;
  fullName: string;
  email: string;
  agencyId: string;
  agencyName: string;
  contractPrefix: string;
  roleKey: string;
  permissions: Set<string>;
  ip?: string;
}

export async function createSession(userId: string, agencyId: string | null, ip?: string, deviceInfo?: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 30 * 86_400_000);
  await db.insert(sessions).values({ userId, agencyId, tokenHash: hashToken(token), expiresAt, ip, deviceInfo });
  return { token, expiresAt };
}

export async function resolveSession(tokenRaw: string): Promise<RequestContext | null> {
  const tokenHash = hashToken(tokenRaw);
  const rows = await db.select({
    session: sessions, user: users,
  }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (!row.session.agencyId) return null; // must have an active agency context

  const m = await db.select().from(memberships)
    .where(and(eq(memberships.userId, row.user.id), eq(memberships.agencyId, row.session.agencyId))).limit(1);
  const membership = m[0];
  if (!membership) return null;

  const perms = await db.select().from(rolePermissions)
    .where(and(eq(rolePermissions.agencyId, row.session.agencyId), eq(rolePermissions.roleKey, membership.roleKey)));
  const { agencies } = await import('../../db/schema.js');
  const a = await db.select().from(agencies).where(eq(agencies.id, row.session.agencyId)).limit(1);
  const agency = a[0];
  if (!agency) return null;

  return {
    sessionId: row.session.id,
    userId: row.user.id,
    fullName: row.user.fullName,
    email: row.user.email,
    agencyId: agency.id,
    agencyName: agency.legalName,
    contractPrefix: agency.contractPrefix,
    roleKey: membership.roleKey,
    permissions: new Set(perms.map((p) => p.permissionKey)),
  };
}

export async function revokeSession(tokenRaw: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, hashToken(tokenRaw)));
}

export async function membershipsOf(userId: string) {
  const { agencies } = await import('../../db/schema.js');
  return db.select({
    agencyId: agencies.id, legalName: agencies.legalName, roleKey: memberships.roleKey,
  }).from(memberships).innerJoin(agencies, eq(agencies.id, memberships.agencyId))
    .where(eq(memberships.userId, userId));
}

export async function switchAgency(userId: string, tokenRaw: string, agencyId: string) {
  const m = await db.select().from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.agencyId, agencyId))).limit(1);
  if (!m[0]) return false;
  await db.update(sessions).set({ agencyId }).where(eq(sessions.tokenHash, hashToken(tokenRaw)));
  return true;
}

// ─── Login rate limiting (in-memory; edge limiting is a deployment concern) ──────
const attempts = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;

export function rateLimitLogin(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) { attempts.set(key, { count: 1, firstAt: now }); return true; }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export function resetLoginRate(key: string) { attempts.delete(key); }
