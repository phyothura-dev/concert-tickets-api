import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketsTable1700000000002 implements MigrationInterface {
  name = 'CreateTicketsTable1700000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tickets (
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
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tickets;`);
  }
}
