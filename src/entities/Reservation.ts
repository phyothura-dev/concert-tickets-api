import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Concert } from "./Concert";

export type ReservationStatus = "PENDING" | "PURCHASED" | "EXPIRED";

@Entity({ name: "reservations" })
@Index(["concertId"])
@Index(["status", "expiresAt"])
export class Reservation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  concertId!: string;

  @ManyToOne(() => Concert, { onDelete: "CASCADE" })
  @JoinColumn({ name: "concertId" })
  concert!: Concert;

  @Column({ type: "integer" })
  quantity!: number;

  @Column({ type: "text" })
  status!: ReservationStatus;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;
}

