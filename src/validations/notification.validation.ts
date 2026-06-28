import { z } from 'zod';

export const registerNotificationTokenSchema = z
  .object({
    token: z.string().min(10, 'token is required').max(4096, 'token is too large'),
    platform: z.enum(['web', 'android', 'ios']).optional(),
  })
  .strict();

export const removeNotificationTokenSchema = z
  .object({
    token: z.string().min(10, 'token is required').max(4096, 'token is too large'),
  })
  .strict();

export type RegisterNotificationTokenInput = z.infer<typeof registerNotificationTokenSchema>;
export type RemoveNotificationTokenInput = z.infer<typeof removeNotificationTokenSchema>;
