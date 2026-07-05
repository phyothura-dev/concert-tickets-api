import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConcertCategories1700000000009 implements MigrationInterface {
  name = 'AddConcertCategories1700000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);`);

    await queryRunner.query(`
      INSERT OR IGNORE INTO categories (id, name, slug) VALUES
        ('11111111-1111-4111-8111-111111111111', 'Pop', 'pop'),
        ('22222222-2222-4222-8222-222222222222', 'Hip-Hop', 'hip-hop'),
        ('33333333-3333-4333-8333-333333333333', 'Jazz', 'jazz'),
        ('44444444-4444-4444-8444-444444444444', 'Rock', 'rock'),
        ('55555555-5555-4555-8555-555555555555', 'EDM', 'edm'),
        ('66666666-6666-4666-8666-666666666666', 'R&B', 'r-b'),
        ('77777777-7777-4777-8777-777777777777', 'Country', 'country'),
        ('88888888-8888-4888-8888-888888888888', 'Classical', 'classical');
    `);

    await queryRunner.query(`PRAGMA foreign_keys = OFF;`);
    await queryRunner.query(`
      CREATE TABLE concerts_new (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        venue TEXT NOT NULL,
        startsAt DATETIME NOT NULL,
        categoryId TEXT,
        CONSTRAINT fk_concerts_category
          FOREIGN KEY (categoryId) REFERENCES categories(id)
          ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      INSERT INTO concerts_new (id, title, venue, startsAt, categoryId)
      SELECT id, title, venue, startsAt, NULL FROM concerts;
    `);
    await queryRunner.query(`DROP TABLE concerts;`);
    await queryRunner.query(`ALTER TABLE concerts_new RENAME TO concerts;`);
    await queryRunner.query(`PRAGMA foreign_keys = ON;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_concerts_categoryId ON concerts(categoryId);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_concerts_categoryId;`);

    await queryRunner.query(`PRAGMA foreign_keys = OFF;`);
    await queryRunner.query(`
      CREATE TABLE concerts_old (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        venue TEXT NOT NULL,
        startsAt DATETIME NOT NULL
      );
    `);
    await queryRunner.query(`
      INSERT INTO concerts_old (id, title, venue, startsAt)
      SELECT id, title, venue, startsAt FROM concerts;
    `);
    await queryRunner.query(`DROP TABLE concerts;`);
    await queryRunner.query(`ALTER TABLE concerts_old RENAME TO concerts;`);
    await queryRunner.query(`PRAGMA foreign_keys = ON;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_slug;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_name;`);
    await queryRunner.query(`DROP TABLE IF EXISTS categories;`);
  }
}
