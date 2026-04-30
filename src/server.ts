import "reflect-metadata";
import { config } from "dotenv";
import { createApp } from "./app";
import AppDataSource from "./data-source";

config();

const port = Number.parseInt(process.env["PORT"] ?? "3000", 10);

if (Number.isNaN(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env["PORT"] ?? ""}`);
}

async function bootstrap(): Promise<void> {

  await AppDataSource.initialize();
  const app = createApp();

  app.listen(port, () => {
    console.log(`HTTP server listening on port ${port}`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error("Failed to start server", err);
  process.exitCode = 1;
});
