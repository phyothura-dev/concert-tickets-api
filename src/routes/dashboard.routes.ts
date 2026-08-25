import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { dashboardService } from '../services/dashboard.service';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuthMiddleware);
dashboardRouter.use(requireAdminMiddleware);
dashboardRouter.get('/metrics', asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getMetrics();
  res.status(200).json({
    message: 'Fetched dashboard metrics',
    data,
  });
}));
