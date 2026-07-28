import AppDataSource from '../data-source';
import { Concert } from '../entities/Concert';
import { Reservation } from '../entities/Reservation';
import { Ticket } from '../entities/Ticket';
import { ConflictError, NotFoundError } from '../lib/errors';
import { CreateTicketInput, UpdateTicketInput } from '../validations/ticket.validation';

export class TicketService {
  async listTickets(): Promise<Ticket[]> {
    const repo = AppDataSource.getRepository(Ticket);
    return repo.find({ order: { concertId: 'ASC' } });
  }

  async getTicket(id: string): Promise<Ticket> {
    const ticket = await AppDataSource.getRepository(Ticket).findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundError('Ticket not found', null, 'TICKET_NOT_FOUND');
    }
    return ticket;
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const ticketRepo = AppDataSource.getRepository(Ticket);
    const concertRepo = AppDataSource.getRepository(Concert);

    const concertExists = await concertRepo.exists({ where: { id: input.concertId } });
    if (!concertExists) {
      throw new NotFoundError('Concert not found', null, 'CONCERT_NOT_FOUND');
    }

    const existing = await ticketRepo.findOne({ where: { concertId: input.concertId } });
    if (existing) {
      throw new ConflictError('TICKET_ALREADY_EXISTS', 'Ticket inventory already exists for concert');
    }

    const entity = ticketRepo.create({
      concertId: input.concertId,
      totalStock: input.totalStock,
      remainingStock: input.totalStock,
      price: input.price,
      type: input.type,
    });
    return ticketRepo.save(entity);
  }

  async updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket> {
    const ticketRepo = AppDataSource.getRepository(Ticket);
    const ticket = await ticketRepo.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundError('Ticket not found', null, 'TICKET_NOT_FOUND');
    }

    if (input.totalStock !== undefined) {
      const allocatedStock = ticket.totalStock - ticket.remainingStock;
      if (input.totalStock < allocatedStock) {
        throw new ConflictError(
          'TOTAL_STOCK_BELOW_ALLOCATED',
          'totalStock cannot be lower than already reserved or purchased stock',
          { allocatedStock },
        );
      }

      const delta = input.totalStock - ticket.totalStock;
      ticket.totalStock = input.totalStock;
      ticket.remainingStock += delta;
    }

    if (input.price !== undefined) {
      ticket.price = input.price;
    }
    if (input.type !== undefined) {
      ticket.type = input.type;
    }

    return ticketRepo.save(ticket);
  }

  async deleteTicket(id: string): Promise<{ deleted: true }> {
    const ticketRepo = AppDataSource.getRepository(Ticket);
    const ticket = await ticketRepo.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundError('Ticket not found', null, 'TICKET_NOT_FOUND');
    }

    const hasPendingReservations = await AppDataSource.getRepository(Reservation).exists({
      where: { concertId: ticket.concertId, status: 'PENDING' },
    });

    if (hasPendingReservations) {
      throw new ConflictError(
        'TICKET_HAS_PENDING_RESERVATIONS',
        'Cannot delete ticket inventory while pending reservations exist',
      );
    }

    await ticketRepo.delete({ id });
    return { deleted: true };
  }
}
