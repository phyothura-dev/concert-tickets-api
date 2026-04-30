import AppDataSource from '../data-source';
import { Concert } from '../entities/Concert';
import { Ticket } from '../entities/Ticket';

export type ConcertListItem = {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  availableStock: number;
  totalStock: number;
};

export class ConcertService {
  async listConcerts(): Promise<ConcertListItem[]> {
    const rows = await AppDataSource.getRepository(Concert)
      .createQueryBuilder('c')
      .leftJoin(Ticket, 't', 't.concertId = c.id')
      .select('c.id', 'id')
      .addSelect('c.title', 'title')
      .addSelect('c.venue', 'venue')
      .addSelect('c.startsAt', 'startsAt')
      .addSelect('COALESCE(SUM(t.remainingStock), 0)', 'availableStock')
      .addSelect('COALESCE(SUM(t.totalStock), 0)', 'totalStock')
      .groupBy('c.id')
      .addGroupBy('c.title')
      .addGroupBy('c.venue')
      .addGroupBy('c.startsAt')
      .orderBy('c.startsAt', 'ASC')
      .getRawMany<{
        id: string;
        title: string;
        venue: string;
        startsAt: string;
        availableStock: string;
        totalStock: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      venue: r.venue,
      startsAt: new Date(r.startsAt).toISOString(),
      availableStock: Number(r.availableStock),
      totalStock: Number(r.totalStock),
    }));
  }

}
