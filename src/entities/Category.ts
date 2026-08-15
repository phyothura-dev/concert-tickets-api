import { Column, Entity, Index, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Concert } from './Concert';
import { Singer } from './Singer';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  slug!: string;

  @ManyToMany(() => Concert, (concert) => concert.categories)
  concerts!: Concert[];

  @OneToMany(() => Singer, (singer) => singer.category)
  singers!: Singer[];
}
