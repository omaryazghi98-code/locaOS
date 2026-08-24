import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards, UnauthorizedException, NotFoundException } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { env } from '../../env.js';
import { eq } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import { z } from 'zod';
import { db, withTenant } from '../../db/client';
import { users } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard } from './guards.js';
import {
  createSession, membershipsOf, rateLimitLogin, resetLoginRate, revokeSession, switchAgency,
} from './auth.service.js';
import { readCookie } from './guards.js';
import { audit } from '../audit/audit.service.js';
import { appendEvent, dispatchPending, dispatchPendingSafe } from '../events/events.js';

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });

@Controller('api/auth')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(LoginSchema)) body: { email: string; password: string }, @Req() req: AuthedRequest, @Res({ passthrough: true }) res: ExpressResponse) {
    const email = body.email.toLowerCase().trim();
    if (!rateLimitLogin(email)) throw new UnauthorizedException('Trop de tentatives — réessayez dans 15 minutes');
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    const ok = user && (await verify(user.passwordHash, body.password));
    if (!ok || !user) {
      resetLoginRate(email);
      throw new UnauthorizedException('Identifiants invalides');
    }
    resetLoginRate(email);
    const ms = await membershipsOf(user.id);
    if (ms.length === 0) throw new UnauthorizedException('Aucune agence associée à ce compte');
    const agencyId = ms[0]!.agencyId;
    const { token } = await createSession(user.id, agencyId, req.ip, req.headers['user-agent']?.slice(0, 120));

    // Audit + out-of-hours login alert (§ research rule #92 → INFO/ATTENTION alert)
    const hour = Number(new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', hour: 'numeric', hour12: false }).format(new Date()));
    const outOfHours = hour < 7 || hour >= 22;
    await withTenant(agencyId, async (tx) => {
      await audit(tx, {
        agencyId, actor: { id: user.id, name: user.fullName }, entityType: 'user', entityId: user.id,
        action: 'LOGIN', source: 'api', ip: req.ip, after: { outOfHours },
      });
      await appendEvent(tx, agencyId, outOfHours ? 'LoginOutsideHours' : 'UserLoggedIn', {
        userId: user.id, email, at: new Date().toISOString(), outOfHours,
      });
    });
    dispatchPendingSafe();

    res.cookie('locaos_session', token, {
      httpOnly: true, secure: env.cookieSecure, sameSite: 'lax', path: '/',
      maxAge: env.sessionTtlDays * 86_400_000,
    });
    return this.sessionPayload(token, user.id, user.fullName, user.email, ms);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthedRequest) {
    const ms = await membershipsOf(req.ctx!.userId);
    return this.sessionPayload(null, req.ctx!.userId, req.ctx!.fullName, req.ctx!.email, ms, req.ctx);
  }

  @Post('switch-agency')
  @UseGuards(AuthGuard, PermissionsGuard)
  async switch(@Body(new ZodValidationPipe(z.object({ agencyId: z.string().uuid() }))) body: { agencyId: string }, @Req() req: AuthedRequest) {
    const token = readCookie(req.headers.cookie, 'locaos_session')!;
    const ok = await switchAgency(req.ctx!.userId, token, body.agencyId);
    if (!ok) throw new NotFoundException('Agence introuvable pour cet utilisateur');
    await withTenant(body.agencyId, (tx) => audit(tx, {
      agencyId: body.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
      entityType: 'user', entityId: req.ctx!.userId, action: 'AGENCY_SWITCH', after: { agencyId: body.agencyId },
    }));
    return { ok: true };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async logout(@Req() req: AuthedRequest) {
    const token = readCookie(req.headers.cookie, 'locaos_session')!;
    await revokeSession(token);
    return { ok: true };
  }

  private sessionPayload(token: string | null, userId: string, fullName: string, email: string, ms: { agencyId: string; legalName: string; roleKey: string }[], ctx?: AuthedRequest['ctx']) {
    return {
      token: token ?? undefined, // also set as cookie below by interceptor in main.ts
      user: { id: userId, fullName, email },
      memberships: ms,
      active: ctx ? { agencyId: ctx.agencyId, agencyName: ctx.agencyName, roleKey: ctx.roleKey, permissions: [...ctx.permissions] } : undefined,
    };
  }
}
