import { Controller, Get, Param, Query, Res, UseGuards, UnauthorizedException, ForbiddenException, NotFoundException, Req } from '@nestjs/common';
import type { Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { withTenant } from '../../db/client.js';
import { documents } from '../../db/schema.js';
import { AuthGuard, type AuthedRequest } from '../auth/guards.js';
import { storage } from '../storage/storage.js';
import { audit } from '../audit/audit.service.js';

/**
 * Downloads require: (1) an authenticated session, (2) a valid HMAC signed URL whose
 * signature embeds the OWNING agency — so a leaked link is useless in another tenant.
 * Metadata-sensitive documents are audited on access.
 */
@Controller('api/files')
@UseGuards(AuthGuard)
export class FilesController {
  @Get(':key')
  async download(@Param('key') key: string, @Query('exp') exp: string | null, @Query('sig') sig: string | null, @Query('a') a: string | null, @Res() res: Response, @Req() req: AuthedRequest) {
    const decoded = decodeURIComponent(key);
    if (a && a !== req.ctx!.agencyId) throw new ForbiddenException('Document d’une autre agence');
    if (!storage.verify(decoded, exp, sig, a ?? req.ctx!.agencyId)) throw new UnauthorizedException('Lien expiré ou invalide');
    let meta: { id: string; kind: string } | null = null;
    try {
      const rows = await withTenant(req.ctx!.agencyId, (tx) => tx.select({ id: documents.id, kind: documents.kind })
        .from(documents).where(and(eq(documents.objectKey, decoded))).limit(1));
      meta = rows[0] ?? null; // RLS: cross-tenant metadata invisible
    } catch { meta = null; }
    let data: Buffer; let contentType: string;
    try {
      ({ data, contentType } = await storage.get(decoded));
    } catch {
      throw new NotFoundException('Fichier introuvable');
    }
    if (meta) {
      await withTenant(req.ctx!.agencyId, (tx) => audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'document', entityId: meta!.id, action: 'DOCUMENT_DOWNLOADED', source: 'signed-url',
      }));
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.send(data);
  }
}
