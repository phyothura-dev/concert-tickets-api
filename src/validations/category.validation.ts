import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(1, 'slug is required')
  .max(120, 'slug is too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must contain lowercase letters, numbers, and hyphens only');

export const categoryParamsSchema = z
  .object({
    id: z.string().uuid('id must be a valid UUID'),
  })
  .strict();

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(120, 'name is too long'),
    slug: slugSchema.optional(),
  })
  .strict();

export const updateCategorySchema = createCategorySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export type CategoryParams = z.infer<typeof categoryParamsSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
