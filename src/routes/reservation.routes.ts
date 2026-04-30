import { Router, type Request, type Response } from 'express';
import { ReservationService } from '../services/reservation.service';
import { CleanupService } from '../services/cleanup.service';
import { purchaseSchema, reserveSchema } from '../validations/reservation.validation';
import { fail, success } from '../errors';

export const reservationRouter = Router();

const reservationService = new ReservationService();
const cleanupService = new CleanupService();

reservationRouter.post('/reserve', async (req: Request, res: Response) => {
  try {
    const parsedBody = reserveSchema.safeParse(req.body);
    if (!parsedBody.success) {
      fail(res, parsedBody.error.issues[0]?.message ?? 'Invalid payload', 400, parsedBody.error.issues);
      return;
    }
    const result = await reservationService.reserve(parsedBody.data);

    success(res, result, 'Reservation created successfully', 201);
  } catch (err) {
    fail(res, (err as Error).message, 409);
  }
});

reservationRouter.post('/purchase', async (req: Request, res: Response) => {
  try {
    const parsedBody = purchaseSchema.safeParse(req.body);
    if (!parsedBody.success) {
      fail(res, parsedBody.error.issues[0]?.message ?? 'Invalid payload', 400, parsedBody.error.issues);
      return;
    }

    const result = await reservationService.purchase(parsedBody.data);

    success(res, result);
  } catch (err) {
    fail(res, (err as Error).message, 409);
  }
});

reservationRouter.post('/cleanup', async (_req: Request, res: Response) => {
  const result = await cleanupService.cleanupExpiredReservations();
  success(res, result, 'Expired reservations cleaned up successfully', 200);
});
