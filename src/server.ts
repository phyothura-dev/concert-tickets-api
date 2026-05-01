import 'reflect-metadata';
import { config } from 'dotenv';
import { type Server } from 'node:http';
import { createApp } from './app';
import AppDataSource from './data-source';
import { logger } from './lib/logger';
import { getInFlightCount, isShutdownInProgress, markShuttingDown } from './lib/lifecycle';
import { closeRedis } from './lib/redis';
import { startCleanupCron, type CleanupCronHandle } from './jobs/cleanup.cron';

config();

const port = Number.parseInt(process.env['PORT'] ?? '3000', 10);

if (Number.isNaN(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env['PORT'] ?? ''}`);
}

const SHUTDOWN_GRACE_MS = 5000;
const POLL_INTERVAL_MS = 100;
const SHUTDOWN_HARD_DEADLINE_MS = 15_000;
let cleanupCron: CleanupCronHandle | undefined;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function gracefulShutdown(signal: NodeJS.Signals, server: Server): Promise<void> {
  if (isShutdownInProgress()) {
    logger.warn({ signal }, 'shutdown already in progress; ignoring duplicate signal');
    return;
  }
  markShuttingDown();
  logger.info({ signal, inFlight: getInFlightCount() }, 'shutdown initiated');

  try {
    cleanupCron?.stop();
  } catch (err) {
    logger.error({ err }, 'failed to stop cleanup cron');
  }

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'http server close error');
    } else {
      logger.info('http server stopped accepting new connections');
    }
  });

  const start = Date.now();
  while (getInFlightCount() > 0 && Date.now() - start < SHUTDOWN_GRACE_MS) {
    await sleep(POLL_INTERVAL_MS);
  }

  const drainedMs = Date.now() - start;
  logger.info({ drainedMs, remainingInFlight: getInFlightCount() }, 'shutdown grace period elapsed');

  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('TypeORM datasource closed');
    }
  } catch (err) {
    logger.error({ err }, 'failed to close datasource');
  }

  try {
    await closeRedis();
  } catch (err) {
    logger.error({ err }, 'failed to close redis');
  }

  const totalMs = Date.now() - start;
  logger.info({ totalMs }, 'shutdown complete');
  process.exit(0);
}

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  const app = createApp();

  const server = app.listen(port, () => {
    logger.info({ port }, 'HTTP server listening');
  });

  cleanupCron = startCleanupCron({ intervalMs: 60_000 });

  const handle = (signal: NodeJS.Signals): void => {
    setTimeout(() => {
      logger.error('shutdown hard deadline exceeded; forcing exit');
      process.exit(1);
    }, SHUTDOWN_HARD_DEADLINE_MS).unref();

    gracefulShutdown(signal, server).catch((err: unknown) => {
      logger.error({ err }, 'graceful shutdown failed');
      process.exit(1);
    });
  };

  process.on('SIGTERM', handle);
  process.on('SIGINT', handle);

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandledRejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    handle('SIGTERM');
  });
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start server');
  process.exitCode = 1;
});
