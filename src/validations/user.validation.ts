import { z } from 'zod';

export const userParamsSchema = z
  .object({
    id: z.string().uuid('id must be a valid UUID'),
  })
  .strict();

export const updateUserSchema = z
  .object({
    email: z.string().trim().email('email must be valid').max(320, 'email is too long').optional(),
    name: z.string().trim().min(1, 'name is required').max(160, 'name is too long').nullable().optional(),
    pictureUrl: z.string().trim().url('pictureUrl must be a valid URL').max(1000, 'pictureUrl is too long').nullable().optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
    emailVerified: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type UserParams = z.infer<typeof userParamsSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
