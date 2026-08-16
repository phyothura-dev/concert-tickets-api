import { Router, type Request, type Response } from 'express';
import { concertService } from '../services/concert.service';
import { asyncHandler } from '../middleware/async-handler';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { parseSchema, validateParams, validateQuery } from '../middleware/validate.middleware';
import { toConcertDto, toConcertDtoList } from '../dtos/concert.dto';
import multer from 'multer';
import type { UploadedImage } from '../validations/image.validation';
import {
  concertMultipartSchema,
  concertParamsSchema,
  createConcertSchema,
  listConcertsQuerySchema,
  updateConcertSchema,
  type ConcertParams,
  type CreateConcertInput,
  type ListConcertsQuery,
  type UpdateConcertInput,
} from '../validations/concert.validation';
import type { ZodType } from 'zod';

export const concertRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

function readConcertRequest<T>(req: Request, schema: ZodType<T>): { input: T; image?: UploadedImage } {
  if (!req.file) {
    return { input: parseSchema(schema, req.body) };
  }

  const multipart = parseSchema(concertMultipartSchema, {
    data: req.body.data,
    image: req.file,
  });
  const input = parseSchema(schema, multipart.data);
  return multipart.image ? { input, image: multipart.image } : { input };
}

concertRouter.get('/', validateQuery(listConcertsQuerySchema), asyncHandler(async (req: Request<unknown, unknown, unknown, ListConcertsQuery>, res: Response) => {
    const concerts = await concertService.listConcerts(req.query);
    res.status(200).json({message: 'Fetched concerts successfully',data: toConcertDtoList(concerts)});
  }),
);

concertRouter.post('/', requireAuthMiddleware, requireAdminMiddleware, upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  const { input, image } = readConcertRequest<CreateConcertInput>(req, createConcertSchema);
  const concert = await concertService.createConcert(input, image);
  res.status(201).json({ message: 'Concert created successfully', data: toConcertDto(concert) });
}));

concertRouter.get('/:id', validateParams(concertParamsSchema), asyncHandler(async (req: Request<ConcertParams>, res: Response) => {
  const concert = await concertService.getConcert(req.params.id);
  res.status(200).json({ message: 'Fetched concert successfully', data: toConcertDto(concert) });
}));

concertRouter.patch('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(concertParamsSchema), upload.single('image'), asyncHandler(async (req: Request<ConcertParams>, res: Response) => {
  const { input, image } = readConcertRequest<UpdateConcertInput>(req, updateConcertSchema);
  const concert = await concertService.updateConcert(req.params.id, input, image);
  res.status(200).json({ message: 'Concert updated successfully', data: toConcertDto(concert) });
}));

concertRouter.delete('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(concertParamsSchema), asyncHandler(async (req: Request<ConcertParams>, res: Response) => {
  const result = await concertService.deleteConcert(req.params.id);
  res.status(200).json({ message: 'Concert deleted successfully', data: result });
}));
