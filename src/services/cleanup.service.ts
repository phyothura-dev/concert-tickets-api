import { Reservation } from '../entities/Reservation';
import { Ticket } from '../entities/Ticket';
import { LessThanOrEqual } from 'typeorm';
import { withTransaction } from '../lib/transaction';

export class CleanupService {
  async cleanupExpiredReservations(now: Date = new Date()): Promise<{ expired: number }> {
    return withTransaction(async (queryRunner) => {
      const expired = await queryRunner.manager.find(Reservation, {
        where: {
          status: 'PENDING' as const,
          expiresAt: LessThanOrEqual(now),
        },
      });

      if (expired.length === 0) {
        return { expired: 0 };
      }

      for (const r of expired) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(Ticket)
          .set({
            remainingStock: () => 'remainingStock + :qty',
            version: () => 'version + 1',
          })
          .where('concertId = :cid', { cid: r.concertId })
          .setParameter('qty', r.quantity)
          .execute();
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(Reservation)
        .set({ status: 'EXPIRED' })
        .whereInIds(expired.map((r) => r.id))
        .execute();

      return { expired: expired.length };
    });
  }
}
