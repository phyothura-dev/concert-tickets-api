import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { validateBody } from '../middleware/validate.middleware';
import { TicketService } from '../services/ticket.service';
import { toTicketDto, toTicketDtoList } from '../dtos/ticket.dto';
import { createTicketSchema, type CreateTicketInput } from '../validations/ticket.validation';

export const ticketRouter = Router();
const ticketService = new TicketService();

ticketRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const tickets = await ticketService.listTickets();
    res.status(200).json({message: 'Fetched tickets successfully',data: toTicketDtoList(tickets)});
  }),
);

ticketRouter.post('/', validateBody(createTicketSchema), asyncHandler(async (req: Request<unknown, unknown, CreateTicketInput>, res: Response) => {
  const ticket = await ticketService.createTicket(req.body);
  res.status(201).json({message: 'Ticket inventory created successfully',data: toTicketDto(ticket)});
}));
