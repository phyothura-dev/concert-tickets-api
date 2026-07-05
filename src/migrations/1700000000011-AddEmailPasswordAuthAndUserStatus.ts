import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailPasswordAuthAndUserStatus1700000000011 implements MigrationInterface {
  name = 'AddEmailPasswordAuthAndUserStatus1700000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_googleSub"`);
    await queryRunner.query(`PRAGMA foreign_keys = OFF;`);
    await queryRunner.query(`
      CREATE TABLE "users_new" (
        "id" varchar PRIMARY KEY NOT NULL,
        "googleSub" text,
        "email" text NOT NULL,
        "name" text,
        "pictureUrl" text,
        "emailVerified" boolean NOT NULL DEFAULT (0),
        "lastLoginAt" datetime NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "role" text NOT NULL DEFAULT ('USER'),
        "passwordHash" text,
        "status" text NOT NULL DEFAULT ('ACTIVE')
      )
    `);
    await queryRunner.query(`
      INSERT INTO "users_new" ("id", "googleSub", "email", "name", "pictureUrl", "emailVerified", "lastLoginAt", "createdAt", "updatedAt", "role", "passwordHash", "status")
      SELECT "id", "googleSub", lower("email"), "name", "pictureUrl", "emailVerified", "lastLoginAt", "createdAt", "updatedAt", "role", NULL, 'ACTIVE'
      FROM "users"
    `);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`ALTER TABLE "users_new" RENAME TO "users"`);
    await queryRunner.query(`PRAGMA foreign_keys = ON;`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_googleSub" ON "users" ("googleSub") WHERE "googleSub" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_googleSub"`);
    await queryRunner.query(`PRAGMA foreign_keys = OFF;`);
    await queryRunner.query(`
      CREATE TABLE "users_old" (
        "id" varchar PRIMARY KEY NOT NULL,
        "googleSub" text NOT NULL,
        "email" text NOT NULL,
        "name" text,
        "pictureUrl" text,
        "emailVerified" boolean NOT NULL DEFAULT (0),
        "lastLoginAt" datetime NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "role" text NOT NULL DEFAULT ('USER')
      )
    `);
    await queryRunner.query(`
      INSERT INTO "users_old" ("id", "googleSub", "email", "name", "pictureUrl", "emailVerified", "lastLoginAt", "createdAt", "updatedAt", "role")
      SELECT "id", COALESCE("googleSub", 'email:' || "id"), "email", "name", "pictureUrl", "emailVerified", "lastLoginAt", "createdAt", "updatedAt", "role"
      FROM "users"
    `);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`ALTER TABLE "users_old" RENAME TO "users"`);
    await queryRunner.query(`PRAGMA foreign_keys = ON;`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_googleSub" ON "users" ("googleSub")`);
  }
}
