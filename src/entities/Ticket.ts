import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';
import { Concert } from './Concert';

export type TicketType = 'VIP' | 'NORMAL';

@Entity({ name: 'tickets' })
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text' })
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
}
