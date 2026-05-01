import { Router, type Request, type Response } from 'express';
import { ReservationService } from '../services/reservation.service';
import { CleanupService } from '../services/cleanup.service';
import { PurchaseService } from '../services/purchase.service';
import { directPurchaseSchema, purchaseSchema, reserveSchema, type DirectPurchaseInput, type PurchaseInput, type ReserveInput } from '../validations/reservation.validation';
import { asyncHandler } from '../middleware/async-handler';
import { validateBody } from '../middleware/validate.middleware';
import { reserveLimiter } from '../middleware/rate-limit.middleware';

export const reservationRouter = Router();

const reservationService = new ReservationService();
const cleanupService = new CleanupService();
const purchaseService = new PurchaseService();

reservationRouter.post(
  '/reserve',
  reserveLimiter,
  validateBody(reserveSchema),
  asyncHandler(async (req: Request<unknown, unknown, ReserveInput>, res: Response) => {
    const result = await reservationService.reserve(req.body);
    res.status(201).json({message: 'Reservation created successfully',data: result});
  }),
);

reservationRouter.post(
  '/purchase/optimistic',
  validateBody(directPurchaseSchema),
  asyncHandler(async (req: Request<unknown, unknown, DirectPurchaseInput>, res: Response) => {
    const result = await purchaseService.purchaseOptimistic(req.body);
    res.status(200).json({message: 'Ticket purchased (optimistic)',data: result});
  }),
);

reservationRouter.post(
  '/purchase/pessimistic',
  validateBody(directPurchaseSchema),
  asyncHandler(async (req: Request<unknown, unknown, DirectPurchaseInput>, res: Response) => {
    const result = await purchaseService.purchasePessimistic(req.body);
    res.status(200).json({message: 'Ticket purchased (pessimistic)',data: result});
  }),
);

// Purchase a reservation
reservationRouter.post(
  '/purchase',
  validateBody(purchaseSchema),
  asyncHandler(async (req: Request<unknown, unknown, PurchaseInput>, res: Response) => {
    const result = await reservationService.purchase(req.body);
    res.status(200).json({message: 'Reservation purchased successfully',data: result});
  }),
);

reservationRouter.post(
  '/cleanup',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await cleanupService.cleanupExpiredReservations();
    res.status(200).json({message: 'Expired reservations cleaned up successfully',data: result});
  }),
);
