import type { ConcertListItem } from '../services/concert.service';

export type ConcertDto = {
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

export function toConcertDto(item: ConcertListItem): ConcertDto {
  return {
    id: item.id,
    title: item.title,
    venue: item.venue,
    startsAt: item.startsAt,
    imageUrl: item.imageUrl ?? null,
    categoryIds: item.categoryIds,
    categories: item.categories,
    singerIds: item.singerIds ?? [],
    singers: item.singers ?? [],
    availableStock: item.availableStock ?? 0,
    totalStock: item.totalStock ?? 0,
  };
}

export function toConcertDtoList(items: ConcertListItem[]): ConcertDto[] {
  return items.map(toConcertDto);
}
