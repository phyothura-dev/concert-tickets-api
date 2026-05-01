import { type NextFunction, type Request, type Response } from 'express';
import { logger } from '../lib/logger';
import { isAppError } from '../lib/errors';

export type ErrorEnvelope = {
  error: string;
  message: string;
  ref: string;
  details?: unknown;
};

export function errorHandlerMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';

  if (isAppError(err)) {
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

  const body: ErrorEnvelope = {
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
    ref: correlationId,
  };

  res.status(500).json(body);
}
