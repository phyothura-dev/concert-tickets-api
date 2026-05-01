import { Reservation } from '../entities/Reservation';
import { Ticket } from '../entities/Ticket';
import { ConflictError, NotFoundError } from '../lib/errors';
import { withTransaction } from '../lib/transaction';
import { PurchaseInput, ReserveInput } from '../validations/reservation.validation';

export type ReserveResult = {
  reservationId: string;
  expiresAt: string;
};

export type PurchaseResult = {
  reservationId: string;
  status: 'PURCHASED';
};

export class ReservationService {
  async reserve(input: ReserveInput): Promise<ReserveResult> {
    const holdSeconds = input.holdSeconds ?? 120;
    return withTransaction(async (queryRunner) => {
      const expiresAt = new Date(Date.now() + holdSeconds * 1000);

      const result = await queryRunner.manager
        .createQueryBuilder()
        .update(Ticket)
        .set({
          remainingStock: () => 'remainingStock - :qty',
          version: () => 'version + 1',
        })
        .where('concertId = :cid AND remainingStock >= :qty', {
          cid: input.concertId,
          qty: input.quantity,
        })
        .execute();

      if (!result.affected || result.affected === 0) {
        const exists = await queryRunner.manager.exists(Ticket, {
          where: { concertId: input.concertId },
        });
        if (!exists) {
          throw new NotFoundError('No ticket stock configured for concert', null, 'TICKET_NOT_FOUND');
        }
        throw new ConflictError('NOT_ENOUGH_STOCK', 'Not enough remaining stock');
      }

      const reservation = queryRunner.manager.create(Reservation, {
        concertId: input.concertId,
        quantity: input.quantity,
        status: 'PENDING',
        expiresAt,
      });
      const saved = await queryRunner.manager.save(Reservation, reservation);

      return { reservationId: saved.id, expiresAt: expiresAt.toISOString() };
    });
  }

  async purchase(input: PurchaseInput): Promise<PurchaseResult> {
    return withTransaction(async (queryRunner) => {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id: input.reservationId },
      });
      if (!reservation) {
        throw new NotFoundError('Reservation not found', null, 'RESERVATION_NOT_FOUND');
      }
      if (reservation.status !== 'PENDING') {
        throw new ConflictError('RESERVATION_NOT_PENDING', 'Reservation is not pending');
      }
      if (reservation.expiresAt.getTime() <= Date.now()) {
        reservation.status = 'EXPIRED';
        await queryRunner.manager.save(Reservation, reservation);
        throw new ConflictError('RESERVATION_EXPIRED', 'Reservation expired');
      }

      reservation.status = 'PURCHASED';
      await queryRunner.manager.save(Reservation, reservation);

      return { reservationId: reservation.id, status: 'PURCHASED' };
    });
  }
}
