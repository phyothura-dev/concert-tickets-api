import { In, LessThanOrEqual } from 'typeorm';
import { PaymentSubmission } from '../entities/PaymentSubmission';
import { Reservation } from '../entities/Reservation';
import { withTransaction } from '../lib/transaction';
import { ReservationService } from './reservation.service';

export class CleanupService {
  async cleanupExpiredReservations(now: Date = new Date()): Promise<{ expired: number }> {
    return withTransaction(async (queryRunner) => {
      const expired = await queryRunner.manager.find(Reservation, {
        where: {
          status: In(['PENDING', 'UNDER_REVIEW']),
          expiresAt: LessThanOrEqual(now),
        },
      });
      for (const reservation of expired) {
        await ReservationService.releaseSeats(queryRunner.manager, reservation, 'EXPIRED');
      }
      if (expired.length > 0) {
        await queryRunner.manager.createQueryBuilder().update(PaymentSubmission)
          .set({ status: 'EXPIRED' })
          .where('"reservationId" IN (:...ids) AND status = :status', {
            ids: expired.map((item) => item.id), status: 'PENDING_REVIEW',
          }).execute();
      }
      return { expired: expired.length };
    });
  }
}

export const cleanupService = new CleanupService();
