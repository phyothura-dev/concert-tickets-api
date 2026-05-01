import { Router, type Request, type Response } from 'express';
import { ConcertService } from '../services/concert.service';
import { asyncHandler } from '../middleware/async-handler';
import { toConcertDtoList } from '../dtos/concert.dto';

export const concertRouter = Router();
const concertService = new ConcertService();

concertRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const concerts = await concertService.listConcerts();
    res.status(200).json({message: 'Fetched concerts successfully',data: toConcertDtoList(concerts)});
  }),
);
