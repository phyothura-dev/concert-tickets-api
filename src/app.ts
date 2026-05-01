import express, { type Application, type Request, type Response } from 'express';
import { concertRouter } from './routes/concert.routes';
import { reservationRouter } from './routes/reservation.routes';
import { ticketRouter } from './routes/ticket.routes';
import { correlationIdMiddleware } from './middleware/correlation-id.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { createSwaggerRouter } from './middleware/swagger.middleware';
import { inFlightTrackerMiddleware } from './lib/lifecycle';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(correlationIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(inFlightTrackerMiddleware);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ message: 'ticket reservation api is running' });
  });

  app.use('/concerts', concertRouter);
  app.use('/tickets', ticketRouter);
  app.use('/', reservationRouter);

  app.use('/api-docs', createSwaggerRouter());

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
