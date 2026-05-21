import * as Sentry from '@sentry/node';
import type { Request } from 'express';
import { isAppError } from './errors';

const CONCURRENCY_ERROR_CODES = new Set(['VERSION_CONFLICT', 'LOCK_CONFLICT', 'NOT_ENOUGH_STOCK']);

const SAFE_BODY_FIELDS = ['concertId', 'reservationId', 'ticketId', 'quantity', 'holdSeconds'] as const;

function buildRouteLabel(req: Request): string {
  return typeof req.route?.path === 'string' ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
}

function pickSafeRequestBody(req: Request): Record<string, unknown> | undefined {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return;

  const safe: Record<string, unknown> = {};

  for (const key of SAFE_BODY_FIELDS) {
    if (body[key] !== undefined) safe[key] = body[key];
  }

  return Object.keys(safe).length ? safe : undefined;
}

export function initSentry(): void {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    enabled: true,
    environment: process.env['SENTRY_ENVIRONMENT'] ?? process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: 1,
    sendDefaultPii: false,
  });
}

export function setupSentryExpressErrorHandler(app: { use: (middleware: unknown) => unknown }): void {
  Sentry.setupExpressErrorHandler(app);
}

export function captureRequestError(err: unknown, req: Request, correlationId: string): void {
  const error = err instanceof Error ? err : new Error(String(err));
  const appErr = isAppError(err) ? err : undefined;

  if (appErr && appErr.statusCode < 500 && !CONCURRENCY_ERROR_CODES.has(appErr.code)) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('correlation_id', correlationId);
    scope.setTag('http.method', req.method);
    scope.setTag('http.route', buildRouteLabel(req));

    if (appErr) {
      scope.setTag('error.code', appErr.code);
      scope.setTag('error.category', CONCURRENCY_ERROR_CODES.has(appErr.code) ? 'concurrency' : 'app');
      scope.setLevel(appErr.statusCode >= 500 ? 'error' : 'warning');

      scope.setContext('app_error', {
        code: appErr.code,
        statusCode: appErr.statusCode,
        details: appErr.details,
      });
    } else {
      scope.setTag('error.code', 'INTERNAL_ERROR');
      scope.setTag('error.category', 'unhandled');
      scope.setLevel('error');
    }

    scope.setContext('request_context', {
      correlationId,
      path: req.originalUrl,
      params: Object.keys(req.params).length ? req.params : undefined,
      query: Object.keys(req.query).length ? req.query : undefined,
      body: pickSafeRequestBody(req),
    });

    Sentry.captureException(error);
  });
}

export async function closeSentry(timeoutMs = 2000): Promise<void> {
  await Sentry.close(timeoutMs);
}
