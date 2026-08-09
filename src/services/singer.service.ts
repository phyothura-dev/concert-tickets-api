import AppDataSource from '../data-source';
import { Category } from '../entities/Category';
import { Singer } from '../entities/Singer';
import { NotFoundError } from '../lib/errors';
import type { CreateSingerInput, UpdateSingerInput } from '../validations/singer.validation';

export class SingerService {
  async listSingers(): Promise<Singer[]> {
    return AppDataSource.getRepository(Singer).find({
      relations: { category: true },
      order: { name: 'ASC' },
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
    const category = await this.getCategory(input.categoryId);
    const singer = repo.create({
      name: input.name.trim(),
      title: input.title.trim(),
      categoryId: category.id,
      category,
    });

    const savedSinger = await repo.save(singer);
    return this.getSinger(savedSinger.id);
  }

  async updateSinger(id: string, input: UpdateSingerInput): Promise<Singer> {
    const repo = AppDataSource.getRepository(Singer);
    const singer = await this.getSinger(id);

    if (input.name !== undefined) {
      singer.name = input.name.trim();
    }
    if (input.title !== undefined) {
      singer.title = input.title.trim();
    }
    if (input.categoryId !== undefined) {
      const category = await this.getCategory(input.categoryId);
      singer.categoryId = category.id;
      singer.category = category;
    }

    const savedSinger = await repo.save(singer);
    return this.getSinger(savedSinger.id);
  }

  private async getCategory(id: string): Promise<Category> {
    const category = await AppDataSource.getRepository(Category).findOne({ where: { id } });
    if (!category) {
      throw new NotFoundError('Category not found', null, 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async deleteSinger(id: string): Promise<{ deleted: true }> {
    const result = await AppDataSource.getRepository(Singer).delete({ id });
    if (!result.affected) {
      throw new NotFoundError('Singer not found', null, 'SINGER_NOT_FOUND');
    }

    return { deleted: true };
  }
}
