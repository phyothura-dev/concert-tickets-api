import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTables1780000000001 implements MigrationInterface {
  name = 'CreateUserTables1780000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "googleSub" TEXT,
        email TEXT NOT NULL,
        "passwordHash" TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        name TEXT,
        "pictureUrl" TEXT,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        "lastLoginAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_users_googleSub" ON users("googleSub") WHERE "googleSub" IS NOT NULL;`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_users_email ON users(email);`);

    await queryRunner.query(`
      CREATE TABLE notification_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "fcmToken" TEXT NOT NULL,
        platform TEXT,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        "lastSeenAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notification_devices_user
          FOREIGN KEY ("userId") REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_notification_devices_userId" ON notification_devices("userId");`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_notification_devices_fcmToken" ON notification_devices("fcmToken");`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE notification_devices;`);
    await queryRunner.query(`DROP TABLE users;`);
  }
}
