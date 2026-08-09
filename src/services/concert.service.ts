import AppDataSource from '../data-source';
import { Category } from '../entities/Category';
import { Concert } from '../entities/Concert';
import { Reservation } from '../entities/Reservation';
import { Singer } from '../entities/Singer';
import { Ticket } from '../entities/Ticket';
import { NotFoundError } from '../lib/errors';
import { withTransaction } from '../lib/transaction';
import type { CreateConcertInput, ListConcertsQuery, UpdateConcertInput } from '../validations/concert.validation';
import { In, type EntityManager } from 'typeorm';

export type ConcertListItem = {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  singerIds?: string[];
  singers?: {
    id: string;
    name: string;
    title: string;
    categoryId: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  }[];
  availableStock?: number;
  totalStock?: number;
};

export class ConcertService {
  private async getConcertListItemOrThrow(id: string): Promise<ConcertListItem> {
    const item = (await this.listConcerts()).find((concert) => concert.id === id);
    if (!item) {
      throw new NotFoundError('Concert not found', null, 'CONCERT_NOT_FOUND');
    }
    return item;
  }

  async listConcerts(filters: ListConcertsQuery = {}): Promise<ConcertListItem[]> {
    const query = AppDataSource.getRepository(Concert)
      .createQueryBuilder('c')
      .leftJoin(Category, 'cat', 'cat.id = c.categoryId')
      .leftJoin(Ticket, 't', 't.concertId = c.id')
      .select('c.id', 'id')
      .addSelect('c.title', 'title')
      .addSelect('c.venue', 'venue')
      .addSelect('c.startsAt', 'startsAt')
      .addSelect('c.categoryId', 'categoryId')
      .addSelect('cat.name', 'categoryName')
      .addSelect('cat.slug', 'categorySlug')
      .addSelect('COALESCE(SUM(t.remainingStock), 0)', 'availableStock')
      .addSelect('COALESCE(SUM(t.totalStock), 0)', 'totalStock')
      .groupBy('c.id')
      .addGroupBy('c.title')
      .addGroupBy('c.venue')
      .addGroupBy('c.startsAt')
      .addGroupBy('c.categoryId')
      .addGroupBy('cat.name')
      .addGroupBy('cat.slug')
      .orderBy('c.startsAt', 'ASC');

    if (filters.search) {
      query.andWhere(
        `(
          LOWER(c.title) LIKE :search
          OR LOWER(c.venue) LIKE :search
          OR EXISTS (
            SELECT 1
            FROM concert_singers cs_filter
            INNER JOIN singers s_filter ON s_filter.id = cs_filter.singerId
            WHERE cs_filter.concertId = c.id
              AND LOWER(s_filter.name) LIKE :search
          )
        )`,
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }
    if (filters.venue) {
      query.andWhere('LOWER(c.venue) = :venue', {
        venue: filters.venue.toLowerCase(),
      });
    }
    if (filters.categoryId) {
      query.andWhere('c.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    const rows = await query.getRawMany<{
        id: string;
        title: string;
        venue: string;
        startsAt: string;
        categoryId: string | null;
        categoryName: string | null;
        categorySlug: string | null;
        availableStock: string;
        totalStock: string;
      }>();

    const singersByConcertId = await this.getSingersByConcertId(rows.map((row) => row.id));

    return rows.map((r) => {
      const singers = singersByConcertId.get(r.id) ?? [];
      return {
      id: r.id,
      title: r.title,
      venue: r.venue,
      startsAt: new Date(r.startsAt).toISOString(),
      categoryId: r.categoryId,
      category:
        r.categoryId && r.categoryName && r.categorySlug
          ? { id: r.categoryId, name: r.categoryName, slug: r.categorySlug }
          : null,
      singerIds: singers.map((singer) => singer.id),
      singers,
      availableStock: Number(r.availableStock),
      totalStock: Number(r.totalStock),
      };
    });
  }

  private async getSingersByConcertId(concertIds: string[]): Promise<Map<string, NonNullable<ConcertListItem['singers']>>> {
    if (concertIds.length === 0) {
      return new Map();
    }

    const rows = await AppDataSource.getRepository(Singer)
      .createQueryBuilder('s')
      .innerJoin('concert_singers', 'cs', 'cs.singerId = s.id')
      .leftJoin(Category, 'cat', 'cat.id = s.categoryId')
      .select('cs.concertId', 'concertId')
      .addSelect('s.id', 'id')
      .addSelect('s.name', 'name')
      .addSelect('s.title', 'title')
      .addSelect('s.categoryId', 'categoryId')
      .addSelect('cat.name', 'categoryName')
      .addSelect('cat.slug', 'categorySlug')
      .addSelect('s.createdAt', 'createdAt')
      .addSelect('s.updatedAt', 'updatedAt')
      .where('cs.concertId IN (:...concertIds)', { concertIds })
      .orderBy('s.name', 'ASC')
      .getRawMany<{
        concertId: string;
        id: string;
        name: string;
        title: string;
        categoryId: string | null;
        categoryName: string | null;
        categorySlug: string | null;
        createdAt: string;
        updatedAt: string;
      }>();

    const singersByConcertId = new Map<string, NonNullable<ConcertListItem['singers']>>();
    for (const row of rows) {
      const singers = singersByConcertId.get(row.concertId) ?? [];
      singers.push({
        id: row.id,
        name: row.name,
        title: row.title,
        categoryId: row.categoryId,
        category:
          row.categoryId && row.categoryName && row.categorySlug
            ? {
                id: row.categoryId,
                name: row.categoryName,
                slug: row.categorySlug,
              }
            : null,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      });
      singersByConcertId.set(row.concertId, singers);
    }

    return singersByConcertId;
  }

  private async ensureCategoryExistsOrThrow(categoryId: string, manager = AppDataSource.manager): Promise<void> {
    const exists = await manager.exists(Category, { where: { id: categoryId } });
    if (!exists) {
      throw new NotFoundError('Category not found', null, 'CATEGORY_NOT_FOUND');
    }
  }

  private uniqueSingerIds(singerIds: string[]): string[] {
    return [...new Set(singerIds)];
  }

  private async ensureSingersExistOrThrow(singerIds: string[], manager: EntityManager): Promise<string[]> {
    const uniqueIds = this.uniqueSingerIds(singerIds);
    if (uniqueIds.length === 0) {
      return [];
    }

    const singers = await manager.findBy(Singer, { id: In(uniqueIds) });
    if (singers.length !== uniqueIds.length) {
      throw new NotFoundError('One or more singers were not found', { singerIds: uniqueIds }, 'SINGER_NOT_FOUND');
    }

    return uniqueIds;
  }

  private async replaceConcertSingers(manager: EntityManager, concertId: string, singerIds: string[]): Promise<void> {
    await manager
      .createQueryBuilder()
      .delete()
      .from('concert_singers')
      .where('concertId = :concertId', { concertId })
      .execute();

    if (singerIds.length === 0) {
      return;
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into('concert_singers')
      .values(singerIds.map((singerId) => ({ concertId, singerId })))
      .execute();
  }

  async createConcert(input: CreateConcertInput): Promise<ConcertListItem> {
    const concertId = await withTransaction(async (queryRunner) => {
      if (input.categoryId) {
        await this.ensureCategoryExistsOrThrow(input.categoryId, queryRunner.manager);
      }
      const singerIds = await this.ensureSingersExistOrThrow(input.singerIds ?? [], queryRunner.manager);

      const entity = queryRunner.manager.create(Concert, {
        title: input.title.trim(),
        venue: input.venue.trim(),
        startsAt: input.startsAt,
        categoryId: input.categoryId ?? null,
      });
      const saved = await queryRunner.manager.save(entity);
      await this.replaceConcertSingers(queryRunner.manager, saved.id, singerIds);

      return saved.id;
    });

    return this.getConcertListItemOrThrow(concertId);
  }

  async getConcert(id: string): Promise<ConcertListItem> {
    return this.getConcertListItemOrThrow(id);
  }

  async updateConcert(id: string, input: UpdateConcertInput): Promise<ConcertListItem> {
    await withTransaction(async (queryRunner) => {
      const concert = await queryRunner.manager.findOne(Concert, { where: { id } });

      if (!concert) {
        throw new NotFoundError('Concert not found', null, 'CONCERT_NOT_FOUND');
      }

      if (input.title !== undefined) {
        concert.title = input.title.trim();
      }
      if (input.venue !== undefined) {
        concert.venue = input.venue.trim();
      }
      if (input.startsAt !== undefined) {
        concert.startsAt = input.startsAt;
      }
      if (input.categoryId !== undefined) {
        if (input.categoryId) {
          await this.ensureCategoryExistsOrThrow(input.categoryId, queryRunner.manager);
        }
        concert.categoryId = input.categoryId;
      }
      if (input.singerIds !== undefined) {
        const singerIds = await this.ensureSingersExistOrThrow(input.singerIds, queryRunner.manager);
        await this.replaceConcertSingers(queryRunner.manager, id, singerIds);
      }

      await queryRunner.manager.save(concert);
    });

    return this.getConcertListItemOrThrow(id);
  }

  async deleteConcert(id: string): Promise<{ deleted: true }> {
    return withTransaction(async (queryRunner) => {
      const exists = await queryRunner.manager.exists(Concert, { where: { id } });
      if (!exists) {
        throw new NotFoundError('Concert not found', null, 'CONCERT_NOT_FOUND');
      }

      await queryRunner.manager.delete(Reservation, { concertId: id });
      await queryRunner.manager.delete(Ticket, { concertId: id });
      await queryRunner.manager.delete(Concert, { id });

      return { deleted: true };
    });
  }
}
