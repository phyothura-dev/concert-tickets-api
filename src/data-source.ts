import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { env } from './config/env';

const connection = env.database.url
  ? { url: env.database.url }
  : {
      host: env.database.host,
      port: env.database.port,
      username: env.database.user,
      password: env.database.password,
      database: env.database.name,
    };

const runningCompiled = __filename.endsWith('.js');

const AppDataSource = new DataSource({
  type: 'postgres',
  ...connection,
  ssl: env.database.ssl ? { rejectUnauthorized: env.database.sslRejectUnauthorized } : false,
  synchronize: false,
  logging: !env.isProduction,
  entities: [join(__dirname, 'entities', runningCompiled ? '*.js' : '*.ts')],
  migrations: [join(__dirname, 'migrations', runningCompiled ? '*.js' : '*.ts')],
});

export default AppDataSource;
