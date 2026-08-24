import { Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** PG error → HTTP mapping in one place (unwraps drizzle's cause chain). */
export function mapDbError(e: unknown): { status: number; body: unknown } | null {
  const chain: { code?: string; constraint?: string; message?: string }[] = [];
  let cur = e as { code?: string; constraint?: string; message?: string; cause?: unknown };
  for (let i = 0; i < 6 && cur; i++) {
    chain.push(cur);
    cur = cur.cause as typeof cur;
  }
  const deepest = chain[chain.length - 1] ?? ({} as { message?: string });
  const anyMsg = chain.map((c) => c.message ?? '').join('\n');
  const code = chain.find((c) => c.code)?.code;
  if (code === '23P01' || code === '23P02' || /exclusion constraint/i.test(anyMsg)) {
    return {
      status: 409,
      body: { error: { code: 'RESERVATION_CONFLICT', message: 'Conflit de disponibilité', detail: deepest.message ?? '' } },
    };
  }
  if (anyMsg.includes('LOCAOS_CONFLICT')) {
    const msg = chain.find((c) => (c.message ?? '').startsWith('LOCAOS_CONFLICT'))?.message ?? '';
    const [, kind] = msg.split(':');
    return {
      status: 409,
      body: { error: { code: kind === 'MAINTENANCE' ? 'MAINTENANCE_CONFLICT' : 'RESERVATION_CONFLICT', detail: msg } },
    };
  }
  if (code === '23505' || code === '23514' || code === '23502' || code === '23503') {
    return { status: 400, body: { error: { code: 'CONSTRAINT', constraint: chain.find((c) => c.constraint)?.constraint, message: deepest.message } } };
  }
  return null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('api');
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      res.status(exception.getStatus()).json(typeof body === 'string' ? { error: { code: exception.name, message: body } } : body);
      return;
    }
    const mapped = mapDbError(exception);
    if (mapped) {
      res.status(mapped.status).json(mapped.body);
      return;
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Erreur interne' } });
  }
}
