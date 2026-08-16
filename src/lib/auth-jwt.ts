import type { CookieOptions } from 'express';
import jwt, { type JwtPayload, type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import { AuthenticationError, InternalError } from './errors';
import type { UserRole } from '../entities/User';
import { env } from '../config/env';

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};

const AUTH_JWT_ISSUER = 'concert-tickets-api';
const DEFAULT_AUTH_JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

function getAuthJwtSecret(): string {
  const secret = env.auth.jwtSecret;
  if (!secret || secret.trim().length < 32) {
    throw new InternalError('Authentication is not configured', null, 'AUTH_MISCONFIGURED');
  }
  return secret.trim();
}

function getAuthJwtExpiresInSeconds(): number {
  const raw = env.auth.jwtExpiresInSeconds;
  if (!raw) {
    return DEFAULT_AUTH_JWT_EXPIRES_IN_SECONDS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 60) {
    throw new InternalError('Authentication is not configured', null, 'AUTH_MISCONFIGURED');
  }
  return parsed;
}

export function getAuthTokenCookieName(): string {
  const name = env.auth.tokenName ?? 'auth_token';
  return name.trim();
}

export function getAuthTokenCookieOptions(): CookieOptions {
  const secure = env.auth.cookieSecure === 'true' || env.isProduction;
  const maxAge = getAuthJwtExpiresInSeconds() * 1000;
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge,
    path: '/',
  };
}

export function getClearAuthTokenCookieOptions(): CookieOptions {
  return {
    ...getAuthTokenCookieOptions(),
    maxAge: 0,
  };
}

export function signJwt(userId: string, email: string, role: UserRole): string {
  const options: SignOptions = {
    subject: userId,
    expiresIn: getAuthJwtExpiresInSeconds(),
    issuer: AUTH_JWT_ISSUER,
    algorithm: 'HS256',
  };

  return jwt.sign({ email, role }, getAuthJwtSecret(), options);
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'USER' || value === 'ADMIN';
}

function toAuthTokenPayload(decoded: string | JwtPayload): AuthTokenPayload {
  if (typeof decoded === 'string') {
    throw new AuthenticationError('Invalid JWT', null, 'INVALID_JWT');
  }

  const claims = decoded as JwtPayload & { email?: unknown; role?: unknown };
  const userId = claims.sub;
  const email = claims.email;
  const role = claims.role;
  const exp = claims.exp;
  const iat = claims.iat;

  if (typeof userId !== 'string' || typeof email !== 'string' || !isUserRole(role) || typeof exp !== 'number' || typeof iat !== 'number') {
    throw new AuthenticationError('Invalid JWT', null, 'INVALID_JWT');
  }

  return {
    userId,
    email,
    role,
    exp,
    iat,
  };
}

export function verifyJwt(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, getAuthJwtSecret(), {
      algorithms: ['HS256'],
      issuer: AUTH_JWT_ISSUER,
    } satisfies VerifyOptions);

    return toAuthTokenPayload(decoded);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('JWT expired', null, 'JWT_EXPIRED');
    }
    throw new AuthenticationError('Invalid JWT', null, 'INVALID_JWT');
  }
}
