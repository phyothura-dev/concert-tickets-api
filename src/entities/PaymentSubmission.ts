import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Reservation } from './Reservation';
import { User } from './User';

export type PaymentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type PaymentMethod = 'KBZPAY' | 'WAVEPAY';

@Entity({ name: 'payment_submissions' })
@Index(['reservationId'], { unique: true })
@Index(['status', 'submittedAt'])
export class PaymentSubmission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  reservationId!: string;

  @OneToOne(() => Reservation, (reservation) => reservation.payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reservationId' })
  reservation!: Reservation;

  @Column({ type: 'text', default: 'PENDING_REVIEW' })
  status!: PaymentStatus;

  @Column({ type: 'text', default: 'KBZPAY' })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'text' })
  storageKey!: string;

  @Column({ type: 'text' })
  mimeType!: string;

  @Column({ type: 'integer' })
  sizeBytes!: number;

  @Column({ type: 'text' })
  sha256!: string;

  @Column({ type: 'uuid', nullable: true })
  reviewerId!: string | null;

  @ManyToOne(() => User, (user) => user.reviewedPayments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reviewerId' })
  reviewer!: User | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  submittedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
