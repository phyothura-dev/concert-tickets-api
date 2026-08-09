import type { Reservation } from '../entities/Reservation';

export type ReservationHistoryDto = {
  id: string;
  quantity: number;
  status: 'PENDING' | 'PURCHASED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  concert: {
    id: string;
    title: string;
    venue: string;
    startsAt: string;
  };
};

export function toReservationHistoryDto(
  reservation: Reservation,
): ReservationHistoryDto {
  return {
    id: reservation.id,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    concert: {
      id: reservation.concert.id,
      title: reservation.concert.title,
      venue: reservation.concert.venue,
      startsAt: reservation.concert.startsAt.toISOString(),
    },
  };
}

export function toReservationHistoryDtoList(
  reservations: Reservation[],
): ReservationHistoryDto[] {
  return reservations.map(toReservationHistoryDto);
}
