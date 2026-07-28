import rateLimit, { type RateLimitRequestHandler, type Store } from 'express-rate-limit';
import RedisStore, { type RedisReply } from 'rate-limit-redis';
import { type NextFunction, type Request, type Response } from 'express';
import { RateLimitError } from '../lib/errors';
import { getRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';

const RESERVE_WINDOW_MS = 60 * 1000;
const RESERVE_MAX = 5;
const AUTH_WINDOW_MS = 60 * 1000;
const AUTH_MAX = 20;

function buildStore(prefix: string): Store | undefined {
  if (process.env['RATE_LIMIT_FALLBACK'] === 'memory') {
    logger.warn('RATE_LIMIT_FALLBACK=memory; using in-memory rate limiter store (NOT for production)');
    return undefined;
  }

  const client = getRedisClient();
  if (!client) {
    throw new Error('REDIS_URL is required for rate limiting. Set RATE_LIMIT_FALLBACK=memory to opt into the in-memory store for local dev.');
  }

  return new RedisStore({
    sendCommand: (...args: string[]): Promise<RedisReply> => client.call(args[0]!, ...args.slice(1)) as Promise<RedisReply>,
    prefix,
  });
}

let cachedReserveLimiter: RateLimitRequestHandler | null = null;
let cachedAuthLimiter: RateLimitRequestHandler | null = null;

function buildLimiter(max: number, windowMs: number, prefix: string): RateLimitRequestHandler {
  const baseOptions = {
    windowMs,
    limit: max,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => req.ip ?? 'unknown-ip',
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new RateLimitError(`Too many requests. Limit is ${max} per ${windowMs / 1000}s per IP.`, { limit: max, windowMs }));
    },
  };

  const store = buildStore(prefix);
  return store ? rateLimit({ ...baseOptions, store }) : rateLimit(baseOptions);
}

function getReserveLimiter(): RateLimitRequestHandler {
  if (cachedReserveLimiter) return cachedReserveLimiter;

  cachedReserveLimiter = buildLimiter(RESERVE_MAX, RESERVE_WINDOW_MS, 'rl:reserve:');

  return cachedReserveLimiter;
}

function getAuthLimiter(): RateLimitRequestHandler {
  if (cachedAuthLimiter) return cachedAuthLimiter;

  cachedAuthLimiter = buildLimiter(AUTH_MAX, AUTH_WINDOW_MS, 'rl:auth:');

  return cachedAuthLimiter;
}

export function reserveLimiter(req: Request, res: Response, next: NextFunction): void {
  getReserveLimiter()(req, res, next);
}

export function authLimiter(req: Request, res: Response, next: NextFunction): void {
  getAuthLimiter()(req, res, next);
}
