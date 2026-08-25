import { z } from 'zod';
import { imageFileSchema } from './image.validation';

export const paymentMethodSchema = z.enum(['KBZPAY', 'WAVEPAY']);

export const paymentParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
}).strict();

export const paymentListQuerySchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
}).strict();

export const reviewPaymentSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('APPROVE') }).strict(),
  z.object({
    decision: z.literal('REJECT'),
    reason: z.string().trim().min(3).max(500),
  }).strict(),
]);

export const submitPaymentSchema = z.object({
  paymentMethod: paymentMethodSchema,
  screenshot: imageFileSchema,
}).strict();

export type PaymentParams = z.infer<typeof paymentParamsSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
