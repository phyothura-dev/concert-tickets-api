import AppDataSource from "../data-source";
import { Reservation } from "../entities/Reservation";
import { Ticket } from "../entities/Ticket";

export class CleanupService {
  async cleanupExpiredReservations(now: Date = new Date()): Promise<{ expired: number }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expired = await queryRunner.manager.find(Reservation, {
        where: { status: "PENDING" as const },
      });

      let expiredCount = 0;
      for (const r of expired) {
        if (r.expiresAt.getTime() > now.getTime()) continue;

        const ticket = await queryRunner.manager.findOne(Ticket, {
          where: { concertId: r.concertId },
        });
        if (ticket) {
          ticket.remainingStock += r.quantity;
          await queryRunner.manager.save(Ticket, ticket);
        }

        r.status = "EXPIRED";
        await queryRunner.manager.save(Reservation, r);
        expiredCount += 1;
      }

      await queryRunner.commitTransaction();
      return { expired: expiredCount };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

