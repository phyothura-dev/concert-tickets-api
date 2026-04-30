import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
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

  @OneToMany(() => Ticket, (t) => t.concert)
  tickets!: Ticket[];
}

