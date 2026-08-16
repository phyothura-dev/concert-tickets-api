import { In, type EntityManager } from 'typeorm';
import AppDataSource from '../data-source';
import { Reservation, type ReservationStatus } from '../entities/Reservation';
import { ReservationSeat } from '../entities/ReservationSeat';
import { Seat } from '../entities/Seat';
import { Ticket } from '../entities/Ticket';
import { ConflictError, ForbiddenError, NotFoundError } from '../lib/errors';
import { withTransaction } from '../lib/transaction';
import type { ReserveInput } from '../validations/reservation.validation';

import { RESERVATION_HOLD_MS } from '../config/constants';

const relations = {
  concert: true,
  ticket: true,
  seatAssignments: { seat: true },
  payment: true,
} as const;

export class ReservationService {
  async listUserReservations(userId: string): Promise<Reservation[]> {
    return AppDataSource.getRepository(Reservation).find({
      where: { userId },
      relations,
      order: { createdAt: 'DESC' },
    });
  }

  async getReservation(id: string, userId: string, role: 'USER' | 'ADMIN'): Promise<Reservation> {
    const reservation = await AppDataSource.getRepository(Reservation).findOne({
      where: { id },
      relations,
    });
    if (!reservation) throw new NotFoundError('Reservation not found', null, 'RESERVATION_NOT_FOUND');
    if (role !== 'ADMIN' && reservation.userId !== userId) {
      throw new ForbiddenError('Reservation access denied', null, 'RESERVATION_ACCESS_DENIED');
    }
    return reservation;
  }

  async reserve(input: ReserveInput, userId: string): Promise<Reservation> {
    const savedId = await withTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const ticket = await manager.findOne(Ticket, { where: { id: input.ticketId } });
      if (!ticket) throw new NotFoundError('Ticket not found', null, 'TICKET_NOT_FOUND');

      const seats = await manager.find(Seat, {
        where: { id: In(input.seatIds), ticketId: ticket.id },
      });
      if (seats.length !== input.seatIds.length) {
        throw new ConflictError('SEAT_UNAVAILABLE', 'One or more selected seats are unavailable');
      }

      const expiresAt = new Date(Date.now() + RESERVATION_HOLD_MS);
      const reservation = await manager.save(Reservation, manager.create(Reservation, {
        concertId: ticket.concertId,
        ticketId: ticket.id,
        userId,
        quantity: seats.length,
        unitPrice: ticket.price,
        totalAmount: ticket.price * seats.length,
        status: 'PENDING',
        expiresAt,
      }));

      const held = await manager.createQueryBuilder().update(Seat).set({
        status: 'HELD', currentReservationId: reservation.id, holdExpiresAt: expiresAt,
      }).where('"ticketId" = :ticketId', { ticketId: ticket.id })
        .andWhere('id IN (:...seatIds)', { seatIds: input.seatIds })
        .andWhere('status = :status', { status: 'AVAILABLE' }).execute();
      if (held.affected !== seats.length) {
        throw new ConflictError('SEAT_UNAVAILABLE', 'One or more selected seats were just reserved');
      }

      const stock = await manager.createQueryBuilder().update(Ticket).set({
        remainingStock: () => '"remainingStock" - :quantity',
        version: () => 'version + 1',
      }).where('id = :ticketId AND "remainingStock" >= :quantity', {
        ticketId: ticket.id, quantity: seats.length,
      }).execute();
      if (stock.affected !== 1) throw new ConflictError('NOT_ENOUGH_STOCK', 'Not enough remaining stock');

      await manager.save(ReservationSeat, seats.map((seat) => manager.create(ReservationSeat, {
        reservationId: reservation.id,
        seatId: seat.id,
        labelSnapshot: seat.label,
      })));
      return reservation.id;
    });
    return this.getReservation(savedId, userId, 'USER');
  }

  static async releaseSeats(
    manager: EntityManager,
    reservation: Reservation,
    status: ReservationStatus,
  ): Promise<number> {
    if (!reservation.ticketId) {
      reservation.status = status;
      await manager.save(Reservation, reservation);
      return 0;
    }
    const released = await manager.createQueryBuilder().update(Seat).set({
      status: 'AVAILABLE', currentReservationId: null, holdExpiresAt: null,
    }).where('"currentReservationId" = :reservationId AND status = :held', {
      reservationId: reservation.id, held: 'HELD',
    }).execute();
    const count = released.affected ?? 0;
    if (count > 0) {
      await manager.createQueryBuilder().update(Ticket).set({
        remainingStock: () => '"remainingStock" + :count',
        version: () => 'version + 1',
      }).where('id = :ticketId', { ticketId: reservation.ticketId }).setParameter('count', count).execute();
    }
    reservation.status = status;
    await manager.save(Reservation, reservation);
    return count;
  }
}

export const reservationService = new ReservationService();
