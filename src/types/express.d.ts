import type { AuthTokenPayload } from '../lib/auth-jwt';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};
