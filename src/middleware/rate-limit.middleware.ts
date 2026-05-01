import rateLimit, { type RateLimitRequestHandler, type Store } from 'express-rate-limit';
import RedisStore, { type RedisReply } from 'rate-limit-redis';
import { type NextFunction, type Request, type Response } from 'express';
import { RateLimitError } from '../lib/errors';
import { getRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';

const RESERVE_WINDOW_MS = 60 * 1000;
const RESERVE_MAX = 5;

function buildStore(): Store | undefined {
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
    prefix: 'rl:reserve:',
  });
}

let cachedLimiter: RateLimitRequestHandler | null = null;

function getReserveLimiter(): RateLimitRequestHandler {
  if (cachedLimiter) return cachedLimiter;

  const baseOptions = {
    windowMs: RESERVE_WINDOW_MS,
    limit: RESERVE_MAX,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => req.ip ?? 'unknown-ip',
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new RateLimitError(`Too many requests. Limit is ${RESERVE_MAX} per ${RESERVE_WINDOW_MS / 1000}s per IP.`, { limit: RESERVE_MAX, windowMs: RESERVE_WINDOW_MS }));
    },
  };

  const store = buildStore();
  cachedLimiter = store ? rateLimit({ ...baseOptions, store }) : rateLimit(baseOptions);

  return cachedLimiter;
}

export function reserveLimiter(req: Request, res: Response, next: NextFunction): void {
  getReserveLimiter()(req, res, next);
}
