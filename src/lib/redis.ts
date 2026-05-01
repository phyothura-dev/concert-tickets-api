import Redis, { type Redis as RedisClient } from 'ioredis';
import { logger } from './logger';

let client: RedisClient | null = null;

export function getRedisClient(): RedisClient | null {
  if (client) return client;

  const url = process.env['REDIS_URL'];
  if (!url) return null;

  client = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (attempt) => {
      const delay = Math.min(attempt * 200, 2000);
      return delay;
    },
  });

  client.on('connect', () => logger.info({ url }, 'Redis connected'));
  client.on('error', (err) => logger.error({ err }, 'Redis error'));
  client.on('end', () => logger.warn('Redis connection ended'));

  return client;
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch (err) {
    logger.error({ err }, 'Error while closing Redis');
  } finally {
    client = null;
  }
}
