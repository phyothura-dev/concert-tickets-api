import { Router, type Request, type Response } from 'express';
import { toSingerDto, toSingerDtoList } from '../dtos/singer.dto';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/async-handler';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { SingerService } from '../services/singer.service';
import {
  createSingerSchema,
  singerParamsSchema,
  updateSingerSchema,
  type CreateSingerInput,
  type SingerParams,
  type UpdateSingerInput,
} from '../validations/singer.validation';

export const singerRouter = Router();
const singerService = new SingerService();

singerRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const singers = await singerService.listSingers();
  res.status(200).json({ message: 'Fetched singers successfully', data: toSingerDtoList(singers) });
}));

singerRouter.post('/', requireAuthMiddleware, requireAdminMiddleware, validateBody(createSingerSchema), asyncHandler(async (req: Request<unknown, unknown, CreateSingerInput>, res: Response) => {
  const singer = await singerService.createSinger(req.body);
  res.status(201).json({ message: 'Singer created successfully', data: toSingerDto(singer) });
}));

singerRouter.get('/:id', validateParams(singerParamsSchema), asyncHandler(async (req: Request<SingerParams>, res: Response) => {
  const singer = await singerService.getSinger(req.params.id);
  res.status(200).json({ message: 'Fetched singer successfully', data: toSingerDto(singer) });
}));

singerRouter.patch('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(singerParamsSchema), validateBody(updateSingerSchema), asyncHandler(async (req: Request<SingerParams, unknown, UpdateSingerInput>, res: Response) => {
  const singer = await singerService.updateSinger(req.params.id, req.body);
  res.status(200).json({ message: 'Singer updated successfully', data: toSingerDto(singer) });
}));

singerRouter.delete('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(singerParamsSchema), asyncHandler(async (req: Request<SingerParams>, res: Response) => {
  const result = await singerService.deleteSinger(req.params.id);
  res.status(200).json({ message: 'Singer deleted successfully', data: result });
}));
