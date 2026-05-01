import { type NextFunction, type Request, type Response } from 'express';

let inFlight = 0;
let isShuttingDown = false;

export function inFlightTrackerMiddleware(_req: Request, res: Response, next: NextFunction): void {
  if (isShuttingDown) {
    res
      .status(503)
      .setHeader('Connection', 'close')
      .json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Server is shutting down',
        ref: (res.locals['correlationId'] as string | undefined) ?? 'unknown',
      });
    return;
  }

  inFlight += 1;
  res.on('finish', () => {
    inFlight -= 1;
  });
  res.on('close', () => {
    if (!res.writableEnded) {
      inFlight -= 1;
    }
  });

  next();
}

export function getInFlightCount(): number {
  return inFlight;
}

export function markShuttingDown(): void {
  isShuttingDown = true;
}

export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}
