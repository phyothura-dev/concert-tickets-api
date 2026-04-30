import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Concert } from './Concert';

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
  priceCents!: number;
}
