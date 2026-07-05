import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Category } from "./Category";
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

  @Index()
  @Column({ type: "text", nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, (category) => category.concerts, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "categoryId" })
  category!: Category | null;

  @OneToMany(() => Ticket, (t) => t.concert)
  tickets!: Ticket[];
}

