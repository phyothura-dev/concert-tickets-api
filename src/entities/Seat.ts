import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reservation } from './Reservation';
import { ReservationSeat } from './ReservationSeat';
import { Ticket } from './Ticket';

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD';

@Entity({ name: 'seats' })
@Index(['ticketId', 'label'], { unique: true })
@Index(['ticketId', 'status'])
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: Ticket;

  @Column({ type: 'text' })
  label!: string;

  @Column({ type: 'integer' })
  sequence!: number;

  @Column({ type: 'text', default: 'AVAILABLE' })
  status!: SeatStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  currentReservationId!: string | null;

  @ManyToOne(() => Reservation, (reservation) => reservation.currentSeats, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'currentReservationId' })
  currentReservation!: Reservation | null;

  @Column({ type: 'timestamptz', nullable: true })
  holdExpiresAt!: Date | null;

  @OneToMany(() => ReservationSeat, (assignment) => assignment.seat)
  assignments!: ReservationSeat[];
}
