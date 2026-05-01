import { OptimisticLockVersionMismatchError, type QueryRunner } from 'typeorm';
import { Reservation } from '../entities/Reservation';
import { Ticket } from '../entities/Ticket';
import { ConflictError, NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';
import { withImmediateTransaction, withTransaction } from '../lib/transaction';
import type { DirectPurchaseInput } from '../validations/reservation.validation';

export type DirectPurchaseResult = {
  reservationId: string;
  concertId: string;
  quantity: number;
  remainingStock: number;
  method: 'OPTIMISTIC' | 'PESSIMISTIC';
};

const SQLITE_BUSY_PATTERN = /SQLITE_BUSY|database is locked/i;

export class PurchaseService {
  private async loadTicketOrThrow(concertId: string, queryRunner: QueryRunner): Promise<Ticket> {
    const ticket = await queryRunner.manager.findOne(Ticket, {
      where: { concertId },
    });
    if (!ticket) {
      throw new NotFoundError('No ticket stock configured for concert', null, 'TICKET_NOT_FOUND');
    }
    return ticket;
  }

  private ensureEnoughStockOrThrow(ticket: Ticket, quantity: number): void {
    if (ticket.remainingStock < quantity) {
      throw new ConflictError('NOT_ENOUGH_STOCK', 'Not enough remaining stock');
    }
  }

  private async createPurchasedReservation(queryRunner: QueryRunner, concertId: string, quantity: number): Promise<Reservation> {
    const reservation = queryRunner.manager.create(Reservation, {
      concertId,
      quantity,
      status: 'PURCHASED',
      expiresAt: new Date(),
    });
    return queryRunner.manager.save(Reservation, reservation);
  }

  // Optimistic locking
  async purchaseOptimistic(input: DirectPurchaseInput): Promise<DirectPurchaseResult> {
    try {
      return await withTransaction(async (queryRunner) => {
        const ticket = await this.loadTicketOrThrow(input.concertId, queryRunner);
        this.ensureEnoughStockOrThrow(ticket, input.quantity);

        ticket.remainingStock -= input.quantity;
        const savedTicket = await queryRunner.manager.save(Ticket, ticket);
        const savedReservation = await this.createPurchasedReservation(queryRunner, input.concertId, input.quantity);

        return {
          reservationId: savedReservation.id,
          concertId: input.concertId,
          quantity: input.quantity,
          remainingStock: savedTicket.remainingStock,
          method: 'OPTIMISTIC',
        };
      });
    } catch (err) {
      if (err instanceof OptimisticLockVersionMismatchError) {
        logger.warn({ err }, 'Optimistic lock conflict on Ticket version');
        throw new ConflictError('VERSION_CONFLICT', 'Ticket was modified concurrently. Please retry.');
      }
      throw err;
    }
  }

  // Pessimistic locking
  async purchasePessimistic(input: DirectPurchaseInput): Promise<DirectPurchaseResult> {
    try {
      return await withImmediateTransaction(async (queryRunner) => {
        const ticket = await this.loadTicketOrThrow(input.concertId, queryRunner);
        this.ensureEnoughStockOrThrow(ticket, input.quantity);

        const updateResult = await queryRunner.manager
          .createQueryBuilder()
          .update(Ticket)
          .set({
            remainingStock: () => 'remainingStock - :qty',
            version: () => 'version + 1',
          })
          .where('id = :id', { id: ticket.id })
          .setParameter('qty', input.quantity)
          .execute();

        if (!updateResult.affected || updateResult.affected === 0) {
          throw new ConflictError('LOCK_CONFLICT', 'Ticket row was contested. Please retry.');
        }

        const savedReservation = await this.createPurchasedReservation(queryRunner, input.concertId, input.quantity);

        return {
          reservationId: savedReservation.id,
          concertId: input.concertId,
          quantity: input.quantity,
          remainingStock: ticket.remainingStock - input.quantity,
          method: 'PESSIMISTIC',
        };
      });
    } catch (err) {
      if (err instanceof Error && SQLITE_BUSY_PATTERN.test(err.message)) {
        logger.warn({ err }, 'Pessimistic lock contention (SQLITE_BUSY)');
        throw new ConflictError('LOCK_CONFLICT', 'Database is locked by another writer. Please retry.');
      }
      throw err;
    }
  }
}
