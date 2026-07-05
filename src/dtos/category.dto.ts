import type { Category } from '../entities/Category';

export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
};

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}

export function toCategoryDtoList(categories: Category[]): CategoryDto[] {
  return categories.map(toCategoryDto);
}
