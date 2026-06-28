import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRole1700000000008 implements MigrationInterface {
  name = 'AddUserRole1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "role" text NOT NULL DEFAULT ('USER')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
