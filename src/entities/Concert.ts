import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Category } from "./Category";
import { Singer } from "./Singer";
import { Ticket } from "./Ticket";

@Entity({ name: "concerts" })
export class Concert {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  venue!: string;

  @Column({ type: "datetime" })
  startsAt!: Date;

  @Column({ type: 'text', nullable: true })
  imageUrl!: string | null;

  @ManyToMany(() => Category, (category) => category.concerts)
  @JoinTable({
    name: 'concert_categories',
    joinColumn: { name: 'concertId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories!: Category[];

  @OneToMany(() => Ticket, (t) => t.concert)
  tickets!: Ticket[];

  @ManyToMany(() => Singer, (singer) => singer.concerts)
  @JoinTable({
    name: 'concert_singers',
    joinColumn: { name: 'concertId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'singerId', referencedColumnName: 'id' },
  })
  singers!: Singer[];
}

