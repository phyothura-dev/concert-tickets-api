import { logger } from './logger';

type SentryScope = {
  setTag(key: string, value: string): void;
  setContext(key: string, context: Record<string, unknown>): void;
};

type SentryModule = {
  init(options: Record<string, unknown>): void;
  withScope(callback: (scope: SentryScope) => void): void;
  captureException(error: unknown): string;
  close(timeout?: number): Promise<boolean>;
};

type CaptureContext = {
  tags?: Record<string, string>;
  context?: Record<string, unknown>;
};

let sentry: SentryModule | null = null;
let sentryEnabled = false;

function tryLoadSentryModule(): SentryModule | null {
  const moduleName = '@sentry/node';
  try {
    const loaded = require(moduleName) as SentryModule;
    return loaded;
  } catch (err) {
    logger.warn({ err }, 'Sentry package not found. Install @sentry/node to enable production reporting.');
    return null;
  }
}

export function initializeSentry(): void {
  const dsn = process.env['SENTRY_DSN'];
  if (!dsn) {
    logger.info('SENTRY_DSN is not set. Sentry integration is disabled.');
    return;
  }

  const module = tryLoadSentryModule();
  if (!module) return;

  const tracesSampleRateRaw = process.env['SENTRY_TRACES_SAMPLE_RATE'] ?? '0';
  const tracesSampleRate = Number.parseFloat(tracesSampleRateRaw);

  module.init({
    dsn,
    environment: process.env['SENTRY_ENVIRONMENT'] ?? process.env['NODE_ENV'] ?? 'production',
    release: process.env['SENTRY_RELEASE'] ?? process.env['GITHUB_SHA'] ?? 'unknown',
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
  });

  sentry = module;
  sentryEnabled = true;
  logger.info('Sentry initialized');
}

export function captureSentryException(error: unknown, context: CaptureContext = {}): string | null {
  if (!sentryEnabled || !sentry) return null;

  let eventId: string | null = null;
  sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context.tags ?? {})) {
      scope.setTag(key, value);
    }
    if (context.context) {
      scope.setContext('metadata', context.context);
    }
    eventId = sentry?.captureException(error) ?? null;
  });

  return eventId;
}

export async function closeSentry(timeoutMs = 2000): Promise<void> {
  if (!sentryEnabled || !sentry) return;
  try {
    await sentry.close(timeoutMs);
  } catch (err) {
    logger.error({ err }, 'Failed to close Sentry');
  }
}

