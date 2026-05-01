import AppDataSource from '../data-source';
import { Concert } from '../entities/Concert';
import { Ticket } from '../entities/Ticket';
import { ConflictError, NotFoundError } from '../lib/errors';
import { CreateTicketInput } from '../validations/ticket.validation';

export class TicketService {
  async listTickets(): Promise<Ticket[]> {
    const repo = AppDataSource.getRepository(Ticket);
    return repo.find({ order: { concertId: 'ASC' } });
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
}
