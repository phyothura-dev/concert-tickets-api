import { type QueryRunner } from 'typeorm';
import AppDataSource from '../data-source';
import { logger } from './logger';

export async function withTransaction<T>(fn: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await fn(queryRunner);
    await queryRunner.commitTransaction();
    return result;
  } catch (err) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    throw err;
  } finally {
    await queryRunner.release();
  }
}

export async function withImmediateTransaction<T>(fn: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  let beganTransaction = false;
  try {
    await queryRunner.query('BEGIN IMMEDIATE TRANSACTION;');
    beganTransaction = true;

    const result = await fn(queryRunner);

    await queryRunner.query('COMMIT;');
    beganTransaction = false;
    return result;
  } catch (err) {
    if (beganTransaction) {
      try {
        await queryRunner.query('ROLLBACK;');
      } catch (rollbackErr) {
        logger.error({ err: rollbackErr }, 'transaction rollback failed');
      }
    }
    throw err;
  } finally {
    await queryRunner.release();
  }
}
