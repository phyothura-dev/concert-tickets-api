import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateConcertsTable1700000000001 implements MigrationInterface {
  name = "CreateConcertsTable1700000000001";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS concerts (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        venue TEXT NOT NULL,
        startsAt DATETIME NOT NULL
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS concerts;`);
  }
}

