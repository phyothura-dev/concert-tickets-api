import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { TicketService } from '../services/ticket.service';
import { toTicketDto, toTicketDtoList } from '../dtos/ticket.dto';
import { toSeatDtoList } from '../dtos/seat.dto';
import {
  createTicketSchema,
  ticketParamsSchema,
  updateTicketSchema,
  type CreateTicketInput,
  type TicketParams,
  type UpdateTicketInput,
} from '../validations/ticket.validation';

export const ticketRouter = Router();
const ticketService = new TicketService();

ticketRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const tickets = await ticketService.listTickets();
    res.status(200).json({message: 'Fetched tickets successfully',data: toTicketDtoList(tickets)});
  }),
);

ticketRouter.post('/', requireAuthMiddleware, requireAdminMiddleware, validateBody(createTicketSchema), asyncHandler(async (req: Request<unknown, unknown, CreateTicketInput>, res: Response) => {
  const ticket = await ticketService.createTicket(req.body);
  res.status(201).json({message: 'Ticket inventory created successfully',data: toTicketDto(ticket)});
}));

ticketRouter.get('/:id/seats', validateParams(ticketParamsSchema), asyncHandler(async (req: Request<TicketParams>, res: Response) => {
  const seats = await ticketService.listSeats(req.params.id);
  res.status(200).json({ message: 'Fetched seats successfully', data: toSeatDtoList(seats) });
}));

ticketRouter.get('/:id', validateParams(ticketParamsSchema), asyncHandler(async (req: Request<TicketParams>, res: Response) => {
  const ticket = await ticketService.getTicket(req.params.id);
  res.status(200).json({ message: 'Fetched ticket successfully', data: toTicketDto(ticket) });
}));

ticketRouter.patch('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(ticketParamsSchema), validateBody(updateTicketSchema), asyncHandler(async (req: Request<TicketParams, unknown, UpdateTicketInput>, res: Response) => {
  const ticket = await ticketService.updateTicket(req.params.id, req.body);
  res.status(200).json({ message: 'Ticket inventory updated successfully', data: toTicketDto(ticket) });
}));

ticketRouter.delete('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(ticketParamsSchema), asyncHandler(async (req: Request<TicketParams>, res: Response) => {
  const result = await ticketService.deleteTicket(req.params.id);
  res.status(200).json({ message: 'Ticket inventory deleted successfully', data: result });
}));
