import type { ConcertListItem } from '../services/concert.service';

export type ConcertDto = {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  availableStock: number;
  totalStock: number;
};

export function toConcertDto(item: ConcertListItem): ConcertDto {
  return {
    id: item.id,
    title: item.title,
    venue: item.venue,
    startsAt: item.startsAt,
    availableStock: item.availableStock ?? 0,
    totalStock: item.totalStock ?? 0,
  };
}

export function toConcertDtoList(items: ConcertListItem[]): ConcertDto[] {
  return items.map(toConcertDto);
}
