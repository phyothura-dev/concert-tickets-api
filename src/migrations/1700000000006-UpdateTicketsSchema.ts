import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTicketsSchema1700000000006 implements MigrationInterface {
  name = 'UpdateTicketsSchema1700000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN or RENAME COLUMN reliably across environments,
    // so we rebuild the tickets table to:
    // - remove internal_note
    // - rename priceCents -> price
    // - add type (VIP | NORMAL)
    await queryRunner.query(`
      CREATE TABLE tickets_new (
        id TEXT PRIMARY KEY NOT NULL,
        concertId TEXT NOT NULL,
        totalStock INTEGER NOT NULL,
        remainingStock INTEGER NOT NULL,
        price INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'NORMAL',
        version INTEGER NOT NULL DEFAULT 1,
        CONSTRAINT fk_tickets_concert
          FOREIGN KEY (concertId) REFERENCES concerts(id)
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      INSERT INTO tickets_new (id, concertId, totalStock, remainingStock, price, type, version)
      SELECT
        id,
        concertId,
        totalStock,
        remainingStock,
        priceCents AS price,
        'NORMAL' AS type,
        COALESCE(version, 1) AS version
      FROM tickets;
    `);

    await queryRunner.query(`DROP TABLE tickets;`);
    await queryRunner.query(`ALTER TABLE tickets_new RENAME TO tickets;`);

    // Recreate indexes (AddIndexes migration created idx_tickets_concertId; we recreate to be safe)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tickets_concertId ON tickets(concertId);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Rebuild back to the previous Day 3 shape:
    // - restore priceCents
    // - restore internal_note (nullable)
    // - remove type
    await queryRunner.query(`
      CREATE TABLE tickets_old (
        id TEXT PRIMARY KEY NOT NULL,
        concertId TEXT NOT NULL,
        totalStock INTEGER NOT NULL,
        remainingStock INTEGER NOT NULL,
        priceCents INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        internal_note TEXT,
        CONSTRAINT fk_tickets_concert
          FOREIGN KEY (concertId) REFERENCES concerts(id)
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      INSERT INTO tickets_old (id, concertId, totalStock, remainingStock, priceCents, version, internal_note)
      SELECT
        id,
        concertId,
        totalStock,
        remainingStock,
        price AS priceCents,
        COALESCE(version, 1) AS version,
        NULL AS internal_note
      FROM tickets;
    `);

    await queryRunner.query(`DROP TABLE tickets;`);
    await queryRunner.query(`ALTER TABLE tickets_old RENAME TO tickets;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tickets_concertId ON tickets(concertId);`);
  }
}

