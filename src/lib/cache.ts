import { getRedisClient } from './redis';
import { logger } from './logger';

// get or set cache with fallback
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache read failed — falling back to database');
    }
  }

  const result = await fetcher();

  if (redis && result !== undefined && result !== null) {
    try {
      await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache write failed');
    }
  }

  return result;
}

// delete cache
export async function deleteCache(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (err) {
    logger.warn({ err, key }, 'Redis cache deletion failed');
  }
}

// delete all matching keys
export async function deleteCachePattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.warn({ err, pattern }, 'Redis cache pattern deletion failed');
  }
}
