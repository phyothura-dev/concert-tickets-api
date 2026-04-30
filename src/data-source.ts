import "reflect-metadata";
import { join } from "node:path";
import { DataSource } from "typeorm";

const sqliteDatabasePath =
  process.env["SQLITE_PATH"] ?? join(process.cwd(), "data", "ticket-reservation.sqlite");

const runningCompiled = __filename.endsWith(".js");

const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: sqliteDatabasePath,
  synchronize: false,
  logging: process.env["NODE_ENV"] !== "production",
  entities: [join(__dirname, "entities", runningCompiled ? "*.js" : "*.ts")],
  migrations: [
    join(__dirname, "migrations", runningCompiled ? "*.js" : "*.ts"),
  ],
});

export default AppDataSource;
