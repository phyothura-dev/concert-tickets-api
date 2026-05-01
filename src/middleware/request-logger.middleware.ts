import { type NextFunction, type Request, type Response } from 'express';
import { logger } from '../lib/logger';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  logger.info(
    {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    },
    'Request Received',
  );

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      },
      'Request Completed',
    );
  });

  next();
}
