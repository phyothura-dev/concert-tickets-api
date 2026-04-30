import { QueryRunner } from 'typeorm';
import AppDataSource from '../data-source';
import { Reservation } from '../entities/Reservation';
import { Ticket } from '../entities/Ticket';
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
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expiresAt = new Date(Date.now() + holdSeconds * 1000);

      const ticket = await this.findTicketForUpdate(queryRunner, input.concertId);
      if (!ticket) {
        throw new Error('No ticket stock configured for concert');
      }
      if (ticket.remainingStock < input.quantity) {
        throw new Error('Not enough remaining stock');
      }

      ticket.remainingStock -= input.quantity;
      await queryRunner.manager.save(Ticket, ticket);

      const reservation = queryRunner.manager.create(Reservation, {
        concertId: input.concertId,
        quantity: input.quantity,
        status: 'PENDING',
        expiresAt,
      });
      const saved = await queryRunner.manager.save(Reservation, reservation);

      await queryRunner.commitTransaction();

      return { reservationId: saved.id, expiresAt: expiresAt.toISOString() };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async purchase(input: PurchaseInput): Promise<PurchaseResult> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id: input.reservationId },
      });
      if (!reservation) {
        throw new Error('Reservation not found');
      }
      if (reservation.status !== 'PENDING') {
        throw new Error('Reservation is not pending');
      }
      if (reservation.expiresAt.getTime() <= Date.now()) {
        reservation.status = 'EXPIRED';
        await queryRunner.manager.save(Reservation, reservation);
        throw new Error('Reservation expired');
      }

      reservation.status = 'PURCHASED';
      await queryRunner.manager.save(Reservation, reservation);

      await queryRunner.commitTransaction();
      return { reservationId: reservation.id, status: 'PURCHASED' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async findTicketForUpdate(queryRunner: QueryRunner, concertId: string): Promise<Ticket | null> {
    return await queryRunner.manager.findOne(Ticket, { where: { concertId } });
  }
}
