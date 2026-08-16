import { Router, type Request, type Response } from 'express';
import { toPaymentDto } from '../dtos/payment.dto';
import { asyncHandler } from '../middleware/async-handler';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { paymentService } from '../services/payment.service';
import {
  paymentListQuerySchema, paymentParamsSchema, reviewPaymentSchema,
  type PaymentListQuery, type PaymentParams, type ReviewPaymentInput,
} from '../validations/payment.validation';

export const paymentRouter = Router();

paymentRouter.use(requireAuthMiddleware);

paymentRouter.get('/config', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'Fetched payment methods', data: paymentService.getConfig() });
});

paymentRouter.get('/', requireAdminMiddleware, validateQuery(paymentListQuerySchema), asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.list(req.query as unknown as PaymentListQuery);
  res.status(200).json({ message: 'Fetched payment submissions', data: { ...result, items: result.items.map(toPaymentDto) } });
}));

paymentRouter.get('/:id/screenshot', requireAdminMiddleware, validateParams(paymentParamsSchema), asyncHandler(async (req: Request<PaymentParams>, res: Response) => {
  const proof = await paymentService.readProof(req.params.id, req.user!.userId, 'ADMIN');
  res.type(proof.mimeType).set('Cache-Control', 'private, no-store').send(proof.bytes);
}));

paymentRouter.patch('/:id/review', requireAdminMiddleware, validateParams(paymentParamsSchema), validateBody(reviewPaymentSchema), asyncHandler(async (req: Request<PaymentParams, unknown, ReviewPaymentInput>, res: Response) => {
  const payment = await paymentService.review(req.params.id, req.user!.userId, req.body);
  res.status(200).json({ message: `Payment ${req.body.decision === 'APPROVE' ? 'approved' : 'rejected'}`, data: toPaymentDto(payment) });
}));

