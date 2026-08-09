import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './Category';
import { Concert } from './Concert';

@Entity({ name: 'singers' })
export class Singer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  title!: string;

  @Index()
  @Column({ type: 'text', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, (category) => category.singers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category!: Category | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @ManyToMany(() => Concert, (concert) => concert.singers)
  concerts!: Concert[];
}
