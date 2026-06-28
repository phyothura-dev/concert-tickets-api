import { type NextFunction, type Request, type Response } from 'express';
import { AuthenticationError } from '../lib/errors';
import { getAuthTokenCookieName, verifyJwt } from '../lib/auth-jwt';

function getAuthTokenCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const cookieValue = cookies?.[getAuthTokenCookieName()];
  return typeof cookieValue === 'string' ? cookieValue : undefined;
}

export function requireAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = getAuthTokenCookie(req);
    if (!token) {
      throw new AuthenticationError();
    }

    req.user = verifyJwt(token);
    next();
  } catch (err) {
    next(err);
  }
}
