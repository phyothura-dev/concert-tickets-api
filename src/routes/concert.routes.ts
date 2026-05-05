import { Router, type Request, type Response } from 'express';
import { ConcertService } from '../services/concert.service';
import { asyncHandler } from '../middleware/async-handler';
import { validateBody } from '../middleware/validate.middleware';
import { toConcertDto, toConcertDtoList } from '../dtos/concert.dto';
import { createConcertSchema, type CreateConcertInput } from '../validations/concert.validation';

export const concertRouter = Router();
const concertService = new ConcertService();

concertRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const concerts = await concertService.listConcerts();
    res.status(200).json({message: 'Fetched concerts successfully',data: toConcertDtoList(concerts)});
  }),
);

concertRouter.post('/', validateBody(createConcertSchema), asyncHandler(async (req: Request<unknown, unknown, CreateConcertInput>, res: Response) => {
  const concert = await concertService.createConcert(req.body);
  res.status(201).json({ message: 'Concert created successfully', data: toConcertDto(concert) });
}));
