import AppDataSource from '../data-source';
import { Category } from '../entities/Category';
import { Concert } from '../entities/Concert';
import { Reservation } from '../entities/Reservation';
import { Singer } from '../entities/Singer';
import { Ticket } from '../entities/Ticket';
import { NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';
import { withTransaction } from '../lib/transaction';
import type { CreateConcertInput, ListConcertsQuery, UpdateConcertInput } from '../validations/concert.validation';
import type { UploadedImage } from '../validations/image.validation';
import { In, type EntityManager } from 'typeorm';
import { ImageStorageService } from './image-storage.service';

export type ConcertListItem = {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  imageUrl: string | null;
  categoryIds: string[];
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
  singerIds: string[];
  singers: {
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
  availableStock: number;
  totalStock: number;
};

export class ConcertService {
  private readonly imageStorage = new ImageStorageService();

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
      .leftJoin(Ticket, 't', 't.concertId = c.id')
      .select('c.id', 'id')
      .addSelect('c.title', 'title')
      .addSelect('c.venue', 'venue')
      .addSelect('c.startsAt', 'startsAt')
      .addSelect('c.imageUrl', 'imageUrl')
      .addSelect('COALESCE(SUM(t.remainingStock), 0)', 'availableStock')
      .addSelect('COALESCE(SUM(t.totalStock), 0)', 'totalStock')
      .groupBy('c.id')
      .addGroupBy('c.title')
      .addGroupBy('c.venue')
      .addGroupBy('c.startsAt')
      .addGroupBy('c.imageUrl')
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
      query.andWhere(
        `EXISTS (
          SELECT 1
          FROM concert_categories cc_filter
          WHERE cc_filter.concertId = c.id
            AND cc_filter.categoryId = :categoryId
        )`,
        { categoryId: filters.categoryId },
      );
    }

    const rows = await query.getRawMany<{
      id: string;
      title: string;
      venue: string;
      startsAt: string;
      imageUrl: string | null;
      availableStock: string;
      totalStock: string;
    }>();

    const concertIds = rows.map((row) => row.id);
    const [categoriesByConcertId, singersByConcertId] = await Promise.all([
      this.getCategoriesByConcertId(concertIds),
      this.getSingersByConcertId(concertIds),
    ]);

    return rows.map((r) => {
      const categories = categoriesByConcertId.get(r.id) ?? [];
      const singers = singersByConcertId.get(r.id) ?? [];
      return {
        id: r.id,
        title: r.title,
        venue: r.venue,
        startsAt: new Date(r.startsAt).toISOString(),
        imageUrl: r.imageUrl,
        categoryIds: categories.map((category) => category.id),
        categories,
        singerIds: singers.map((singer) => singer.id),
        singers,
        availableStock: Number(r.availableStock),
        totalStock: Number(r.totalStock),
      };
    });
  }

  private async getCategoriesByConcertId(concertIds: string[]): Promise<Map<string, ConcertListItem['categories']>> {
    if (concertIds.length === 0) {
      return new Map();
    }

    const rows = await AppDataSource.getRepository(Category)
      .createQueryBuilder('cat')
      .innerJoin('concert_categories', 'cc', 'cc.categoryId = cat.id')
      .select('cc.concertId', 'concertId')
      .addSelect('cat.id', 'id')
      .addSelect('cat.name', 'name')
      .addSelect('cat.slug', 'slug')
      .where('cc.concertId IN (:...concertIds)', { concertIds })
      .orderBy('cat.name', 'ASC')
      .getRawMany<{ concertId: string; id: string; name: string; slug: string }>();

    const categoriesByConcertId = new Map<string, ConcertListItem['categories']>();
    for (const row of rows) {
      const categories = categoriesByConcertId.get(row.concertId) ?? [];
      categories.push({ id: row.id, name: row.name, slug: row.slug });
      categoriesByConcertId.set(row.concertId, categories);
    }

    return categoriesByConcertId;
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

  private uniqueIds(ids: string[]): string[] {
    return [...new Set(ids)];
  }

  private async ensureCategoriesExistOrThrow(categoryIds: string[], manager: EntityManager): Promise<string[]> {
    const uniqueIds = this.uniqueIds(categoryIds);
    if (uniqueIds.length === 0) {
      return [];
    }

    const categories = await manager.findBy(Category, { id: In(uniqueIds) });
    if (categories.length !== uniqueIds.length) {
      throw new NotFoundError('One or more categories were not found', { categoryIds: uniqueIds }, 'CATEGORY_NOT_FOUND');
    }

    return uniqueIds;
  }

  private async ensureSingersExistOrThrow(singerIds: string[], manager: EntityManager): Promise<string[]> {
    const uniqueIds = this.uniqueIds(singerIds);
    if (uniqueIds.length === 0) {
      return [];
    }

    const singers = await manager.findBy(Singer, { id: In(uniqueIds) });
    if (singers.length !== uniqueIds.length) {
      throw new NotFoundError('One or more singers were not found', { singerIds: uniqueIds }, 'SINGER_NOT_FOUND');
    }

    return uniqueIds;
  }

  private async replaceConcertCategories(manager: EntityManager, concertId: string, categoryIds: string[]): Promise<void> {
    await manager
      .createQueryBuilder()
      .delete()
      .from('concert_categories')
      .where('concertId = :concertId', { concertId })
      .execute();

    if (categoryIds.length > 0) {
      await manager
        .createQueryBuilder()
        .insert()
        .into('concert_categories')
        .values(categoryIds.map((categoryId) => ({ concertId, categoryId })))
        .execute();
    }
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

  private async removeImageSafely(imageUrl: string): Promise<void> {
    try {
      await this.imageStorage.removePublic(imageUrl);
    } catch (error) {
      logger.warn({ err: error, imageUrl }, 'Failed to remove an unused concert image');
    }
  }

  async createConcert(input: CreateConcertInput, image?: UploadedImage): Promise<ConcertListItem> {
    const uploadedImageUrl = image ? await this.imageStorage.savePublic(image, 'concert-images') : undefined;
    let concertId: string;
    try {
      concertId = await withTransaction(async (queryRunner) => {
        const categoryIds = await this.ensureCategoriesExistOrThrow(input.categoryIds ?? [], queryRunner.manager);
        const singerIds = await this.ensureSingersExistOrThrow(input.singerIds ?? [], queryRunner.manager);

        const entity = queryRunner.manager.create(Concert, {
          title: input.title.trim(),
          venue: input.venue.trim(),
          startsAt: input.startsAt,
          imageUrl: uploadedImageUrl ?? null,
        });
        const saved = await queryRunner.manager.save(entity);
        await this.replaceConcertCategories(queryRunner.manager, saved.id, categoryIds);
        await this.replaceConcertSingers(queryRunner.manager, saved.id, singerIds);
        return saved.id;
      });
    } catch (error) {
      if (uploadedImageUrl) await this.removeImageSafely(uploadedImageUrl);
      throw error;
    }

    return this.getConcertListItemOrThrow(concertId);
  }

  async getConcert(id: string): Promise<ConcertListItem> {
    return this.getConcertListItemOrThrow(id);
  }

  async updateConcert(id: string, input: UpdateConcertInput, image?: UploadedImage): Promise<ConcertListItem> {
    const uploadedImageUrl = image ? await this.imageStorage.savePublic(image, 'concert-images') : undefined;
    let previousImageUrl: string | null = null;
    try {
      await withTransaction(async (queryRunner) => {
        const concert = await queryRunner.manager.findOneBy(Concert, { id });

        if (!concert) {
          throw new NotFoundError('Concert not found', null, 'CONCERT_NOT_FOUND');
        }
        previousImageUrl = concert.imageUrl;

        if (input.title !== undefined) {
          concert.title = input.title.trim();
        }
        if (input.venue !== undefined) {
          concert.venue = input.venue.trim();
        }
        if (input.startsAt !== undefined) {
          concert.startsAt = input.startsAt;
        }
        if (input.categoryIds !== undefined) {
          const categoryIds = await this.ensureCategoriesExistOrThrow(input.categoryIds, queryRunner.manager);
          await this.replaceConcertCategories(queryRunner.manager, id, categoryIds);
        }
        if (input.singerIds !== undefined) {
          const singerIds = await this.ensureSingersExistOrThrow(input.singerIds, queryRunner.manager);
          await this.replaceConcertSingers(queryRunner.manager, id, singerIds);
        }
        if (uploadedImageUrl) {
          concert.imageUrl = uploadedImageUrl;
        }

        await queryRunner.manager.save(concert);
      });
    } catch (error) {
      if (uploadedImageUrl) await this.removeImageSafely(uploadedImageUrl);
      throw error;
    }

    if (uploadedImageUrl && previousImageUrl && previousImageUrl !== uploadedImageUrl) {
      await this.removeImageSafely(previousImageUrl);
    }

    return this.getConcertListItemOrThrow(id);
  }

  async deleteConcert(id: string): Promise<{ deleted: true }> {
    let imageUrl: string | null = null;
    const result = await withTransaction(async (queryRunner) => {
      const concert = await queryRunner.manager.findOneBy(Concert, { id });
      if (!concert) {
        throw new NotFoundError('Concert not found', null, 'CONCERT_NOT_FOUND');
      }
      imageUrl = concert.imageUrl;

      await queryRunner.manager.delete(Reservation, { concertId: id });
      await queryRunner.manager.delete(Ticket, { concertId: id });
      await queryRunner.manager.delete(Concert, { id });

      return { deleted: true as const };
    });

    if (imageUrl) await this.removeImageSafely(imageUrl);
    return result;
  }
}
