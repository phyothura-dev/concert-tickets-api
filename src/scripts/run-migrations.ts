import "reflect-metadata";
import { config } from "dotenv";
import AppDataSource from "../data-source";

config();

async function runMigrationsIfNeeded(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const hasPendingMigrations = await AppDataSource.showMigrations();

    if (!hasPendingMigrations) {
      console.info("No pending migrations. Skipping migration:run.");
      return;
    }

    await AppDataSource.runMigrations();
    console.info("Pending migrations executed successfully.");
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runMigrationsIfNeeded().catch((err: unknown) => {
  console.error("Migration guard failed", err);
  process.exitCode = 1;
});
