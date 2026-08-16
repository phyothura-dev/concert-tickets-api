import AppDataSource from '../data-source';
import { User } from '../entities/User';
import { ConflictError, InternalError, NotFoundError } from '../lib/errors';
import { hashPassword } from '../lib/password';
import type { CreateUserInput, UpdateUserInput } from '../validations/user.validation';
import { env } from '../config/env';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const ADMIN_CREATED_USER_DEFAULT_PASSWORD = 'ChangeMe123!';

function getAdminCreatedUserDefaultPassword(): string {
  const configuredPassword = env.adminCreatedUserDefaultPassword;
  if (configuredPassword === undefined) {
    return ADMIN_CREATED_USER_DEFAULT_PASSWORD;
  }
  if (configuredPassword.length < 8) {
    throw new InternalError(
      'Admin-created user default password must be at least 8 characters',
      null,
      'ADMIN_DEFAULT_PASSWORD_INVALID',
    );
  }
  return configuredPassword;
}

export class UserService {
  async listUsers(): Promise<User[]> {
    return AppDataSource.getRepository(User).find({
      order: { createdAt: 'DESC' },
    });
  }

  async getUser(id: string): Promise<User> {
    const user = await AppDataSource.getRepository(User).findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found', null, 'USER_NOT_FOUND');
    }
    return user;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const repo = AppDataSource.getRepository(User);
    const email = normalizeEmail(input.email);
    const existing = await repo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }

    const user = repo.create({
      ...input,
      email,
      googleSub: null,
      passwordHash: await hashPassword(getAdminCreatedUserDefaultPassword()),
      pictureUrl: null,
      emailVerified: false,
      lastLoginAt: new Date(),
    } as Partial<User>);
    return repo.save(user);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const repo = AppDataSource.getRepository(User);
    const user = await this.getUser(id);

    const { email, ...scalarInput } = input;

    if (email !== undefined) {
      const normalized = normalizeEmail(email);
      const existing = await repo.findOne({ where: { email: normalized } });
      if (existing && existing.id !== id) {
        throw new ConflictError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
      }
      user.email = normalized;
    }

    repo.merge(user, scalarInput as never);
    return repo.save(user);
  }
}

export const userService = new UserService();
