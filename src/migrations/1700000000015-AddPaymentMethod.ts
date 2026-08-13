import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethod1700000000015 implements MigrationInterface {
  name = 'AddPaymentMethod1700000000015';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE payment_submissions ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'KBZPAY'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payment_submissions DROP COLUMN paymentMethod`);
  }
}
