import type { Reservation } from '../entities/Reservation';

export function toReservationDto(reservation: Reservation) {
  return {
    id: reservation.id,
    quantity: reservation.quantity,
    status: reservation.status,
    unitPrice: reservation.unitPrice,
    totalAmount: reservation.totalAmount,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    concert: {
      id: reservation.concert.id,
      title: reservation.concert.title,
      venue: reservation.concert.venue,
      startsAt: reservation.concert.startsAt.toISOString(),
    },
    ticket: reservation.ticket ? {
      id: reservation.ticket.id,
      type: reservation.ticket.type,
      price: reservation.ticket.price,
    } : null,
    seats: reservation.seatAssignments?.map((assignment) => ({
      id: assignment.seatId,
      label: assignment.labelSnapshot,
    })) ?? [],
    payment: reservation.payment ? {
      id: reservation.payment.id,
      status: reservation.payment.status,
      paymentMethod: reservation.payment.paymentMethod,
      rejectionReason: reservation.payment.rejectionReason,
      submittedAt: reservation.payment.submittedAt.toISOString(),
      reviewedAt: reservation.payment.reviewedAt?.toISOString() ?? null,
    } : null,
  };
}

export function toReservationDtoList(reservations: Reservation[]) {
  return reservations.map(toReservationDto);
}
