import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketVersionAndInternalNote1700000000005 implements MigrationInterface {
  name = 'AddTicketVersionAndInternalNote1700000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tickets ADD COLUMN version INTEGER NOT NULL DEFAULT 1;`);
    await queryRunner.query(`ALTER TABLE tickets ADD COLUMN internal_note TEXT;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tickets_tmp (
        id TEXT PRIMARY KEY NOT NULL,
        concertId TEXT NOT NULL,
        totalStock INTEGER NOT NULL,
        remainingStock INTEGER NOT NULL,
        priceCents INTEGER NOT NULL,
        CONSTRAINT fk_tickets_concert
          FOREIGN KEY (concertId) REFERENCES concerts(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      INSERT INTO tickets_tmp (id, concertId, totalStock, remainingStock, priceCents)
      SELECT id, concertId, totalStock, remainingStock, priceCents FROM tickets;
    `);
    await queryRunner.query(`DROP TABLE tickets;`);
    await queryRunner.query(`ALTER TABLE tickets_tmp RENAME TO tickets;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tickets_concertId ON tickets(concertId);`);
  }
}
