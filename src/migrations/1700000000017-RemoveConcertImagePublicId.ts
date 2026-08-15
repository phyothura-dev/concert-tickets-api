import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveConcertImagePublicId1700000000017 implements MigrationInterface {
  name = 'RemoveConcertImagePublicId1700000000017';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE concerts DROP COLUMN imagePublicId');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE concerts ADD COLUMN imagePublicId TEXT');
  }
}
