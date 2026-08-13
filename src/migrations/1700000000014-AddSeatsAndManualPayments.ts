import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeatsAndManualPayments1700000000014 implements MigrationInterface {
  name = 'AddSeatsAndManualPayments1700000000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    const oversized = await queryRunner.query(
      `SELECT id, totalStock FROM tickets WHERE totalStock > 500 LIMIT 1`,
    ) as Array<{ id: string; totalStock: number }>;
    if (oversized.length > 0) {
      throw new Error(`Ticket ${oversized[0]!.id} exceeds the 500-seat limit`);
    }

    const pending = await queryRunner.query(
      `SELECT COUNT(*) AS count FROM reservations WHERE status = 'PENDING'`,
    ) as Array<{ count: number | string }>;
    if (Number(pending[0]?.count ?? 0) > 0) {
      throw new Error('Expire all pending reservations before running the seat migration');
    }

    await queryRunner.query(`ALTER TABLE reservations ADD COLUMN ticketId TEXT REFERENCES tickets(id) ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE reservations ADD COLUMN unitPrice INTEGER`);
    await queryRunner.query(`ALTER TABLE reservations ADD COLUMN totalAmount INTEGER`);
    await queryRunner.query(`CREATE INDEX idx_reservations_ticketId ON reservations(ticketId)`);

    await queryRunner.query(`
      CREATE TABLE seats (
        id TEXT PRIMARY KEY NOT NULL,
        ticketId TEXT NOT NULL,
        label TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        currentReservationId TEXT,
        holdExpiresAt DATETIME,
        CONSTRAINT fk_seats_ticket FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE,
        CONSTRAINT fk_seats_reservation FOREIGN KEY (currentReservationId) REFERENCES reservations(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_seats_ticket_label ON seats(ticketId, label)`);
    await queryRunner.query(`CREATE INDEX idx_seats_ticket_status ON seats(ticketId, status)`);
    await queryRunner.query(`CREATE INDEX idx_seats_currentReservationId ON seats(currentReservationId)`);

    await queryRunner.query(`
      CREATE TABLE reservation_seats (
        id TEXT PRIMARY KEY NOT NULL,
        reservationId TEXT NOT NULL,
        seatId TEXT NOT NULL,
        labelSnapshot TEXT NOT NULL,
        CONSTRAINT fk_reservation_seats_reservation FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE,
        CONSTRAINT fk_reservation_seats_seat FOREIGN KEY (seatId) REFERENCES seats(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_reservation_seats_pair ON reservation_seats(reservationId, seatId)`);
    await queryRunner.query(`CREATE INDEX idx_reservation_seats_reservationId ON reservation_seats(reservationId)`);

    await queryRunner.query(`
      CREATE TABLE payment_submissions (
        id TEXT PRIMARY KEY NOT NULL,
        reservationId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        storageKey TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        sizeBytes INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        reviewerId TEXT,
        rejectionReason TEXT,
        submittedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        reviewedAt DATETIME,
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT fk_payment_reservation FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_payment_reviewer FOREIGN KEY (reviewerId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_payment_reservationId ON payment_submissions(reservationId)`);
    await queryRunner.query(`CREATE INDEX idx_payment_status_submittedAt ON payment_submissions(status, submittedAt)`);

    await queryRunner.query(`
      WITH RECURSIVE numbers(n) AS (
        SELECT 1
        UNION ALL
        SELECT n + 1 FROM numbers WHERE n < 500
      )
      INSERT INTO seats (id, ticketId, label, sequence, status)
      SELECT
        lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-a' || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
        tickets.id,
        tickets.type || '-' || printf('%03d', numbers.n),
        numbers.n,
        CASE WHEN numbers.n <= tickets.totalStock - tickets.remainingStock THEN 'SOLD' ELSE 'AVAILABLE' END
      FROM tickets
      JOIN numbers ON numbers.n <= tickets.totalStock
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_status_submittedAt`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_reservationId`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_submissions`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reservation_seats_reservationId`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reservation_seats_pair`);
    await queryRunner.query(`DROP TABLE IF EXISTS reservation_seats`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_seats_currentReservationId`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_seats_ticket_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_seats_ticket_label`);
    await queryRunner.query(`DROP TABLE IF EXISTS seats`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reservations_ticketId`);
    await queryRunner.query(`ALTER TABLE reservations DROP COLUMN totalAmount`);
    await queryRunner.query(`ALTER TABLE reservations DROP COLUMN unitPrice`);
    await queryRunner.query(`ALTER TABLE reservations DROP COLUMN ticketId`);
  }
}
