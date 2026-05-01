import { type NextFunction, type Request, type Response } from 'express';
import { NotFoundError } from '../lib/errors';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`, null, 'ROUTE_NOT_FOUND'));
}
