import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSingerCategoryRelationship1700000000012 implements MigrationInterface {
  name = 'AddSingerCategoryRelationship1700000000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE singers
      ADD COLUMN categoryId TEXT REFERENCES categories(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_singers_categoryId ON singers(categoryId);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_singers_categoryId;`);
    await queryRunner.query(`ALTER TABLE singers DROP COLUMN categoryId;`);
  }
}
