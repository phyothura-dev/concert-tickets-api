import { CleanupService } from '../services/cleanup.service';
import { logger } from '../lib/logger';
import { isShutdownInProgress } from '../lib/lifecycle';

export type CleanupCronOptions = {
  intervalMs?: number;
};

export type CleanupCronHandle = {
  stop: () => void;
};

export function startCleanupCron(options: CleanupCronOptions = {}): CleanupCronHandle {
  const intervalMs = options.intervalMs ?? 60_000;
  const cleanupService = new CleanupService();

  let running = false;

  const tick = async (): Promise<void> => {
    if (isShutdownInProgress()) return;
    if (running) return;

    running = true;
    const startedAt = Date.now();
    try {
      const result = await cleanupService.cleanupExpiredReservations();
      logger.info({ expired: result.expired, durationMs: Date.now() - startedAt }, 'cleanup cron completed');
    } catch (err) {
      logger.error({ err }, 'cleanup cron failed');
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref();

  logger.info({ intervalMs }, 'cleanup cron scheduled');

  return {
    stop: () => {
      clearInterval(timer);
      logger.info('cleanup cron stopped');
    },
  };
}
