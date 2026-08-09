import type { Singer } from '../entities/Singer';
import { toCategoryDto, type CategoryDto } from './category.dto';

export type SingerDto = {
  id: string;
  name: string;
  title: string;
  categoryId: string | null;
  category: CategoryDto | null;
  createdAt: string;
  updatedAt: string;
};

export function toSingerDto(singer: Singer): SingerDto {
  return {
    id: singer.id,
    name: singer.name,
    title: singer.title,
    categoryId: singer.categoryId,
    category: singer.category ? toCategoryDto(singer.category) : null,
    createdAt: singer.createdAt.toISOString(),
    updatedAt: singer.updatedAt.toISOString(),
  };
}

export function toSingerDtoList(singers: Singer[]): SingerDto[] {
  return singers.map(toSingerDto);
}
