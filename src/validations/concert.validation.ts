import { z } from 'zod';

export const createConcertSchema = z
  .object({
    title: z.string().min(1, 'title is required').max(500, 'title is too long'),
    venue: z.string().min(1, 'venue is required').max(500, 'venue is too long'),
    startsAt: z.coerce.date({ message: 'startsAt must be a valid date' }),
    categoryId: z.string().uuid('categoryId must be a valid UUID').nullable().optional(),
  })
  .strict();

export const concertParamsSchema = z
  .object({
    id: z.string().uuid('id must be a valid UUID'),
  })
  .strict();

export const updateConcertSchema = createConcertSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export type CreateConcertInput = z.infer<typeof createConcertSchema>;
export type ConcertParams = z.infer<typeof concertParamsSchema>;
export type UpdateConcertInput = z.infer<typeof updateConcertSchema>;
