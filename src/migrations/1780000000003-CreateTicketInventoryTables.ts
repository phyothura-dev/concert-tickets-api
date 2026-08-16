import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketInventoryTables1780000000003 implements MigrationInterface {
  name = 'CreateTicketInventoryTables1780000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "concertId" UUID NOT NULL,
        "totalStock" INTEGER NOT NULL,
        "remainingStock" INTEGER NOT NULL,
        price INTEGER NOT NULL,
        type TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        CONSTRAINT fk_tickets_concert
          FOREIGN KEY ("concertId") REFERENCES concerts(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_tickets_concertId" ON tickets("concertId");`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_tickets_concertId_type" ON tickets("concertId", type);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE tickets;`);
  }
}
