import { z } from "zod";

export const reserveSchema = z.object({
  concertId: z.string().uuid("concertId must be a valid UUID"),
  quantity: z.coerce.number().int().positive("quantity must be a positive integer"),
  holdSeconds: z.coerce
    .number()
    .int()
    .min(10, "holdSeconds must be between 10 and 3600")
    .max(3600, "holdSeconds must be between 10 and 3600")
    .optional(),
});

export const purchaseSchema = z.object({
  reservationId: z.string().uuid("reservationId must be a valid UUID"),
});

export type ReserveInput = z.infer<typeof reserveSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
