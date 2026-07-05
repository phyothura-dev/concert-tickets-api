import AppDataSource from '../data-source';
import { User } from '../entities/User';
import { ConflictError, NotFoundError } from '../lib/errors';
import type { UpdateUserInput } from '../validations/user.validation';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
