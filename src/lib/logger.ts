import pino, { type Logger, type LoggerOptions } from 'pino';
import { getCorrelationId } from './request-context';

const isProduction = process.env['NODE_ENV'] === 'production';
const logLevel = process.env['LOG_LEVEL'] ?? (isProduction ? 'info' : 'debug');

const baseOptions: LoggerOptions = {
  level: logLevel,
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  mixin() {
    const correlationId = getCorrelationId();
    return correlationId ? { correlationId } : {};
  },
};

const prettyTransport = !isProduction
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    }
  : undefined;

export const logger: Logger = prettyTransport ? pino({ ...baseOptions, transport: prettyTransport }) : pino(baseOptions);

export type AppLogger = Logger;
