import { z } from 'zod';

export const googleSignInSchema = z
  .object({
    idToken: z.string().min(10, 'idToken is required').max(10000, 'idToken is too large'),
  })
  .strict();

export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
