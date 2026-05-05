import { z } from 'zod';

export const createConcertSchema = z
  .object({
    title: z.string().min(1, 'title is required').max(500, 'title is too long'),
    venue: z.string().min(1, 'venue is required').max(500, 'venue is too long'),
    startsAt: z.coerce.date({ message: 'startsAt must be a valid date' }),
  })
  .strict();

export type CreateConcertInput = z.infer<typeof createConcertSchema>;
