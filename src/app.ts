import express, { type Application, type Request, type Response } from 'express';
import { Router } from 'express';
import { concertRouter } from './routes/concert.routes';
import { reservationRouter } from './routes/reservation.routes';
import { ticketRouter } from './routes/ticket.routes';
import { correlationIdMiddleware } from './middleware/correlation-id.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { createSwaggerRouter } from './middleware/swagger.middleware';
import { inFlightTrackerMiddleware } from './lib/lifecycle';
import { setupSentryExpressErrorHandler } from './lib/sentry';

export function createApp(): Application {
  const app = express();
  const v1Router = Router();

  app.set('trust proxy', 1);

  app.use(correlationIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(inFlightTrackerMiddleware);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ message: 'concert tickets api is running !' });
  });

  v1Router.use('/concerts', concertRouter);
  v1Router.use('/tickets', ticketRouter);
  v1Router.use('/', reservationRouter);

  app.use('/api/v1', v1Router);

  const swaggerRouter = createSwaggerRouter();
  app.use('/docs', swaggerRouter);

  app.use(notFoundMiddleware);
  setupSentryExpressErrorHandler(app);
  app.use(errorHandlerMiddleware);

  return app;
}
