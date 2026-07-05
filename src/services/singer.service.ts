import AppDataSource from '../data-source';
import { Singer } from '../entities/Singer';
import { NotFoundError } from '../lib/errors';
import type { CreateSingerInput, UpdateSingerInput } from '../validations/singer.validation';

export class SingerService {
  async listSingers(): Promise<Singer[]> {
    return AppDataSource.getRepository(Singer).find({
      order: { name: 'ASC' },
    });
  }

  async getSinger(id: string): Promise<Singer> {
    const singer = await AppDataSource.getRepository(Singer).findOne({ where: { id } });
    if (!singer) {
      throw new NotFoundError('Singer not found', null, 'SINGER_NOT_FOUND');
    }
    return singer;
  }

  async createSinger(input: CreateSingerInput): Promise<Singer> {
    const repo = AppDataSource.getRepository(Singer);
    const singer = repo.create({
      name: input.name.trim(),
      title: input.title.trim(),
    });

    return repo.save(singer);
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

    return repo.save(singer);
  }

  async deleteSinger(id: string): Promise<{ deleted: true }> {
    const result = await AppDataSource.getRepository(Singer).delete({ id });
    if (!result.affected) {
      throw new NotFoundError('Singer not found', null, 'SINGER_NOT_FOUND');
    }

    return { deleted: true };
  }
}
