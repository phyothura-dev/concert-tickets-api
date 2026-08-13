import AppDataSource from '../data-source';
import { PaymentSubmission, type PaymentMethod, type PaymentStatus } from '../entities/PaymentSubmission';
import { Reservation } from '../entities/Reservation';
import { Seat } from '../entities/Seat';
import { ConflictError, ForbiddenError, NotFoundError } from '../lib/errors';
import { withImmediateTransaction } from '../lib/transaction';
import type { PaymentScreenshot } from '../middleware/payment-upload.middleware';
import type { PaymentListQuery, ReviewPaymentInput } from '../validations/payment.validation';
import { PaymentStorageService } from './payment-storage.service';
import { ReservationService } from './reservation.service';

const REVIEW_HOLD_MS = 24 * 60 * 60 * 1000;
const paymentRelations = {
  reservation: {
    concert: true,
    ticket: true,
    user: true,
    seatAssignments: { seat: true },
    payment: true,
  },
} as const;

export class PaymentService {
  private readonly storage = new PaymentStorageService();

  getConfig() {
    return {
      currency: 'MMK' as const,
      methods: [
        {
          id: 'KBZPAY' as const,
          name: 'KBZPay',
        },
        {
          id: 'WAVEPAY' as const,
          name: 'WavePay',
        },
      ],
    };
  }

  private async getPayment(id: string): Promise<PaymentSubmission> {
    const payment = await AppDataSource.getRepository(PaymentSubmission).findOne({
      where: { id }, relations: paymentRelations,
    });
    if (!payment) throw new NotFoundError('Payment submission not found', null, 'PAYMENT_NOT_FOUND');
    return payment;
  }

  async list(query: PaymentListQuery): Promise<{ items: PaymentSubmission[]; total: number; page: number; limit: number }> {
    const where = query.status ? { status: query.status as PaymentStatus } : {};
    const [items, total] = await AppDataSource.getRepository(PaymentSubmission).findAndCount({
      where, relations: paymentRelations, order: { submittedAt: 'DESC' },
      skip: (query.page - 1) * query.limit, take: query.limit,
    });
    return { items, total, page: query.page, limit: query.limit };
  }

  async submit(
    reservationId: string,
    userId: string,
    paymentMethod: PaymentMethod,
    file: PaymentScreenshot,
  ): Promise<PaymentSubmission> {
    const stored = await this.storage.save(file);
    try {
      const paymentId = await withImmediateTransaction(async (queryRunner) => {
        const reservation = await queryRunner.manager.findOne(Reservation, {
          where: { id: reservationId },
        });
        if (!reservation) throw new NotFoundError('Reservation not found', null, 'RESERVATION_NOT_FOUND');
        if (reservation.userId !== userId) throw new ForbiddenError('Reservation access denied', null, 'RESERVATION_ACCESS_DENIED');
        const alreadySubmitted = await queryRunner.manager.exists(PaymentSubmission, { where: { reservationId } });
        if (alreadySubmitted) throw new ConflictError('PAYMENT_ALREADY_SUBMITTED', 'A payment was already submitted');
        if (reservation.status !== 'PENDING') throw new ConflictError('RESERVATION_NOT_PENDING', 'Reservation is not awaiting payment');
        if (reservation.expiresAt.getTime() <= Date.now()) {
          await ReservationService.releaseSeats(queryRunner.manager, reservation, 'EXPIRED');
          return { expired: true, id: '' };
        }
        const payment = await queryRunner.manager.save(PaymentSubmission, queryRunner.manager.create(PaymentSubmission, {
          reservationId: reservation.id,
          status: 'PENDING_REVIEW',
          paymentMethod,
          storageKey: stored.storageKey,
          mimeType: file.mimeType,
          sizeBytes: file.bytes.length,
          sha256: stored.sha256,
          reviewerId: null,
          rejectionReason: null,
          reviewedAt: null,
        }));
        const expiresAt = new Date(Date.now() + REVIEW_HOLD_MS);
        reservation.status = 'UNDER_REVIEW';
        reservation.expiresAt = expiresAt;
        await queryRunner.manager.save(Reservation, reservation);
        await queryRunner.manager.update(Seat, { currentReservationId: reservation.id, status: 'HELD' }, { holdExpiresAt: expiresAt });
        return { expired: false, id: payment.id };
      });
      if (paymentId.expired) {
        await this.storage.remove(stored.storageKey);
        throw new ConflictError('RESERVATION_EXPIRED', 'Reservation expired');
      }
      return this.getPayment(paymentId.id);
    } catch (error) {
      await this.storage.remove(stored.storageKey);
      throw error;
    }
  }

  async review(id: string, reviewerId: string, input: ReviewPaymentInput): Promise<PaymentSubmission> {
    const outcome = await withImmediateTransaction(async (queryRunner) => {
      const payment = await queryRunner.manager.findOne(PaymentSubmission, {
        where: { id }, relations: { reservation: true },
      });
      if (!payment) throw new NotFoundError('Payment submission not found', null, 'PAYMENT_NOT_FOUND');
      if (payment.status !== 'PENDING_REVIEW' || payment.reservation.status !== 'UNDER_REVIEW') {
        throw new ConflictError('PAYMENT_ALREADY_REVIEWED', 'Payment is no longer awaiting review');
      }
      if (payment.reservation.expiresAt.getTime() <= Date.now()) {
        await ReservationService.releaseSeats(queryRunner.manager, payment.reservation, 'EXPIRED');
        payment.status = 'EXPIRED';
        await queryRunner.manager.save(PaymentSubmission, payment);
        return 'EXPIRED' as const;
      }

      const now = new Date();
      payment.reviewerId = reviewerId;
      payment.reviewedAt = now;
      if (input.decision === 'APPROVE') {
        const sold = await queryRunner.manager.createQueryBuilder().update(Seat).set({
          status: 'SOLD', holdExpiresAt: null,
        }).where('currentReservationId = :id AND status = :status', {
          id: payment.reservationId, status: 'HELD',
        }).execute();
        if (sold.affected !== payment.reservation.quantity) {
          throw new ConflictError('SEAT_HOLD_INVALID', 'Reserved seats are no longer held');
        }
        payment.status = 'APPROVED';
        payment.rejectionReason = null;
        payment.reservation.status = 'PURCHASED';
        await queryRunner.manager.save(Reservation, payment.reservation);
      } else {
        payment.status = 'REJECTED';
        payment.rejectionReason = input.reason;
        await ReservationService.releaseSeats(queryRunner.manager, payment.reservation, 'REJECTED');
      }
      await queryRunner.manager.save(PaymentSubmission, payment);
      return 'DONE' as const;
    });
    if (outcome === 'EXPIRED') throw new ConflictError('RESERVATION_EXPIRED', 'Reservation expired');
    return this.getPayment(id);
  }

  async readProof(id: string, userId: string, role: 'USER' | 'ADMIN'): Promise<{ bytes: Buffer; mimeType: string }> {
    const payment = await this.getPayment(id);
    if (role !== 'ADMIN' && payment.reservation.userId !== userId) {
      throw new ForbiddenError('Payment proof access denied', null, 'PAYMENT_ACCESS_DENIED');
    }
    return { bytes: await this.storage.read(payment.storageKey), mimeType: payment.mimeType };
  }
}
