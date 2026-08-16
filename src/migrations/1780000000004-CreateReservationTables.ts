import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReservationTables1780000000004 implements MigrationInterface {
  name = 'CreateReservationTables1780000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "concertId" UUID NOT NULL,
        "userId" UUID,
        "ticketId" UUID,
        quantity INTEGER NOT NULL,
        "unitPrice" INTEGER,
        "totalAmount" INTEGER,
        status TEXT NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_reservations_concert
          FOREIGN KEY ("concertId") REFERENCES concerts(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_reservations_user
          FOREIGN KEY ("userId") REFERENCES users(id)
          ON DELETE SET NULL,
        CONSTRAINT fk_reservations_ticket
          FOREIGN KEY ("ticketId") REFERENCES tickets(id)
          ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_reservations_concertId" ON reservations("concertId");`);
    await queryRunner.query(`CREATE INDEX "idx_reservations_userId" ON reservations("userId");`);
    await queryRunner.query(`CREATE INDEX "idx_reservations_ticketId" ON reservations("ticketId");`);
    await queryRunner.query(`CREATE INDEX "idx_reservations_status_expiresAt" ON reservations(status, "expiresAt");`);
    await queryRunner.query(`CREATE INDEX "idx_reservations_pending_expiresAt" ON reservations("expiresAt") WHERE status = 'PENDING';`);

    await queryRunner.query(`
      CREATE TABLE seats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticketId" UUID NOT NULL,
        label TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        "currentReservationId" UUID,
        "holdExpiresAt" TIMESTAMPTZ,
        CONSTRAINT fk_seats_ticket
          FOREIGN KEY ("ticketId") REFERENCES tickets(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_seats_reservation
          FOREIGN KEY ("currentReservationId") REFERENCES reservations(id)
          ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_seats_ticket_label ON seats("ticketId", label);`);
    await queryRunner.query(`CREATE INDEX idx_seats_ticket_status ON seats("ticketId", status);`);
    await queryRunner.query(`CREATE INDEX "idx_seats_currentReservationId" ON seats("currentReservationId");`);

    await queryRunner.query(`
      CREATE TABLE reservation_seats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reservationId" UUID NOT NULL,
        "seatId" UUID NOT NULL,
        "labelSnapshot" TEXT NOT NULL,
        CONSTRAINT fk_reservation_seats_reservation
          FOREIGN KEY ("reservationId") REFERENCES reservations(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_reservation_seats_seat
          FOREIGN KEY ("seatId") REFERENCES seats(id)
          ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_reservation_seats_pair ON reservation_seats("reservationId", "seatId");`);
    await queryRunner.query(`CREATE INDEX "idx_reservation_seats_reservationId" ON reservation_seats("reservationId");`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE reservation_seats;`);
    await queryRunner.query(`DROP TABLE seats;`);
    await queryRunner.query(`DROP TABLE reservations;`);
  }
}
