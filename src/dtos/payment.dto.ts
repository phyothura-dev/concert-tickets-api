import type { PaymentSubmission } from '../entities/PaymentSubmission';
import { toReservationDto } from './reservation.dto';

export function toPaymentDto(payment: PaymentSubmission) {
  return {
    id: payment.id,
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    mimeType: payment.mimeType,
    sizeBytes: payment.sizeBytes,
    rejectionReason: payment.rejectionReason,
    submittedAt: payment.submittedAt.toISOString(),
    reviewedAt: payment.reviewedAt?.toISOString() ?? null,
    reservation: toReservationDto(payment.reservation),
    user: payment.reservation.user ? {
      id: payment.reservation.user.id,
      email: payment.reservation.user.email,
      name: payment.reservation.user.name,
    } : null,
  };
}
