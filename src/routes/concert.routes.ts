import { Router, type Request, type Response } from "express";
import { success } from "../errors";
import { ConcertService } from "../services/concert.service";

export const concertRouter = Router();
const concertService = new ConcertService();

concertRouter.get("/", async (_req: Request, res: Response) => {
  const concerts = await concertService.listConcerts();
  success(res, concerts, 'Fetched concerts successfully', 200);
});
