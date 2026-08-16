import { type QueryRunner } from 'typeorm';
import AppDataSource from '../data-source';

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
