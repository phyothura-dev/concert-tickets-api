import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTables1780000000001 implements MigrationInterface {
  name = 'CreateUserTables1780000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY NOT NULL,
        googleSub TEXT,
        email TEXT NOT NULL,
        passwordHash TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        name TEXT,
        pictureUrl TEXT,
        emailVerified BOOLEAN NOT NULL DEFAULT 0,
        lastLoginAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now'))
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_users_googleSub ON users(googleSub) WHERE googleSub IS NOT NULL;`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_users_email ON users(email);`);

    await queryRunner.query(`
      CREATE TABLE notification_devices (
        id TEXT PRIMARY KEY NOT NULL,
        userId TEXT NOT NULL,
        fcmToken TEXT NOT NULL,
        platform TEXT,
        enabled BOOLEAN NOT NULL DEFAULT 1,
        lastSeenAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT fk_notification_devices_user
          FOREIGN KEY (userId) REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_notification_devices_userId ON notification_devices(userId);`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_notification_devices_fcmToken ON notification_devices(fcmToken);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE notification_devices;`);
    await queryRunner.query(`DROP TABLE users;`);
  }
}
