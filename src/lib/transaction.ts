import { type QueryRunner } from 'typeorm';
import AppDataSource from '../data-source';
import { logger } from './logger';

function setTransactionActive(queryRunner: QueryRunner, active: boolean): void {
  (queryRunner as unknown as { isTransactionActive: boolean }).isTransactionActive = active;
}

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
    setTransactionActive(queryRunner, false);
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
    setTransactionActive(queryRunner, true);

    const result = await fn(queryRunner);

    await queryRunner.query('COMMIT;');
    beganTransaction = false;
    setTransactionActive(queryRunner, false);
    return result;
  } catch (err) {
    if (beganTransaction) {
      try {
        await queryRunner.query('ROLLBACK;');
        setTransactionActive(queryRunner, false);
      } catch (rollbackErr) {
        logger.error({ err: rollbackErr }, 'transaction rollback failed');
      }
    }
    throw err;
  } finally {
    setTransactionActive(queryRunner, false);
    await queryRunner.release();
  }
}
