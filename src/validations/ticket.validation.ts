import { z } from 'zod';

export const createTicketSchema = z
  .object({
    concertId: z.string().uuid('concertId must be a valid UUID'),
    totalStock: z.coerce.number().int('totalStock must be an integer').min(1, 'totalStock must be a positive integer').max(1_000_000, 'totalStock is too large'),
    price: z.coerce.number().int('price must be an integer').min(0, 'price must be non-negative'),
    type: z.enum(['VIP', 'NORMAL']),
  })
  .strict();

export const ticketParamsSchema = z
  .object({
    id: z.string().uuid('id must be a valid UUID'),
  })
  .strict();

export const updateTicketSchema = z
  .object({
    totalStock: z.coerce.number().int('totalStock must be an integer').min(1, 'totalStock must be a positive integer').max(1_000_000, 'totalStock is too large').optional(),
    price: z.coerce.number().int('price must be an integer').min(0, 'price must be non-negative').optional(),
    type: z.enum(['VIP', 'NORMAL']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type TicketParams = z.infer<typeof ticketParamsSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
