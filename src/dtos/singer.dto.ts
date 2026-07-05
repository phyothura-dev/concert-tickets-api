import type { Singer } from '../entities/Singer';

export type SingerDto = {
  id: string;
  name: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export function toSingerDto(singer: Singer): SingerDto {
  return {
    id: singer.id,
    name: singer.name,
    title: singer.title,
    createdAt: singer.createdAt.toISOString(),
    updatedAt: singer.updatedAt.toISOString(),
  };
}

export function toSingerDtoList(singers: Singer[]): SingerDto[] {
  return singers.map(toSingerDto);
}
