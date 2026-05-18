import { type NextFunction, type Request, type Response } from 'express';
import { logger } from '../lib/logger';
import { isAppError } from '../lib/errors';
import { captureSentryException } from '../lib/sentry';

export type ErrorEnvelope = {
  error: string;
  message: string;
  ref: string;
  details?: unknown;
};

const CONCURRENCY_ERROR_CODES = new Set(['VERSION_CONFLICT', 'LOCK_CONFLICT', 'NOT_ENOUGH_STOCK']);

export function errorHandlerMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';

  if (isAppError(err)) {
    const isConcurrencyError = CONCURRENCY_ERROR_CODES.has(err.code);
    const logPayload = {
      err,
      statusCode: err.statusCode,
      code: err.code,
      details: err.details,
    };

    if (err.statusCode >= 500) {
      logger.error(logPayload, err.message);
    } else {
      logger.warn(logPayload, err.message);
    }

    if (isConcurrencyError || err.statusCode >= 500) {
      captureSentryException(err, {
        tags: {
          errorCode: err.code,
          errorType: isConcurrencyError ? 'ConcurrencyError' : 'AppError',
          endpoint: req.path,
          method: req.method,
          correlationId,
        },
        context: {
          details: err.details ?? null,
        },
      });
    }

    const body: ErrorEnvelope = {
      error: err.code,
      message: err.expose ? err.message : 'Internal server error',
      ref: correlationId,
    };
    if (err.expose && err.details !== null && err.details !== undefined) {
      body.details = err.details;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  const errorObj = err instanceof Error ? err : new Error(String(err));
  logger.error({ err: errorObj }, 'Unhandled error');
  captureSentryException(errorObj, {
    tags: {
      errorCode: 'INTERNAL_ERROR',
      errorType: 'UnhandledError',
      endpoint: req.path,
      method: req.method,
      correlationId,
    },
  });

  const body: ErrorEnvelope = {
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
    ref: correlationId,
  };

  res.status(500).json(body);
}
