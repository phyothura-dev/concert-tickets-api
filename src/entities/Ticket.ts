import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';
import { Concert } from './Concert';
import { Reservation } from './Reservation';
import { Seat } from './Seat';

export type TicketType = 'VIP' | 'NORMAL';

@Entity({ name: 'tickets' })
@Index(['concertId', 'type'], { unique: true })
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  concertId!: string;

  @ManyToOne(() => Concert, (c) => c.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concertId' })
  concert!: Concert;

  @Column({ type: 'integer' })
  totalStock!: number;

  @Column({ type: 'integer' })
  remainingStock!: number;

  @Column({ type: 'integer' })
  price!: number;

  @Column({ type: 'text' })
  type!: TicketType;

  @VersionColumn({ type: 'integer', default: 1 })
  version!: number;

  @OneToMany(() => Seat, (seat) => seat.ticket)
  seats!: Seat[];

  @OneToMany(() => Reservation, (reservation) => reservation.ticket)
  reservations!: Reservation[];
}
