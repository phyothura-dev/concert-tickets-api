import { randomUUID } from 'node:crypto';
import { type NextFunction, type Request, type Response } from 'express';
import { runWithContext } from '../lib/request-context';

export const CORRELATION_HEADER = 'x-correlation-id';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pickIncomingId(headerValue: string | string[] | undefined): string | null {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return null;
  return UUID_V4_PATTERN.test(trimmed) ? trimmed : null;
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = pickIncomingId(req.headers[CORRELATION_HEADER]);
  const correlationId = incoming ?? randomUUID();

  res.setHeader('X-Correlation-ID', correlationId);
  res.locals['correlationId'] = correlationId;

  runWithContext({ correlationId }, () => {
    next();
  });
}
