import AppDataSource from '../data-source';
import { type EntityManager, QueryFailedError } from 'typeorm';
import { Concert } from '../entities/Concert';
import { Reservation } from '../entities/Reservation';
import { Seat } from '../entities/Seat';
import { Ticket, type TicketType } from '../entities/Ticket';
import { ConflictError, NotFoundError } from '../lib/errors';
import { withTransaction } from '../lib/transaction';
import { getOrSetCache, deleteCache, deleteCachePattern } from '../lib/cache';
import { CreateTicketInput, UpdateTicketInput } from '../validations/ticket.validation';

const SEATS_CACHE_TTL = 300; // 5 minutes

export class TicketService {
  private async saveTicket(
    ticket: Ticket,
    manager: EntityManager = AppDataSource.manager,
  ): Promise<Ticket> {
    try {
      return await manager.save(Ticket, ticket);
    } catch (error) {
      const databaseError = error instanceof QueryFailedError
        ? error.driverError as { code?: string; constraint?: string }
        : null;
      if (
        error instanceof QueryFailedError
        && databaseError?.code === '23505'
        && databaseError.constraint === 'idx_tickets_concertId_type'
      ) {
        throw new ConflictError(
          'TICKET_TYPE_ALREADY_EXISTS',
          'Ticket inventory already exists for this concert and ticket type',
        );
      }
      throw error;
    }
  }

  private seatLabel(type: TicketType, sequence: number): string {
    return `${type}-${sequence.toString().padStart(3, '0')}`;
  }

  private async createSeats(
    ticket: Ticket,
    from: number,
    to: number,
    manager: EntityManager,
  ): Promise<void> {
    if (from > to) return;
    const seats = Array.from({ length: to - from + 1 }, (_, index) => {
      const sequence = from + index;
      return manager.create(Seat, {
        ticketId: ticket.id,
        label: this.seatLabel(ticket.type, sequence),
        sequence,
        status: 'AVAILABLE' as const,
        currentReservationId: null,
        holdExpiresAt: null,
      });
    });
    await manager.save(Seat, seats);
  }

  async listTickets(): Promise<Ticket[]> {
    return AppDataSource.getRepository(Ticket).find({ order: { concertId: 'ASC', type: 'ASC' } });
  }

  async getTicket(id: string): Promise<Ticket> {
    const ticket = await AppDataSource.getRepository(Ticket).findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundError('Ticket not found', null, 'TICKET_NOT_FOUND');
    }
    return ticket;
  }

  async listSeats(ticketId: string): Promise<Seat[]> {
    await this.getTicket(ticketId);
    return getOrSetCache(`cache:tickets:seats:${ticketId}`, SEATS_CACHE_TTL, async () => {
      return AppDataSource.getRepository(Seat).find({
        where: { ticketId },
        order: { sequence: 'ASC' },
      });
    });
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const saved = await withTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const concertExists = await manager.exists(Concert, { where: { id: input.concertId } });
      if (!concertExists) {
        throw new NotFoundError('Concert not found', null, 'CONCERT_NOT_FOUND');
      }

      const existing = await manager.findOne(Ticket, {
        where: { concertId: input.concertId, type: input.type },
      });
      if (existing) {
        throw new ConflictError(
          'TICKET_TYPE_ALREADY_EXISTS',
          'Ticket inventory already exists for this concert and ticket type',
        );
      }

      const ticket = manager.create(Ticket, {
        concertId: input.concertId,
        totalStock: input.totalStock,
        remainingStock: input.totalStock,
        price: input.price,
        type: input.type,
      });
      const created = await this.saveTicket(ticket, manager);
      await this.createSeats(created, 1, created.totalStock, manager);
      return created;
    });

    await this.invalidateTicketCache(saved.id, saved.concertId);
    return saved;
  }

  async updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket> {
    const saved = await withTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const ticket = await manager.findOne(Ticket, { where: { id } });
      if (!ticket) {
        throw new NotFoundError('Ticket not found', null, 'TICKET_NOT_FOUND');
      }

      const nextConcertId = input.concertId ?? ticket.concertId;
      const nextType = input.type ?? ticket.type;
      if (nextConcertId !== ticket.concertId) {
        const concertExists = await manager.exists(Concert, { where: { id: nextConcertId } });
        if (!concertExists) {
          throw new NotFoundError('Concert not found', null, 'CONCERT_NOT_FOUND');
        }
      }

      const duplicate = await manager.findOne(Ticket, {
        where: { concertId: nextConcertId, type: nextType },
      });
      if (duplicate && duplicate.id !== ticket.id) {
        throw new ConflictError(
          'TICKET_TYPE_ALREADY_EXISTS',
          'Ticket inventory already exists for this concert and ticket type',
        );
      }

      const identityChanges = nextConcertId !== ticket.concertId || nextType !== ticket.type;
      if (identityChanges) {
        const hasReservations = await manager.exists(Reservation, { where: { ticketId: ticket.id } });
        const totalSeats = await manager.count(Seat, { where: { ticketId: ticket.id } });
        const availableSeats = await manager.count(Seat, {
          where: { ticketId: ticket.id, status: 'AVAILABLE' },
        });
        if (hasReservations || totalSeats !== availableSeats) {
          throw new ConflictError(
            'TICKET_HAS_ALLOCATIONS',
            'Cannot change concert or type after seats have been allocated',
          );
        }
      }

      if (input.totalStock !== undefined && input.totalStock !== ticket.totalStock) {
        const delta = input.totalStock - ticket.totalStock;
        if (delta > 0) {
          await this.createSeats(ticket, ticket.totalStock + 1, input.totalStock, manager);
        } else {
          const removable = await manager.find(Seat, {
            where: { ticketId: ticket.id, status: 'AVAILABLE' },
            order: { sequence: 'DESC' },
            take: Math.abs(delta),
          });
          if (removable.length !== Math.abs(delta)) {
            throw new ConflictError(
              'TOTAL_STOCK_BELOW_ALLOCATED',
              'Not enough available seats can be removed',
            );
          }
          await manager.remove(Seat, removable);
        }
        ticket.totalStock = input.totalStock;
        ticket.remainingStock += delta;
      }

      const { totalStock, ...scalarInput } = input;
      manager.merge(Ticket, ticket, scalarInput);

      if (input.type !== undefined && input.type !== ticket.type) {
        const seats = await manager.find(Seat, { where: { ticketId: ticket.id } });
        for (const seat of seats) {
          seat.label = this.seatLabel(input.type, seat.sequence);
        }
        await manager.save(Seat, seats);
      }

      return this.saveTicket(ticket, manager);
    });

    await this.invalidateTicketCache(saved.id, saved.concertId);
    return saved;
  }

  async deleteTicket(id: string): Promise<{ deleted: true }> {
    const ticket = await this.getTicket(id);
    const hasReservations = await AppDataSource.getRepository(Reservation).exists({
      where: { ticketId: ticket.id },
    });
    if (hasReservations) {
      throw new ConflictError(
        'TICKET_HAS_RESERVATIONS',
        'Cannot delete ticket inventory after reservations exist',
      );
    }
    await AppDataSource.getRepository(Ticket).delete({ id });
    await this.invalidateTicketCache(ticket.id, ticket.concertId);
    return { deleted: true };
  }

  private async invalidateTicketCache(ticketId: string, _concertId?: string): Promise<void> {
    await Promise.all([
      deleteCache(`cache:tickets:seats:${ticketId}`),
      deleteCachePattern('cache:concerts:*'),
    ]);
  }
}

export const ticketService = new TicketService();
