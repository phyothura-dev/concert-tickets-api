import { type NextFunction, type Request, type Response } from 'express';
import { AuthenticationError, ForbiddenError } from '../lib/errors';

export function requireAdminMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    next(new AuthenticationError());
    return;
  }

  if (user.role !== 'ADMIN') {
    next(new ForbiddenError('Admin access required', null, 'ADMIN_REQUIRED'));
    return;
  }

  next();
}
