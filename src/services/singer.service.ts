import AppDataSource from '../data-source';
import { Singer } from '../entities/Singer';
import { NotFoundError } from '../lib/errors';
import { getOrSetCache, deleteCache, deleteCachePattern } from '../lib/cache';
import type { CreateSingerInput, UpdateSingerInput } from '../validations/singer.validation';

const SINGERS_CACHE_KEY = 'cache:singers:all';
const SINGERS_CACHE_TTL = 3600; // 1 hour

export class SingerService {
  async listSingers(): Promise<Singer[]> {
    return getOrSetCache(SINGERS_CACHE_KEY, SINGERS_CACHE_TTL, async () => {
      return AppDataSource.getRepository(Singer).find({
        relations: { category: true },
        order: { name: 'ASC' },
      });
    });
  }

  async getSinger(id: string): Promise<Singer> {
    const singer = await AppDataSource.getRepository(Singer).findOne({
      where: { id },
      relations: { category: true },
    });
    if (!singer) {
      throw new NotFoundError('Singer not found', null, 'SINGER_NOT_FOUND');
    }
    return singer;
  }

  async createSinger(input: CreateSingerInput): Promise<Singer> {
    const repo = AppDataSource.getRepository(Singer);
    const singer = repo.create(input as Partial<Singer>);
    const saved = await repo.save(singer);
    await this.invalidateCache();
    return this.getSinger(saved.id);
  }

  async updateSinger(id: string, input: UpdateSingerInput): Promise<Singer> {
    const repo = AppDataSource.getRepository(Singer);
    const singer = await this.getSinger(id);
    repo.merge(singer, input as never);
    const saved = await repo.save(singer);
    await this.invalidateCache();
    return this.getSinger(saved.id);
  }

  async deleteSinger(id: string): Promise<{ deleted: true }> {
    const result = await AppDataSource.getRepository(Singer).delete({ id });
    if (!result.affected) {
      throw new NotFoundError('Singer not found', null, 'SINGER_NOT_FOUND');
    }
    await this.invalidateCache();
    return { deleted: true };
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([
      deleteCache(SINGERS_CACHE_KEY),
      deleteCachePattern('cache:concerts:*'),
    ]);
  }
}

export const singerService = new SingerService();
