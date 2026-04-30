import express, { type Application, type Request, type Response } from "express";
import { concertRouter } from "./routes/concert.routes";
import { reservationRouter } from "./routes/reservation.routes";

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ message: "ticket reservation api is running" });
  });

  app.use("/concerts", concertRouter);
  app.use("/", reservationRouter);

  return app;
}
