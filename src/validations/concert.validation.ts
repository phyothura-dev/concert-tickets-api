import { z } from 'zod';
import { imageFileSchema } from './image.validation';

export const listConcertsQuerySchema = z
  .object({
    search: z.string().trim().min(1, 'search cannot be empty').max(160, 'search is too long').optional(),
    venue: z.string().trim().min(1, 'venue cannot be empty').max(500, 'venue is too long').optional(),
    categoryId: z.string().uuid('categoryId must be a valid UUID').optional(),
  })
  .strict();

export const createConcertSchema = z
  .object({
    title: z.string().min(1, 'title is required').max(500, 'title is too long'),
    venue: z.string().min(1, 'venue is required').max(500, 'venue is too long'),
    startsAt: z.coerce.date({ message: 'startsAt must be a valid date' }),
    categoryId: z.string().uuid('categoryId must be a valid UUID').nullable().optional(),
    singerIds: z.array(z.string().uuid('singerIds must contain valid UUIDs')).max(50, 'too many singers').optional(),
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

export const concertMultipartSchema = z.object({
  data: z.string().transform((value, context): unknown => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: 'custom', message: 'Concert data must be valid JSON' });
      return z.NEVER;
    }
  }),
  image: imageFileSchema.optional(),
}).strict();

export type CreateConcertInput = z.infer<typeof createConcertSchema>;
export type ConcertParams = z.infer<typeof concertParamsSchema>;
export type ListConcertsQuery = z.infer<typeof listConcertsQuerySchema>;
export type UpdateConcertInput = z.infer<typeof updateConcertSchema>;
