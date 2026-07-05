import AppDataSource from '../data-source';
import { Category } from '../entities/Category';
import { Concert } from '../entities/Concert';
import { Reservation } from '../entities/Reservation';
import { Ticket } from '../entities/Ticket';
import { NotFoundError } from '../lib/errors';
import { withTransaction } from '../lib/transaction';
import type { CreateConcertInput, UpdateConcertInput } from '../validations/concert.validation';

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

  async listConcerts(): Promise<ConcertListItem[]> {
    const rows = await AppDataSource.getRepository(Concert)
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
      .orderBy('c.startsAt', 'ASC')
      .getRawMany<{
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

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      venue: r.venue,
      startsAt: new Date(r.startsAt).toISOString(),
      categoryId: r.categoryId,
      category:
        r.categoryId && r.categoryName && r.categorySlug
          ? { id: r.categoryId, name: r.categoryName, slug: r.categorySlug }
          : null,
      availableStock: Number(r.availableStock),
      totalStock: Number(r.totalStock),
    }));
  }

  private async ensureCategoryExistsOrThrow(categoryId: string): Promise<void> {
    const exists = await AppDataSource.getRepository(Category).exists({ where: { id: categoryId } });
    if (!exists) {
      throw new NotFoundError('Category not found', null, 'CATEGORY_NOT_FOUND');
    }
  }

  async createConcert(input: CreateConcertInput): Promise<ConcertListItem> {
    const repo = AppDataSource.getRepository(Concert);
    if (input.categoryId) {
      await this.ensureCategoryExistsOrThrow(input.categoryId);
    }

    const entity = repo.create({
      title: input.title.trim(),
      venue: input.venue.trim(),
      startsAt: input.startsAt,
      categoryId: input.categoryId ?? null,
    });
    const saved = await repo.save(entity);
    return this.getConcertListItemOrThrow(saved.id);
  }

  async getConcert(id: string): Promise<ConcertListItem> {
    return this.getConcertListItemOrThrow(id);
  }

  async updateConcert(id: string, input: UpdateConcertInput): Promise<ConcertListItem> {
    const repo = AppDataSource.getRepository(Concert);
    const concert = await repo.findOne({ where: { id } });

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
        await this.ensureCategoryExistsOrThrow(input.categoryId);
      }
      concert.categoryId = input.categoryId;
    }

    await repo.save(concert);
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
