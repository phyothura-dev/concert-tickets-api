import AppDataSource from '../data-source';
import { Concert } from '../entities/Concert';
import { Reservation } from '../entities/Reservation';
import { User } from '../entities/User';
import type { DashboardMetrics } from '../validations/dashboard.validation';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    const concertRepo = AppDataSource.getRepository(Concert);
    const userRepo = AppDataSource.getRepository(User);
    const reservationRepo = AppDataSource.getRepository(Reservation);

    // Fetch concerts with tickets
    const concerts = await concertRepo.find({
      relations: ['tickets'],
      order: { startsAt: 'ASC' },
    });

    // Fetch total registered users
    const registeredUsers = await userRepo.count();

    // Fetch revenue per concert from purchased reservations
    const purchasedReservations = await reservationRepo.find({
      where: { status: 'PURCHASED' },
      select: ['concertId', 'totalAmount'],
    });

    const revenueByConcert = new Map<string, number>();
    let totalRevenue = 0;

    for (const res of purchasedReservations) {
      const amount = res.totalAmount ?? 0;
      totalRevenue += amount;
      revenueByConcert.set(res.concertId, (revenueByConcert.get(res.concertId) ?? 0) + amount);
    }

    let totalSoldStock = 0;

    const concertPerformance = concerts.map((concert) => {
      const totalStock = concert.tickets?.reduce((sum, t) => sum + (t.totalStock ?? 0), 0) ?? 0;
      const availableStock = concert.tickets?.reduce((sum, t) => sum + (t.remainingStock ?? 0), 0) ?? 0;
      const soldStock = Math.max(0, totalStock - availableStock);
      const revenue = revenueByConcert.get(concert.id) ?? 0;
      const occupancyRate = totalStock > 0 ? Math.round((soldStock / totalStock) * 100) : 0;

      totalSoldStock += soldStock;

      return {
        id: concert.id,
        title: concert.title,
        venue: concert.venue,
        startsAt: concert.startsAt.toISOString(),
        totalStock,
        availableStock,
        soldStock,
        revenue,
        occupancyRate,
      };
    });

    return {
      summary: {
        totalRevenue,
        ticketsSold: totalSoldStock,
        activeConcerts: concerts.length,
        registeredUsers,
      },
      concertPerformance,
    };
  },
};
