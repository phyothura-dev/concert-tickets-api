import { z } from 'zod';

export const singerParamsSchema = z
  .object({
    id: z.string().uuid('id must be a valid UUID'),
  })
  .strict();

export const createSingerSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(160, 'name is too long'),
    title: z.string().trim().min(1, 'title is required').max(160, 'title is too long'),
  })
  .strict();

export const updateSingerSchema = createSingerSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export type SingerParams = z.infer<typeof singerParamsSchema>;
export type CreateSingerInput = z.infer<typeof createSingerSchema>;
export type UpdateSingerInput = z.infer<typeof updateSingerSchema>;
