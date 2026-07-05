import { type NextFunction, type Request, type Response } from 'express';
import AppDataSource from '../data-source';
import { User } from '../entities/User';
import { AuthenticationError } from '../lib/errors';
import { getAuthTokenCookieName, verifyJwt } from '../lib/auth-jwt';

function getAuthTokenCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const cookieValue = cookies?.[getAuthTokenCookieName()];
  return typeof cookieValue === 'string' ? cookieValue : undefined;
}

export async function requireAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getAuthTokenCookie(req);
    if (!token) {
      throw new AuthenticationError();
    }

    const payload = verifyJwt(token);
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: payload.userId } });
    if (!user) {
      throw new AuthenticationError('Invalid JWT', null, 'INVALID_JWT');
    }
    if (user.status === 'DISABLED') {
      throw new AuthenticationError('Account is disabled', null, 'ACCOUNT_DISABLED');
    }

    req.user = {
      ...payload,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}
