import AppDataSource from '../data-source';
import { Category } from '../entities/Category';
import { Singer } from '../entities/Singer';
import { NotFoundError } from '../lib/errors';
import { withTransaction } from '../lib/transaction';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validations/category.validation';

export class CategoryService {
  async listCategories(): Promise<Category[]> {
    return AppDataSource.getRepository(Category).find({
      order: { name: 'ASC' },
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
    return repo.save(repo.create(input as Partial<Category>));
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const repo = AppDataSource.getRepository(Category);
    const category = await this.getCategory(id);
    repo.merge(category, input as never);
    return repo.save(category);
  }

  async deleteCategory(id: string): Promise<{ deleted: true }> {
    return withTransaction(async (queryRunner) => {
      const exists = await queryRunner.manager.exists(Category, { where: { id } });
      if (!exists) {
        throw new NotFoundError('Category not found', null, 'CATEGORY_NOT_FOUND');
      }

      await queryRunner.manager.update(Singer, { categoryId: id }, { categoryId: null });
      await queryRunner.manager.delete(Category, { id });

      return { deleted: true };
    });
  }
}

export const categoryService = new CategoryService();
