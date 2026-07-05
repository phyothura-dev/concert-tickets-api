import AppDataSource from '../data-source';
import { Category } from '../entities/Category';
import { Concert } from '../entities/Concert';
import { ConflictError, NotFoundError } from '../lib/errors';
import { withTransaction } from '../lib/transaction';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validations/category.validation';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

  private async ensureSlugAvailable(slug: string, currentId?: string): Promise<void> {
    const existing = await AppDataSource.getRepository(Category).findOne({ where: { slug } });
    if (existing && existing.id !== currentId) {
      throw new ConflictError('CATEGORY_SLUG_EXISTS', 'Category slug already exists');
    }
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const repo = AppDataSource.getRepository(Category);
    const name = input.name.trim();
    const slug = input.slug?.trim() ?? slugify(name);

    if (!slug) {
      throw new ConflictError('CATEGORY_SLUG_INVALID', 'Category slug could not be generated');
    }

    await this.ensureSlugAvailable(slug);

    const category = repo.create({ name, slug });
    return repo.save(category);
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const repo = AppDataSource.getRepository(Category);
    const category = await this.getCategory(id);

    if (input.name !== undefined) {
      category.name = input.name.trim();
    }

    if (input.slug !== undefined) {
      category.slug = input.slug.trim();
    } else if (input.name !== undefined) {
      category.slug = slugify(category.name);
    }

    if (!category.slug) {
      throw new ConflictError('CATEGORY_SLUG_INVALID', 'Category slug could not be generated');
    }

    await this.ensureSlugAvailable(category.slug, id);
    return repo.save(category);
  }

  async deleteCategory(id: string): Promise<{ deleted: true }> {
    return withTransaction(async (queryRunner) => {
      const exists = await queryRunner.manager.exists(Category, { where: { id } });
      if (!exists) {
        throw new NotFoundError('Category not found', null, 'CATEGORY_NOT_FOUND');
      }

      await queryRunner.manager.update(Concert, { categoryId: id }, { categoryId: null });
      await queryRunner.manager.delete(Category, { id });

      return { deleted: true };
    });
  }
}
