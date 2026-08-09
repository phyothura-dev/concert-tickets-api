import AppDataSource from '../data-source';
import { User } from '../entities/User';
import { ConflictError, InternalError, NotFoundError } from '../lib/errors';
import { hashPassword } from '../lib/password';
import type { CreateUserInput, UpdateUserInput } from '../validations/user.validation';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const ADMIN_CREATED_USER_DEFAULT_PASSWORD = 'ChangeMe123!';

function getAdminCreatedUserDefaultPassword(): string {
  const configuredPassword = process.env['ADMIN_CREATED_USER_DEFAULT_PASSWORD'];
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
      googleSub: null,
      email,
      passwordHash: await hashPassword(getAdminCreatedUserDefaultPassword()),
      role: input.role,
      status: input.status,
      name: input.name.trim(),
      pictureUrl: null,
      emailVerified: false,
      lastLoginAt: new Date(),
    });
    return repo.save(user);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const repo = AppDataSource.getRepository(User);
    const user = await this.getUser(id);

    if (input.email !== undefined) {
      const email = normalizeEmail(input.email);
      const existing = await repo.findOne({ where: { email } });
      if (existing && existing.id !== id) {
        throw new ConflictError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
      }
      user.email = email;
    }
    if (input.name !== undefined) {
      user.name = input.name?.trim() ?? null;
    }
    if (input.pictureUrl !== undefined) {
      user.pictureUrl = input.pictureUrl?.trim() ?? null;
    }
    if (input.role !== undefined) {
      user.role = input.role;
    }
    if (input.status !== undefined) {
      user.status = input.status;
    }
    if (input.emailVerified !== undefined) {
      user.emailVerified = input.emailVerified;
    }

    return repo.save(user);
  }
}
