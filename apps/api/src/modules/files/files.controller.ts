import { Controller, Get, Param, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { storage } from '../storage/storage.js';

/** Signed-URL downloads (HMAC + expiry). Auth-less by design: the signature is the capability. */
@Controller('api/files')
export class FilesController {
  @Get(':key')
  async download(@Param('key') key: string, @Query('exp') exp: string | null, @Query('sig') sig: string | null, @Res() res: Response) {
    const decoded = decodeURIComponent(key);
    if (!storage.verify(decoded, exp, sig)) throw new UnauthorizedException('Lien expiré ou invalide');
    try {
      const { data, contentType } = await storage.get(decoded);
      res.setHeader('Content-Type', contentType);
      res.send(data);
    } catch {
      throw new UnauthorizedException('Fichier introuvable');
    }
  }
}
