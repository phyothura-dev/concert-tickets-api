import { Router, type Request, type Response } from 'express';
import { toPaymentDto } from '../dtos/payment.dto';
import { toReservationDto, toReservationDtoList } from '../dtos/reservation.dto';
import { asyncHandler } from '../middleware/async-handler';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { reserveLimiter } from '../middleware/rate-limit.middleware';
import { parseSchema, validateBody, validateParams } from '../middleware/validate.middleware';
import multer from 'multer';
import { CleanupService } from '../services/cleanup.service';
import { PaymentService } from '../services/payment.service';
import { ReservationService } from '../services/reservation.service';
import { submitPaymentSchema } from '../validations/payment.validation';
import {
  reservationParamsSchema, reserveSchema, type ReservationParams, type ReserveInput,
} from '../validations/reservation.validation';

export const reservationRouter = Router();
const reservationService = new ReservationService();
const cleanupService = new CleanupService();
const paymentService = new PaymentService();
const upload = multer({ storage: multer.memoryStorage() });

reservationRouter.get('/reservations/me', requireAuthMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const reservations = await reservationService.listUserReservations(req.user!.userId);
  res.status(200).json({ message: 'Fetched ticket history successfully', data: toReservationDtoList(reservations) });
}));

reservationRouter.get('/reservations/:id', requireAuthMiddleware, validateParams(reservationParamsSchema), asyncHandler(async (req: Request<ReservationParams>, res: Response) => {
  const reservation = await reservationService.getReservation(req.params.id, req.user!.userId, req.user!.role);
  res.status(200).json({ message: 'Fetched reservation successfully', data: toReservationDto(reservation) });
}));

reservationRouter.post('/reserve', reserveLimiter, requireAuthMiddleware, validateBody(reserveSchema), asyncHandler(async (req: Request<unknown, unknown, ReserveInput>, res: Response) => {
  const reservation = await reservationService.reserve(req.body, req.user!.userId);
  res.status(201).json({ message: 'Reservation created successfully', data: toReservationDto(reservation) });
}));

reservationRouter.post('/reservations/:id/payment', requireAuthMiddleware, validateParams(reservationParamsSchema), upload.single('screenshot'), asyncHandler(async (req: Request<ReservationParams>, res: Response) => {
  const input = parseSchema(submitPaymentSchema, {
    paymentMethod: req.body.paymentMethod,
    screenshot: req.file,
  });
  const payment = await paymentService.submit(
    req.params.id,
    req.user!.userId,
    input.paymentMethod,
    input.screenshot,
  );
  res.status(201).json({ message: 'Payment submitted for review', data: toPaymentDto(payment) });
}));

reservationRouter.get('/reservations/:id/payment-screenshot', requireAuthMiddleware, validateParams(reservationParamsSchema), asyncHandler(async (req: Request<ReservationParams>, res: Response) => {
  const reservation = await reservationService.getReservation(req.params.id, req.user!.userId, req.user!.role);
  if (!reservation.payment) {
    res.status(404).json({ message: 'Payment submission not found', code: 'PAYMENT_NOT_FOUND' });
    return;
  }
  const proof = await paymentService.readProof(reservation.payment.id, req.user!.userId, req.user!.role);
  res.type(proof.mimeType).set('Cache-Control', 'private, no-store').send(proof.bytes);
}));

reservationRouter.post('/cleanup', requireAuthMiddleware, requireAdminMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  const result = await cleanupService.cleanupExpiredReservations();
  res.status(200).json({ message: 'Expired reservations cleaned up successfully', data: result });
}));
