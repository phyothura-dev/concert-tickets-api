import { Router, type Request, type Response } from 'express';
import { ConcertService } from '../services/concert.service';
import { asyncHandler } from '../middleware/async-handler';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { toConcertDto, toConcertDtoList } from '../dtos/concert.dto';
import {
  concertParamsSchema,
  createConcertSchema,
  listConcertsQuerySchema,
  updateConcertSchema,
  type ConcertParams,
  type CreateConcertInput,
  type ListConcertsQuery,
  type UpdateConcertInput,
} from '../validations/concert.validation';

export const concertRouter = Router();
const concertService = new ConcertService();

concertRouter.get('/', validateQuery(listConcertsQuerySchema), asyncHandler(async (req: Request<unknown, unknown, unknown, ListConcertsQuery>, res: Response) => {
    const concerts = await concertService.listConcerts(req.query);
    res.status(200).json({message: 'Fetched concerts successfully',data: toConcertDtoList(concerts)});
  }),
);

concertRouter.post('/', requireAuthMiddleware, requireAdminMiddleware, validateBody(createConcertSchema), asyncHandler(async (req: Request<unknown, unknown, CreateConcertInput>, res: Response) => {
  const concert = await concertService.createConcert(req.body);
  res.status(201).json({ message: 'Concert created successfully', data: toConcertDto(concert) });
}));

concertRouter.get('/:id', validateParams(concertParamsSchema), asyncHandler(async (req: Request<ConcertParams>, res: Response) => {
  const concert = await concertService.getConcert(req.params.id);
  res.status(200).json({ message: 'Fetched concert successfully', data: toConcertDto(concert) });
}));

concertRouter.patch('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(concertParamsSchema), validateBody(updateConcertSchema), asyncHandler(async (req: Request<ConcertParams, unknown, UpdateConcertInput>, res: Response) => {
  const concert = await concertService.updateConcert(req.params.id, req.body);
  res.status(200).json({ message: 'Concert updated successfully', data: toConcertDto(concert) });
}));

concertRouter.delete('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(concertParamsSchema), asyncHandler(async (req: Request<ConcertParams>, res: Response) => {
  const result = await concertService.deleteConcert(req.params.id);
  res.status(200).json({ message: 'Concert deleted successfully', data: result });
}));
