import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { resolveSession, type RequestContext } from './auth.service.js';

export interface AuthedRequest extends Request {
  ctx?: RequestContext;
  sessionToken?: string;
}

export const PERMISSIONS_KEY = 'locaos:permissions';

export const RequirePermission = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = readCookie(req.headers.cookie, 'locaos_session');
    if (!token) throw new UnauthorizedException('Session manquante');
    const ctx = await resolveSession(token);
    if (!ctx) throw new UnauthorizedException('Session invalide ou expirée');
    ctx.ip = req.ip;
    req.ctx = ctx;
    req.sessionToken = token;
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(), context.getClass(),
    ]) ?? [];
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.ctx) throw new UnauthorizedException();
    for (const perm of required) {
      if (!req.ctx.permissions.has(perm)) {
        throw new ForbiddenException(`Permission requise: ${perm}`);
      }
    }
    return true;
  }
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}
