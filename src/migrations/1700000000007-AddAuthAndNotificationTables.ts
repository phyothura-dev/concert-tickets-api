import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthAndNotificationTables1700000000007 implements MigrationInterface {
  name = 'AddAuthAndNotificationTables1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" varchar PRIMARY KEY NOT NULL,
        "googleSub" text NOT NULL,
        "email" text NOT NULL,
        "name" text,
        "pictureUrl" text,
        "emailVerified" boolean NOT NULL DEFAULT (0),
        "lastLoginAt" datetime NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_googleSub" ON "users" ("googleSub")`);

    await queryRunner.query(`
      CREATE TABLE "notification_devices" (
        "id" varchar PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "fcmToken" text NOT NULL,
        "platform" text,
        "enabled" boolean NOT NULL DEFAULT (1),
        "lastSeenAt" datetime NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_notification_devices_userId" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notification_devices_userId" ON "notification_devices" ("userId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_notification_devices_fcmToken" ON "notification_devices" ("fcmToken")`);

    await queryRunner.query(`ALTER TABLE "reservations" ADD COLUMN "userId" text`);
    await queryRunner.query(`CREATE INDEX "IDX_reservations_userId" ON "reservations" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_reservations_userId"`);
    await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "userId"`);
    await queryRunner.query(`DROP INDEX "IDX_notification_devices_fcmToken"`);
    await queryRunner.query(`DROP INDEX "IDX_notification_devices_userId"`);
    await queryRunner.query(`DROP TABLE "notification_devices"`);
    await queryRunner.query(`DROP INDEX "IDX_users_googleSub"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
