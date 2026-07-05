import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSingersAndConcertRelationship1700000000010 implements MigrationInterface {
  name = 'AddSingersAndConcertRelationship1700000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS singers (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now'))
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_singers_name ON singers(name);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS concert_singers (
        concertId TEXT NOT NULL,
        singerId TEXT NOT NULL,
        PRIMARY KEY (concertId, singerId),
        CONSTRAINT fk_concert_singers_concert
          FOREIGN KEY (concertId) REFERENCES concerts(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_concert_singers_singer
          FOREIGN KEY (singerId) REFERENCES singers(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_concert_singers_concertId ON concert_singers(concertId);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_concert_singers_singerId ON concert_singers(singerId);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_concert_singers_singerId;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_concert_singers_concertId;`);
    await queryRunner.query(`DROP TABLE IF EXISTS concert_singers;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_singers_name;`);
    await queryRunner.query(`DROP TABLE IF EXISTS singers;`);
  }
}
