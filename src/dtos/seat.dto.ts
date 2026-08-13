import type { Seat } from '../entities/Seat';

export type SeatDto = {
  id: string;
  ticketId: string;
  label: string;
  sequence: number;
  status: 'AVAILABLE' | 'HELD' | 'SOLD';
};

export function toSeatDto(seat: Seat): SeatDto {
  return { id: seat.id, ticketId: seat.ticketId, label: seat.label, sequence: seat.sequence, status: seat.status };
}

export function toSeatDtoList(seats: Seat[]): SeatDto[] {
  return seats.map(toSeatDto);
}
