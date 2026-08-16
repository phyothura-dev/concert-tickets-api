import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { NotificationDevice } from './NotificationDevice';
import { Reservation } from './Reservation';
import { PaymentSubmission } from './PaymentSubmission';

@Entity({ name: 'users' })
@Index(['googleSub'], { unique: true })
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  googleSub!: string | null;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text', nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ type: 'text', default: 'USER' })
  role!: UserRole;

  @Column({ type: 'text', default: 'ACTIVE' })
  status!: UserStatus;

  @Column({ type: 'text', nullable: true })
  name!: string | null;

  @Column({ type: 'text', nullable: true })
  pictureUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'timestamptz' })
  lastLoginAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => NotificationDevice, (device) => device.user)
  notificationDevices!: NotificationDevice[];

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations!: Reservation[];

  @OneToMany(() => PaymentSubmission, (payment) => payment.reviewer)
  reviewedPayments!: PaymentSubmission[];
}

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'DISABLED';
