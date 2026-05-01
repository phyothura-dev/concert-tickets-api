import { z } from 'zod';

export const reserveSchema = z
  .object({
    concertId: z.string().uuid('concertId must be a valid UUID'),
    quantity: z.coerce.number().int('quantity must be an integer').min(1, 'quantity must be between 1 and 5').max(5, 'quantity must be between 1 and 5'),
    holdSeconds: z.coerce.number().int().min(10, 'holdSeconds must be between 10 and 3600').max(3600, 'holdSeconds must be between 10 and 3600').optional(),
  })
  .strict();

export const purchaseSchema = z
  .object({
    reservationId: z.string().uuid('reservationId must be a valid UUID'),
  })
  .strict();

export const directPurchaseSchema = z
  .object({
    concertId: z.string().uuid('concertId must be a valid UUID'),
    quantity: z.coerce.number().int('quantity must be an integer').min(1, 'quantity must be between 1 and 5').max(5, 'quantity must be between 1 and 5'),
  })
  .strict();

export type ReserveInput = z.infer<typeof reserveSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type DirectPurchaseInput = z.infer<typeof directPurchaseSchema>;
