import AppDataSource from '../data-source';
import { Category } from '../entities/Category';
import { Singer } from '../entities/Singer';
import { NotFoundError } from '../lib/errors';
import { withTransaction } from '../lib/transaction';
import { getOrSetCache, deleteCache, deleteCachePattern } from '../lib/cache';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validations/category.validation';

const CATEGORIES_CACHE_KEY = 'cache:categories:all';
const CATEGORIES_CACHE_TTL = 3600; // 1 hour

export class CategoryService {
  async listCategories(): Promise<Category[]> {
    return getOrSetCache(CATEGORIES_CACHE_KEY, CATEGORIES_CACHE_TTL, async () => {
      return AppDataSource.getRepository(Category).find({
        order: { name: 'ASC' },
      });
    });
  }

  async getCategory(id: string): Promise<Category> {
    const category = await AppDataSource.getRepository(Category).findOne({ where: { id } });
    if (!category) {
      throw new NotFoundError('Category not found', null, 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const repo = AppDataSource.getRepository(Category);
    const saved = await repo.save(repo.create(input as Partial<Category>));
    await this.invalidateCache();
    return saved;
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const repo = AppDataSource.getRepository(Category);
    const category = await this.getCategory(id);
    repo.merge(category, input as never);
    const saved = await repo.save(category);
    await this.invalidateCache();
    return saved;
  }

  async deleteCategory(id: string): Promise<{ deleted: true }> {
    return withTransaction(async (queryRunner) => {
      const exists = await queryRunner.manager.exists(Category, { where: { id } });
      if (!exists) {
        throw new NotFoundError('Category not found', null, 'CATEGORY_NOT_FOUND');
      }

      await queryRunner.manager.update(Singer, { categoryId: id }, { categoryId: null });
      await queryRunner.manager.delete(Category, { id });

      await this.invalidateCache();
      return { deleted: true };
    });
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([
      deleteCache(CATEGORIES_CACHE_KEY),
      deleteCachePattern('cache:concerts:*'),
    ]);
  }
}

export const categoryService = new CategoryService();
