import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConcertImages1700000000016 implements MigrationInterface {
  name = 'AddConcertImages1700000000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE concerts ADD COLUMN imageUrl TEXT');
    await queryRunner.query('ALTER TABLE concerts ADD COLUMN imagePublicId TEXT');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE concerts DROP COLUMN imagePublicId');
    await queryRunner.query('ALTER TABLE concerts DROP COLUMN imageUrl');
  }
}
