import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Reservation } from './Reservation';
import { Seat } from './Seat';

@Entity({ name: 'reservation_seats' })
@Index(['reservationId', 'seatId'], { unique: true })
export class ReservationSeat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text' })
  reservationId!: string;

  @ManyToOne(() => Reservation, (reservation) => reservation.seatAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservationId' })
  reservation!: Reservation;

  @Column({ type: 'text' })
  seatId!: string;

  @ManyToOne(() => Seat, (seat) => seat.assignments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seatId' })
  seat!: Seat;

  @Column({ type: 'text' })
  labelSnapshot!: string;
}
