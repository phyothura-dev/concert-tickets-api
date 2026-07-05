import { z } from 'zod';

export const googleSignInSchema = z
  .object({
    idToken: z.string().min(10, 'idToken is required').max(10000, 'idToken is too large'),
  })
  .strict();

export const registerSchema = z
  .object({
    email: z.string().trim().email('email must be valid').max(320, 'email is too long'),
    password: z.string().min(8, 'password must be at least 8 characters').max(200, 'password is too long'),
    name: z.string().trim().min(1, 'name is required').max(160, 'name is too long').optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email('email must be valid').max(320, 'email is too long'),
    password: z.string().min(1, 'password is required').max(200, 'password is too long'),
  })
  .strict();

export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
