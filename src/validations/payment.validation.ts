import { z } from 'zod';

export const paymentMethodSchema = z.enum(['KBZPAY', 'WAVEPAY']);

export const paymentParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
}).strict();

export const paymentListQuerySchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const reviewPaymentSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('APPROVE') }).strict(),
  z.object({
    decision: z.literal('REJECT'),
    reason: z.string().trim().min(3).max(500),
  }).strict(),
]);

export type PaymentParams = z.infer<typeof paymentParamsSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
