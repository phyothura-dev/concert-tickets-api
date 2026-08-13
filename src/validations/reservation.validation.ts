import { z } from 'zod';

export const reserveSchema = z.object({
  ticketId: z.string().uuid('ticketId must be a valid UUID'),
  seatIds: z.array(z.string().uuid('seatIds must contain valid UUIDs'))
    .min(1, 'Select at least one seat')
    .max(5, 'A reservation can contain at most 5 seats'),
}).strict().superRefine((value, context) => {
  if (new Set(value.seatIds).size !== value.seatIds.length) {
    context.addIssue({ code: 'custom', path: ['seatIds'], message: 'Seat selections must be unique' });
  }
});

export const reservationParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
}).strict();


export type ReserveInput = z.infer<typeof reserveSchema>;
export type ReservationParams = z.infer<typeof reservationParamsSchema>;
