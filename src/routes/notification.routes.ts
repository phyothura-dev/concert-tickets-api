import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { NotificationService } from '../services/notification.service';
import {
  registerNotificationTokenSchema,
  removeNotificationTokenSchema,
  type RegisterNotificationTokenInput,
  type RemoveNotificationTokenInput,
} from '../validations/notification.validation';

export const notificationRouter = Router();

const notificationService = new NotificationService();

notificationRouter.post(
  '/register-token',
  authLimiter,
  requireAuthMiddleware,
  validateBody(registerNotificationTokenSchema),
  asyncHandler(async (req: Request<unknown, unknown, RegisterNotificationTokenInput>, res: Response) => {
    const result = await notificationService.registerToken(req.user!.userId, req.body);
    res.status(200).json({ message: 'Notification token registered successfully', data: result });
  }),
);

notificationRouter.delete(
  '/register-token',
  authLimiter,
  requireAuthMiddleware,
  validateBody(removeNotificationTokenSchema),
  asyncHandler(async (req: Request<unknown, unknown, RemoveNotificationTokenInput>, res: Response) => {
    const result = await notificationService.disableToken(req.user!.userId, req.body);
    res.status(200).json({ message: 'Notification token disabled successfully', data: result });
  }),
);
