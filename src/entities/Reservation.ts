import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Concert } from "./Concert";
import { User } from "./User";
import { PaymentSubmission } from './PaymentSubmission';
import { ReservationSeat } from './ReservationSeat';
import { Seat } from './Seat';
import { Ticket } from './Ticket';

export type ReservationStatus = 'PENDING' | 'UNDER_REVIEW' | 'PURCHASED' | 'REJECTED' | 'EXPIRED';

@Entity({ name: "reservations" })
@Index(["concertId"])
@Index(["status", "expiresAt"])
export class Reservation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  concertId!: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  userId!: string | null;

  @ManyToOne(() => Concert, { onDelete: "CASCADE" })
  @JoinColumn({ name: "concertId" })
  concert!: Concert;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  ticketId!: string | null;

  @ManyToOne(() => Ticket, (ticket) => ticket.reservations, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'ticketId' })
  ticket!: Ticket | null;

  @ManyToOne(() => User, (user) => user.reservations, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user!: User | null;

  @Column({ type: "integer" })
  quantity!: number;

  @Column({ type: 'integer', nullable: true })
  unitPrice!: number | null;

  @Column({ type: 'integer', nullable: true })
  totalAmount!: number | null;

  @Column({ type: "text" })
  status!: ReservationStatus;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => ReservationSeat, (assignment) => assignment.reservation)
  seatAssignments!: ReservationSeat[];

  @OneToMany(() => Seat, (seat) => seat.currentReservation)
  currentSeats!: Seat[];

  @OneToOne(() => PaymentSubmission, (payment) => payment.reservation)
  payment!: PaymentSubmission | null;
}

