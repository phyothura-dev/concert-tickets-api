import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexes1700000000004 implements MigrationInterface {
  name = "AddIndexes1700000000004";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tickets_concertId ON tickets(concertId);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_reservations_concertId ON reservations(concertId);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_reservations_status_expiresAt ON reservations(status, expiresAt);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_reservations_pending_expiresAt ON reservations(expiresAt) WHERE status='PENDING';`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reservations_pending_expiresAt;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reservations_status_expiresAt;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reservations_concertId;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tickets_concertId;`);
  }
}

