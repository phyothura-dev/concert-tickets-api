import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConcertManagementTables1780000000002 implements MigrationInterface {
  name = 'CreateConcertManagementTables1780000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_categories_name ON categories(name);`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_categories_slug ON categories(slug);`);

    await queryRunner.query(`
      CREATE TABLE concerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        venue TEXT NOT NULL,
        "startsAt" TIMESTAMPTZ NOT NULL,
        "imageUrl" TEXT
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_concerts_title ON concerts(title);`);
    await queryRunner.query(`CREATE INDEX "idx_concerts_startsAt" ON concerts("startsAt");`);

    await queryRunner.query(`
      CREATE TABLE singers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        "categoryId" UUID,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_singers_category
          FOREIGN KEY ("categoryId") REFERENCES categories(id)
          ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_singers_name ON singers(name);`);
    await queryRunner.query(`CREATE INDEX "idx_singers_categoryId" ON singers("categoryId");`);

    await queryRunner.query(`
      CREATE TABLE concert_categories (
        "concertId" UUID NOT NULL,
        "categoryId" UUID NOT NULL,
        PRIMARY KEY ("concertId", "categoryId"),
        CONSTRAINT fk_concert_categories_concert
          FOREIGN KEY ("concertId") REFERENCES concerts(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_concert_categories_category
          FOREIGN KEY ("categoryId") REFERENCES categories(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_concert_categories_concertId" ON concert_categories("concertId");`);
    await queryRunner.query(`CREATE INDEX "idx_concert_categories_categoryId" ON concert_categories("categoryId");`);

    await queryRunner.query(`
      CREATE TABLE concert_singers (
        "concertId" UUID NOT NULL,
        "singerId" UUID NOT NULL,
        PRIMARY KEY ("concertId", "singerId"),
        CONSTRAINT fk_concert_singers_concert
          FOREIGN KEY ("concertId") REFERENCES concerts(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_concert_singers_singer
          FOREIGN KEY ("singerId") REFERENCES singers(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_concert_singers_concertId" ON concert_singers("concertId");`);
    await queryRunner.query(`CREATE INDEX "idx_concert_singers_singerId" ON concert_singers("singerId");`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE concert_singers;`);
    await queryRunner.query(`DROP TABLE concert_categories;`);
    await queryRunner.query(`DROP TABLE singers;`);
    await queryRunner.query(`DROP TABLE concerts;`);
    await queryRunner.query(`DROP TABLE categories;`);
  }
}
