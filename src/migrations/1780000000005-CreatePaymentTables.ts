import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTables1780000000005 implements MigrationInterface {
  name = 'CreatePaymentTables1780000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE payment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reservationId" UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        "paymentMethod" TEXT NOT NULL DEFAULT 'KBZPAY',
        "storageKey" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        "reviewerId" UUID,
        "rejectionReason" TEXT,
        "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reviewedAt" TIMESTAMPTZ,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payment_reservation
          FOREIGN KEY ("reservationId") REFERENCES reservations(id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_payment_reviewer
          FOREIGN KEY ("reviewerId") REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_payment_reservationId" ON payment_submissions("reservationId");`);
    await queryRunner.query(`CREATE INDEX "idx_payment_status_submittedAt" ON payment_submissions(status, "submittedAt");`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE payment_submissions;`);
  }
}
