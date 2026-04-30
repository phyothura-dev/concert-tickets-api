import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReservationsTable1700000000003 implements MigrationInterface {
  name = "CreateReservationsTable1700000000003";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY NOT NULL,
        concertId TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT fk_reservations_concert
          FOREIGN KEY (concertId) REFERENCES concerts(id)
          ON DELETE CASCADE
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS reservations;`);
  }
}

