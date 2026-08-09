import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketConcertTypeUniqueness1700000000013 implements MigrationInterface {
  name = 'AddTicketConcertTypeUniqueness1700000000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_concertId_type
      ON tickets(concertId, type);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tickets_concertId_type;`);
  }
}
